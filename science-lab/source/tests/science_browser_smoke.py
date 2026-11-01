"""Orbit Science: real simulation, navigation, browser-storage and mobile checks.

Requires Python Playwright and local Chromium. All traffic stays on an ephemeral
loopback server. Run after science_gallery/build.py; optional first arg is the
standalone artifact path. No personal records or external services are used.
"""
from collections import Counter
from functools import partial
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import math
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'orbit-science.html'
SHOTS = Path('/tmp/science-qa')
SHOTS.mkdir(exist_ok=True)
SENTINEL = '{"sentinel":"preserve-other-apps"}'


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def inspect(page):
    return page.evaluate('OrbitScience.inspect()')


def no_overflow(page, label):
    data = page.evaluate('({body:document.body.scrollWidth,doc:document.documentElement.scrollWidth,width:innerWidth})')
    check(max(data['body'], data['doc']) <= data['width'] + 1, f'{label}: overflow {data}')


def svg_geometry(page):
    return page.locator('#courseSimulationScene').evaluate('''svg => Array.from(svg.querySelectorAll('rect,circle,line,path,ellipse,polygon,text')).map(el => el.tagName + ':' + Array.from(el.attributes).map(a=>a.name+'='+a.value).join(';') + ':' + el.textContent).join('|')''')


def seek(page, fraction):
    page.locator('#courseSimulationProgress').evaluate('''(el,f)=>{el.value=Number(el.min||0)+(Number(el.max||1000)-Number(el.min||0))*f;el.dispatchEvent(new Event('input',{bubbles:true}));}''', fraction)


def subject(page, value):
    page.locator(f'#subjectTabs [data-subject="{value}"]').click()


def open_sim(page, identifier):
    page.locator(f'#simGrid .card-actions [data-play-simulator="{identifier}"]').click()
    page.wait_for_function('OrbitScience.inspect().view === "player"')


def reset_filters(page):
    page.locator('#resetFilters').click()


def card_ids(page):
    return page.locator('#simGrid .card-actions [data-play-simulator]').evaluate_all('(els)=>els.map(el=>el.dataset.playSimulator)')


def close_modal(page):
    page.keyboard.press('Escape')


def scientific_values(identifier, experiment):
    """Independent equations verify representative visible model results."""
    inputs, result = experiment['inputs'], experiment['result']
    if identifier == 'physics-projectile':
        angle = math.radians(inputs['angle'])
        expected_range = inputs['speed'] ** 2 * math.sin(2 * angle) / inputs['gravity']
        check(math.isclose(result['range'], expected_range, rel_tol=1e-10), 'Projectile ideal range equation')
        expected_height = (inputs['speed'] * math.sin(angle)) ** 2 / (2 * inputs['gravity'])
        check(math.isclose(result['maxHeight'], expected_height, rel_tol=1e-10), 'Projectile maximum height equation')
    elif identifier == 'physics-acceleration':
        expected = inputs['position'] + inputs['velocity'] * inputs['time'] + .5 * inputs['acceleration'] * inputs['time'] ** 2
        check(math.isclose(result['finalPosition'], expected, rel_tol=1e-10), 'Position under constant acceleration')
    elif identifier == 'physics-waves':
        check(math.isclose(result['speed'], inputs['frequency'] * inputs['wavelength'], rel_tol=1e-10), 'Traveling wave speed')
    elif identifier == 'physics-pendulum':
        expected = 2 * math.pi * math.sqrt(inputs['length'] / inputs['gravity'])
        check(math.isclose(result['period'], expected, rel_tol=1e-10), 'Small-angle pendulum period')
    elif identifier == 'physics-circuit':
        check(math.isclose(result['current'], inputs['voltage'] / inputs['resistance'], rel_tol=1e-10), 'Ohm law current')
        check(math.isclose(result['power'], inputs['voltage'] ** 2 / inputs['resistance'], rel_tol=1e-10), 'Resistive power')
    elif identifier == 'physics-vectors':
        expected = math.hypot(inputs['ax'] + inputs['bx'], inputs['ay'] + inputs['by'])
        check(math.isclose(result['magnitude'], expected, rel_tol=1e-10), 'Vector resultant magnitude')
    elif identifier == 'phys-collision':
        check(math.isclose(result['initialMomentum'], result['finalMomentum'], abs_tol=1e-9), 'Two-cart momentum conservation')


def run():
    check(ARTIFACT.exists(), 'Build missing: ' + str(ARTIFACT))
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ARTIFACT.parent)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    url = origin + '/' + ARTIFACT.name
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True, timezone_id='Asia/Kuwait')
            context.grant_permissions(['clipboard-read','clipboard-write'],origin=origin)
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: external.append(request.url) if request.url.startswith(('http:','https:')) and not request.url.startswith(origin + '/') else None)
            page.add_init_script('try{localStorage.setItem("qa.other-app",'+json.dumps(SENTINEL)+')}catch(_){}')
            page.goto(url)
            page.wait_for_function('window.OrbitScience')
            catalog = page.evaluate('Array.from(window.ScienceCatalog || ScienceLibrary.catalog)')
            check(len(catalog)==37, '37 distinct simulation cards')
            check(Counter(item['subject'] for item in catalog)=={'chemistry':23,'physics':14}, 'Chemistry/physics counts')
            check(len({(item['engine'],item['model']) for item in catalog})==37, 'Every card launches a distinct model')
            check(len(card_ids(page))==37, 'All launch buttons present')
            check(inspect(page)['view']=='gallery', 'Initial gallery')
            no_overflow(page,'1440px gallery')
            page.screenshot(path=str(SHOTS/'gallery-desktop.png'),full_page=True)

            subject(page,'chemistry')
            check(len(card_ids(page))==23,'Chemistry subject filter')
            subject(page,'physics')
            check(len(card_ids(page))==14,'Physics subject filter')
            page.locator('#searchInput').fill('projectile')
            check(card_ids(page)==['physics-projectile'],'Subject and text combine')
            page.locator('#searchInput').fill('no-such-topic-qa')
            check(not card_ids(page) and page.locator('#emptyState').is_visible(),'Empty results state')
            page.locator('#clearEmptyFilters').click()
            check(len(card_ids(page))==37,'Empty clear resets collection')

            # Topic and level filters combine, rather than replacing one another.
            subject(page,'chemistry')
            chosen = next(item for item in catalog if item['subject']=='chemistry' and item['level']=='ap')
            topic = page.locator(f'#topicFilters [data-topic="{chosen["topic"]}"]')
            topic.check()
            page.locator('#levelFilters [data-level="ap"]').check()
            expected = [item['id'] for item in catalog if item['subject']=='chemistry' and item['topic']==chosen['topic'] and item['level']=='ap']
            check(set(card_ids(page))==set(expected),'Subject+topic+level combination')
            reset_filters(page)
            check(len(card_ids(page))==37,'Reset all filters')
            page.locator('#sortSelect').select_option('az')
            shown_titles = [next(t['title'] for t in catalog if t['id']==identifier) for identifier in card_ids(page)]
            check(page.evaluate('(titles)=>titles.every((title,i)=>i===0||titles[i-1].localeCompare(title,"en",{sensitivity:"base",numeric:true})<=0)',shown_titles),'A–Z sorting')
            page.locator('#sortSelect').select_option('za')
            check(card_ids(page)==list(reversed([next(t['id'] for t in catalog if t['title']==title) for title in shown_titles])),'Z–A sorting')
            page.locator('#sortSelect').select_option('featured')
            page.locator('#listView').click()
            check(page.locator('#simGrid').evaluate('el=>el.classList.contains("is-list")'),'List view')
            no_overflow(page,'Desktop list view')
            page.locator('#gridView').click()

            # Saved experiments really survive reload, without changing other apps.
            first_id = catalog[0]['id']
            page.locator(f'#simGrid [data-save-simulator="{first_id}"]').click()
            page.reload()
            page.wait_for_function('window.OrbitScience')
            page.locator('#savedToggle').click()
            check(card_ids(page)==[first_id],'Saved model persists after reload')
            page.locator('#savedToggle').click()

            # Every visible play button mounts actual changing scientific SVG.
            for item in catalog:
                identifier,model = item['id'],item['model']
                open_sim(page,identifier)
                experiment = inspect(page)['experiment']
                check(experiment['type']==model and experiment['valid'], f'{identifier}: correct valid model')
                scientific_values(identifier,experiment)
                check(page.locator('#simTitle').inner_text()==item['title'],f'{identifier}: correct title')
                check(page.locator('#courseSimulationScene [fill],#courseSimulationScene [stroke]').count()>5,f'{identifier}: scientific drawing')
                if not experiment['animation']['running']:
                    page.locator('#coursePlaySimulation').click()
                page.wait_for_function('OrbitScience.inspect().experiment.animation.elapsed > .04')
                page.locator('#coursePlaySimulation').click()
                check(not inspect(page)['experiment']['animation']['running'],f'{identifier}: pause')
                page.locator('#courseResetSimulation').click()
                before = svg_geometry(page)
                seek(page,.43)
                check(inspect(page)['experiment']['animation']['elapsed']>0,f'{identifier}: seek')
                check(svg_geometry(page)!=before,f'{identifier}: diagram really changes')
                page.locator('#courseResetSimulation').click()
                check(inspect(page)['experiment']['animation']['elapsed']==0,f'{identifier}: reset')
                numbers=page.locator('#simHost input[data-input][type="number"]')
                if numbers.count():
                    field=numbers.first
                    old=field.input_value()
                    field.fill('')
                    check(not inspect(page)['experiment']['valid'],f'{identifier}: blank invalid')
                    check(page.locator('#coursePlaySimulation').is_disabled(),f'{identifier}: invalid playback disabled')
                    field.fill(old)
                    check(inspect(page)['experiment']['valid'],f'{identifier}: valid input recovery')
                no_overflow(page,identifier+' desktop')
                if identifier in ('chem-geometry','physics-projectile','physics-circuit'):
                    page.screenshot(path=str(SHOTS/(identifier+'.png')),full_page=True)
                page.locator('#backToGallery').click()
                check(inspect(page)['view']=='gallery',f'{identifier}: returns to gallery')

            # Direct lesson navigation chooses both subject and topic.
            page.locator('#lessonsButton').click()
            page.locator('#lessonSubject').select_option('physics')
            page.locator('#lessonSelect').select_option('physics-projectile')
            page.locator('#openLesson').click()
            check(inspect(page)['selectedId']=='physics-projectile','Lesson chooser opens selected topic')
            check(page.locator('#lessonGuide').count()==1,'Lesson guide included')
            page.locator('#shareSimulator').click()
            page.wait_for_timeout(50)
            copied = page.evaluate('navigator.clipboard.readText()')
            check('physics-projectile' in copied,'Share copies active simulation link')
            page.reload()
            page.wait_for_function('window.OrbitScience && OrbitScience.inspect().view==="player"')
            check(inspect(page)['selectedId']=='physics-projectile','Shared hash restores topic')
            check(not inspect(page)['experiment']['animation']['running'],'Bookmark opens paused')
            page.locator('#fullscreenSimulator').click()
            page.wait_for_timeout(80)
            page.evaluate('document.fullscreenElement ? document.exitFullscreen() : undefined')
            check(inspect(page)['experiment']['valid'],'Fullscreen or graceful fallback leaves simulator usable')
            page.locator('#backToGallery').click()

            # Real website download can reopen without dependencies.
            with page.expect_download() as download:
                page.locator('#downloadWebsite').click()
            downloaded=SHOTS/'Orbit-Science-downloaded.html'
            download.value.save_as(str(downloaded))
            check('OrbitScience' in downloaded.read_text(),'Website download contains working app')
            reopened=context.new_page()
            reopened.route('**/qa-downloaded-science.html',lambda route:route.fulfill(content_type='text/html',body=downloaded.read_text()))
            reopened.goto(origin+'/qa-downloaded-science.html')
            reopened.wait_for_function('window.OrbitScience')
            check(inspect(reopened)['simulatorCount']==37,'Downloaded website reopens all37 models')
            reopened.locator('#simGrid .card-actions [data-play-simulator]').first.click()
            reopened.wait_for_function('OrbitScience.inspect().experiment.animation.elapsed > .04')
            check(inspect(reopened)['experiment']['valid'],'Downloaded website really plays a simulator')
            reopened.close()

            for width in (320,390,768):
                page.set_viewport_size({'width':width,'height':880})
                no_overflow(page,f'{width}px gallery')
                if page.locator('#openFilters').is_visible():
                    page.locator('#openFilters').click()
                    check(page.locator('#filterPanel').is_visible(),f'{width}px filter drawer opens')
                    page.locator('#closeFilters').click()
                for identifier in ('chem-geometry','physics-projectile','phys-collision'):
                    open_sim(page,identifier)
                    no_overflow(page,f'{width}px {identifier}')
                    page.locator('#backToGallery').click()
                if width==390:
                    page.screenshot(path=str(SHOTS/'gallery-phone.png'),full_page=True)
            page.set_viewport_size({'width':390,'height':880})
            page.locator('#openFilters').click()
            check(page.locator('#filterPanel').evaluate('el=>el.classList.contains("is-open")'),'Phone filters open before resize')
            page.set_viewport_size({'width':1024,'height':880})
            page.wait_for_function('!document.body.classList.contains("filters-open")')
            check(page.locator('#filterBackdrop').is_hidden(),'Desktop resize clears filter backdrop')
            check(page.evaluate('localStorage.getItem("qa.other-app")')==SENTINEL,'Other app records preserved')
            check(not errors,'JavaScript errors: '+repr(errors))
            check(not external,'External traffic: '+repr(external))

            # Real chat-preview constraints: no storage, forms, network or unsafe sinks.
            outer=browser.new_page(viewport={'width':390,'height':844})
            sandbox_errors=[]
            outer.on('pageerror',lambda error:sandbox_errors.append(str(error)))
            csp='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; require-trusted-types-for \'script\';">'
            source=re.sub(r'<head>',lambda _:'<head>'+csp,ARTIFACT.read_text(),count=1,flags=re.I)
            outer.set_content('<iframe title="Science preview" sandbox="allow-scripts allow-downloads" style="width:100%;height:820px;border:0" srcdoc="'+escape(source,quote=True)+'"></iframe>')
            frame=outer.frames[1]
            frame.wait_for_function('()=>Boolean(window.OrbitScience)')
            frame.locator('#simGrid [data-save-simulator]').first.click()
            check(frame.locator('#storageWarning').is_visible(),'Storage-denied saved change warns persistently')
            frame.locator('#lessonsButton').click()
            frame.locator('#lessonSubject').select_option('chemistry')
            frame.locator('#lessonSelect').select_option('chem-moles')
            frame.locator('#openLesson').click()
            check(inspect(frame)['selectedId']=='chem-moles','Lesson chooser works without allow-forms')
            frame.locator('#saveSimulator').click()
            check(frame.locator('#storageWarning').is_visible(),'Player save failure also keeps storage warning visible')
            if not inspect(frame)['experiment']['animation']['running']:
                frame.locator('#coursePlaySimulation').click()
            frame.wait_for_function('()=>OrbitScience.inspect().experiment.animation.elapsed > .04')
            frame.locator('#coursePlaySimulation').click()
            seek(frame,.5)
            check(inspect(frame)['experiment']['valid'],'Opaque preview real simulation remains valid')
            check(not sandbox_errors,'Sandbox errors: '+repr(sandbox_errors))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print('Orbit Science passed: 37 real models, filters/search/sort/saved, direct lessons, animated SVG/play/seek/input/reset, offline download+reopen, 320/390/768, opaque preview, no external requests or JS errors.')


if __name__=='__main__':
    run()
