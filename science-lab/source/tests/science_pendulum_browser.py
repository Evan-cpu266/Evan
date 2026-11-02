"""Exercise the large-angle pendulum using actual mouse/touch pointer input.

Requires Playwright and Chromium. All traffic remains on a temporary localhost
server; no user data, external services, or prerecorded drag state are used.
"""
from functools import partial
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import math
import sys

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'orbit-science.html'
SHOTS = Path('/tmp/science-pendulum-qa')
SHOTS.mkdir(exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def state(page):
    return page.evaluate('OrbitScience.inspect()')


def experiment(page):
    return state(page)['experiment']


def period_reference(length, gravity, angle):
    """Independent composite Simpson integration, rather than app AGM code."""
    modulus = math.sin(math.radians(abs(angle)) / 2)
    steps = 4096
    dx = (math.pi / 2) / steps
    def integrand(x):
        return 1 / math.sqrt(1 - modulus * modulus * math.sin(x) ** 2)
    value = integrand(0) + integrand(math.pi / 2)
    value += 4 * sum(integrand(i * dx) for i in range(1, steps, 2))
    value += 2 * sum(integrand(i * dx) for i in range(2, steps, 2))
    return 4 * math.sqrt(length / gravity) * value * dx / 3


def no_overflow(page, label):
    sizes = page.evaluate('({width:innerWidth,body:document.body.scrollWidth,doc:document.documentElement.scrollWidth})')
    check(max(sizes['body'], sizes['doc']) <= sizes['width'] + 1, label + ': no document overflow ' + repr(sizes))


def ready(page):
    page.wait_for_function('()=>window.OrbitScience && OrbitScience.inspect().selectedId === "physics-pendulum"')


def set_angle(page, value):
    page.locator('#chemInput-angle').fill(str(value))


def svg_geometry(page):
    return page.locator('#courseSimulationScene').evaluate('''svg=>Array.from(svg.querySelectorAll('*')).flatMap(el=>Array.from(el.attributes).map(a=>a.name+'='+a.value)).join('|')''')


def finite_geometry(page, label):
    text = svg_geometry(page)
    check(not any(word in text for word in ('NaN','Infinity','undefined')), label + ': finite scientific drawing')


def point(page, angle=None):
    return page.locator('#courseSimulationScene').evaluate('''(svg,angle)=>{
      const g=ChemistryModels['physics-pendulum'].interaction;
      let x,y;
      if(angle===null){const s=svg.querySelector('[data-pendulum-string]');x=Number(s.getAttribute('x2'));y=Number(s.getAttribute('y2'));}
      else{x=g.pivotX+g.lengthPixels*Math.sin(angle*Math.PI/180);y=g.pivotY+g.lengthPixels*Math.cos(angle*Math.PI/180);}
      const result=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());
      return {x:result.x,y:result.y};
    }''', angle)


def prepare_drag(page):
    page.locator('#courseSimulationScene').scroll_into_view_if_needed()
    set_angle(page,0)
    check(not experiment(page)['animation']['running'], 'Numeric edit prepares a stationary release')
    return point(page)


def native_button_click(page, identifier):
    # Exercise real immediate pointer input at the visible button's center,
    # including focus changes after editing a numeric field and dragging.
    control=page.locator('#'+identifier)
    control.scroll_into_view_if_needed()
    box=control.bounding_box()
    check(box is not None,identifier+': visible pointer target')
    page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)


def assert_held(page, angle, label):
    current = experiment(page)
    actual = current['inputs']['angle']
    check(abs(actual - angle) <= .2, label + ': release angle matches actual pointer ' + repr(actual))
    check(not current['animation']['running'], label + ': dragging pauses motion')
    check(current['animation']['elapsed'] == 0, label + ': held bob remains at release time')
    check(current['interaction']['dragging'],label + ': drag interaction remains active while held')
    check(abs(current['animation']['sample']['angle']-angle) <= .2, label + ': live scientific readout matches held angle')
    check('°' in page.locator('#courseSimulationMeasurements').inner_text(), label + ': visible degree readout')
    expected='θ = '+format(actual,'.1f')+'°'
    page.wait_for_function('(text)=>document.getElementById("pendulumLiveAngle").textContent===text',arg=expected)
    check(page.locator('#pendulumLiveAngle').is_visible(),label + ': dedicated live-angle banner is visible')
    finite_geometry(page,label)


def mouse_drag(page, angle, label, release=True):
    start = prepare_drag(page)
    end = point(page,angle)
    page.mouse.move(start['x'],start['y'])
    page.mouse.down()
    page.mouse.move(end['x'],end['y'],steps=9)
    assert_held(page,max(-90,min(90,angle)),label)
    if release:
        page.mouse.up()
        page.wait_for_function('()=>OrbitScience.inspect().experiment.animation.running && OrbitScience.inspect().experiment.animation.elapsed > .04')
        check(abs(experiment(page)['animation']['sample']['angle']) < abs(angle),label + ': release moves toward equilibrium')
        native_button_click(page,'coursePlaySimulation')
        check(not experiment(page)['animation']['running'],label + ': pause works after dragging')


def touch_drag(page, session, angle, label, cancel=False):
    start = prepare_drag(page)
    end = point(page,angle)
    def touch(kind,x=None,y=None):
        points = [] if kind in ('touchEnd','touchCancel') else [{'x':x,'y':y,'id':9,'radiusX':8,'radiusY':8,'force':1}]
        session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    touch('touchStart',start['x'],start['y'])
    for step in range(1,10):
        fraction=step/9
        touch('touchMove',start['x']+(end['x']-start['x'])*fraction,start['y']+(end['y']-start['y'])*fraction)
    # CDP acknowledgement means the native input was queued, not necessarily
    # that its final pointermove has completed in the page's event loop.
    page.wait_for_function('(target)=>Math.abs(OrbitScience.inspect().experiment.inputs.angle-target)<=.2',arg=max(-90,min(90,angle)),timeout=2000)
    assert_held(page,max(-90,min(90,angle)),label)
    if cancel:
        touch('touchCancel')
        page.wait_for_function('()=>!OrbitScience.inspect().experiment.interaction.dragging')
        check(not experiment(page)['animation']['running'],label + ': touch cancellation does not release automatically')
    else:
        touch('touchEnd')
        page.wait_for_function('()=>OrbitScience.inspect().experiment.animation.running && OrbitScience.inspect().experiment.animation.elapsed > .04')
        check(abs(experiment(page)['animation']['sample']['angle']) < abs(angle),label + ': native touch release starts motion')
        native_button_click(page,'coursePlaySimulation')


def run():
    check(ARTIFACT.exists(), 'Build the website before running this test.')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ARTIFACT.parent)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    url = origin + '/' + ARTIFACT.name + '#sim/physics-pendulum'
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True)
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: external.append(request.url) if request.url.startswith(('http:','https:')) and not request.url.startswith(origin+'/') else None)
            page.goto(url)
            ready(page)
            check(page.locator('#chemInput-angle').get_attribute('max') == '90', 'Initial angle reaches 90 degrees')
            check(page.locator('#chemInput-angle').get_attribute('min') == '-90', 'Left-side release uses negative signed angles')
            set_angle(page,90)
            current = experiment(page)
            expected = period_reference(current['inputs']['length'],current['inputs']['gravity'],90)
            check(math.isclose(current['result']['period'],expected,rel_tol=1e-9), '90-degree period agrees with an independent integral')
            check(expected > 1.17 * 2 * math.pi * math.sqrt(current['inputs']['length']/current['inputs']['gravity']), 'Large-angle amplitude correction is visible')
            finite_geometry(page,'90-degree model')
            # Bounds are physical validation, not only number-input attributes.
            for invalid in (90.1,-90.1):
                set_angle(page,invalid)
                check(not experiment(page)['valid'],'Out-of-range release is rejected')
                check(page.locator('#coursePlaySimulation').is_disabled(),'Invalid release cannot play')
            set_angle(page,0)
            check(experiment(page)['valid'],'Equilibrium is a valid release')

            mouse_drag(page,90,'Desktop right horizontal release',release=False)
            page.screenshot(path=str(SHOTS/'held-90-desktop.png'),full_page=True)
            page.mouse.up()
            page.wait_for_function('()=>OrbitScience.inspect().experiment.animation.elapsed > .1')
            check(experiment(page)['animation']['running'],'Releasing the held bob automatically plays')
            page.screenshot(path=str(SHOTS/'released-desktop.png'),full_page=True)
            native_button_click(page,'coursePlaySimulation')
            mouse_drag(page,-90,'Desktop left horizontal release')
            mouse_drag(page,120,'Right upward drag clamps to90')
            mouse_drag(page,-120,'Left upward drag clamps to-90')
            mouse_drag(page,37.4,'Arbitrary pointer angle')

            # Cancellation, including lost capture, must not act like release.
            mouse_drag(page,55,'Mouse cancellation',release=False)
            page.locator('#courseSimulationScene').evaluate('''svg=>svg.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,pointerType:'mouse',isPrimary:true,bubbles:true}))''')
            page.mouse.up()
            check(not experiment(page)['animation']['running'],'Pointer cancellation stays paused')
            mouse_drag(page,42,'Lost pointer capture',release=False)
            page.locator('#courseSimulationScene').evaluate('svg=>{if(svg.hasPointerCapture(1))svg.releasePointerCapture(1)}')
            page.mouse.up()
            check(not experiment(page)['animation']['running'],'Lost pointer capture stays paused')

            # The number control remains keyboard-operable and resets playback.
            set_angle(page,90)
            page.locator('#chemInput-angle').focus()
            page.keyboard.press('ArrowDown')
            check(experiment(page)['inputs']['angle'] < 90,'Keyboard adjusts the numeric release angle')
            native_button_click(page,'coursePlaySimulation')
            page.wait_for_function('()=>OrbitScience.inspect().experiment.animation.elapsed > .04')
            set_angle(page,25)
            check(not experiment(page)['animation']['running'] and experiment(page)['animation']['elapsed']==0,'Numeric edits pause and reset a moving pendulum')
            # The bob itself advertises arrow keys and Enter in its label.
            page.locator('[data-pendulum-bob]').focus()
            for _ in range(3):
                page.keyboard.press('ArrowRight')
            check(experiment(page)['inputs']['angle'] > 25,'Repeated keyboard arrows adjust the bob')
            page.keyboard.press('Enter')
            page.wait_for_function('()=>OrbitScience.inspect().experiment.animation.running')
            native_button_click(page,'coursePlaySimulation')
            page.locator('#courseResetSimulation').click()
            check(experiment(page)['animation']['elapsed']==0 and not experiment(page)['animation']['running'],'Reset returns a paused release state')

            # Pointer coordinates must remain correct after SVG resize/reflow.
            page.set_viewport_size({'width':900,'height':900})
            no_overflow(page,'900px pendulum')
            mouse_drag(page,65,'Resized stage')
            page.set_viewport_size({'width':1440,'height':1000})
            # Leaving while held should remove capture/listeners without a
            # later pointer-up starting a detached animation.
            mouse_drag(page,45,'Navigation while held',release=False)
            page.evaluate('OrbitScience.showGallery(false)')
            page.mouse.up()
            check(state(page)['view']=='gallery' and state(page)['experiment'] is None,'Navigation destroys an active drag')
            page.evaluate('OrbitScience.openSimulator("physics-pendulum",false)')
            ready(page)
            check(not experiment(page)['animation']['running'],'Reopening creates a fresh paused pendulum')
            # Another simulator still mounts through the unchanged shared engine.
            page.evaluate('OrbitScience.openSimulator("chem-gas",false)')
            check(experiment(page)['type']=='gas' and experiment(page)['valid'],'Chemistry model remains unchanged')
            native_button_click(page,'coursePlaySimulation')
            page.wait_for_function('()=>OrbitScience.inspect().experiment.animation.elapsed>.04')
            native_button_click(page,'coursePlaySimulation')

            check(not errors,'No JavaScript errors: '+repr(errors))
            check(not external,'No external requests: '+repr(external))
            context.close()

            # Native mobile touch events, rather than script-fired pointer
            # callbacks, prove that touch-action/capture and page scrolling work.
            for width in (390,320):
                mobile = browser.new_context(viewport={'width':width,'height':850},has_touch=True,is_mobile=True,device_scale_factor=1)
                phone=mobile.new_page()
                phone_errors=[]
                phone.on('pageerror',lambda error:phone_errors.append(str(error)))
                phone.goto(url)
                ready(phone)
                no_overflow(phone,str(width)+'px pendulum')
                session=mobile.new_cdp_session(phone)
                touch_drag(phone,session,90,str(width)+'px right touch release')
                touch_drag(phone,session,-90,str(width)+'px left touch release')
                touch_drag(phone,session,120,str(width)+'px upward touch clamp')
                touch_drag(phone,session,47,str(width)+'px cancelled touch',cancel=True)
                phone.screenshot(path=str(SHOTS/('mobile-'+str(width)+'.png')),full_page=True)
                check(not phone_errors,'No phone JavaScript errors: '+repr(phone_errors))
                mobile.close()

            # The existing chat-preview sandbox can deny storage/forms while
            # keeping local SVG interaction and release fully functional.
            sandbox_context=browser.new_context(viewport={'width':1440,'height':1050})
            sandbox_page=sandbox_context.new_page()
            sandbox_errors=[]
            sandbox_page.on('pageerror',lambda error:sandbox_errors.append(str(error)))
            sandbox_page.set_content('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; frame-src about:; require-trusted-types-for \'script\'; trusted-types \'none\'"><iframe id="preview" sandbox="allow-scripts allow-downloads" style="width:1350px;height:990px" srcdoc="'+escape(ARTIFACT.read_text(),quote=True)+'"></iframe>')
            frame=sandbox_page.frames[1]
            frame.wait_for_function('()=>window.OrbitScience')
            frame.evaluate('OrbitScience.openSimulator("physics-pendulum",false)')
            frame.locator('#chemInput-angle').fill('90')
            check(experiment(frame)['valid'],'Storage-denied preview accepts90degrees')
            check(frame.locator('[data-pendulum-bob]').count()==1,'Storage-denied preview draws a draggable bob')
            start=prepare_drag(frame)
            end=point(frame,75)
            iframe=frame.frame_element()
            offset=iframe.evaluate('el=>{const r=el.getBoundingClientRect();return{x:r.x+el.clientLeft,y:r.y+el.clientTop}}')
            sandbox_page.mouse.move(start['x']+offset['x'],start['y']+offset['y'])
            sandbox_page.mouse.down()
            sandbox_page.mouse.move(end['x']+offset['x'],end['y']+offset['y'],steps=8)
            assert_held(frame,75,'Opaque preview actual pointer drag')
            sandbox_page.mouse.up()
            frame.wait_for_function('()=>OrbitScience.inspect().experiment.animation.elapsed>.04')
            check(experiment(frame)['animation']['running'],'Storage-denied preview release starts local playback')
            check(not sandbox_errors,'No opaque-preview JavaScript errors: '+repr(sandbox_errors))
            sandbox_context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print('Orbit Science pendulum browser QA passed: independent90-degreeperiod, mouse/touchdrag+liveangle+release, cancellation, keyboard, resize, navigationcleanup, mobile and opaque preview.')


if __name__ == '__main__':
    run()
