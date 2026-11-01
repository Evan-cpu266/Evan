/* Orbit simulator engine. Self contained: no requests, storage, or third-party scripts. */
(function (root) {
  'use strict';
  const TYPES = Object.freeze(['forces','friction','work','energy','power','momentum','impulse','collision']);
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const number = (o,k) => typeof o[k] === 'number' && Number.isFinite(o[k]) && Math.abs(o[k]) <= 1e12 && (o[k] === 0 || Math.abs(o[k]) >= 1e-9);
  function check(o,keys,conditions) {
    if (!o || keys.some(k => !number(o,k))) return 'Enter finite numbers in every field. Extremely large or tiny values are not supported.';
    for (const pair of conditions || []) if (!pair[0]) return pair[1];
    return '';
  }
  const invalid = error => ({valid:false,error});
  const good = result => Object.values(result).some(v=>typeof v==='number'&&!Number.isFinite(v))?invalid('These values exceed the supported numerical range.'):Object.assign({valid:true},result);
  const physics = {
    forces(o) {
      const err=check(o,['mass','force'],[[o && o.mass>0,'Mass must be greater than zero.']]);
      if(err) return invalid(err);
      return good({mass:o.mass,force:o.force,netForce:o.force,acceleration:o.force/o.mass});
    },
    friction(o) {
      const err=check(o,['mass','force','mu'],[[o && o.mass>0,'Mass must be greater than zero.'],[o && o.mu>=0,'The friction coefficient cannot be negative.']]);
      if(err) return invalid(err);
      const limit=o.mu*o.mass*9.81,staticFriction=Math.abs(o.force)<=limit;
      const frictionForce=staticFriction ? -o.force : -Math.sign(o.force)*limit;
      const netForce=o.force+frictionForce;
      return good({mass:o.mass,force:o.force,frictionLimit:limit,frictionForce,netForce,acceleration:netForce/o.mass,staticFriction});
    },
    work(o) {
      const err=check(o,['force','distance','angle'],[[o && o.distance>=0,'Distance cannot be negative.']]);
      if(err) return invalid(err);
      const parallelForce=o.force*Math.cos(o.angle*Math.PI/180);
      return good({work:parallelForce*o.distance,parallelForce,distance:o.distance});
    },
    energy(o) {
      const err=check(o,['mass','height','gravity'],[[o && o.mass>0,'Mass must be greater than zero.'],[o && o.height>=0,'Height cannot be negative.'],[o && o.gravity>0,'Gravity must be greater than zero.']]);
      if(err) return invalid(err);
      return good({totalEnergy:o.mass*o.gravity*o.height,finalSpeed:Math.sqrt(2*o.gravity*o.height),fallTime:Math.sqrt(2*o.height/o.gravity)});
    },
    power(o) {
      const err=check(o,['work','time'],[[o && o.time>0,'Transfer time must be greater than zero.']]);
      if(err) return invalid(err);
      return good({power:o.work/o.time,work:o.work,time:o.time});
    },
    momentum(o) {
      const err=check(o,['mass','velocity'],[[o && o.mass>0,'Mass must be greater than zero.']]);
      if(err) return invalid(err);
      return good({momentum:o.mass*o.velocity,velocity:o.velocity});
    },
    impulse(o) {
      const err=check(o,['mass','velocity','force','time'],[[o && o.mass>0,'Mass must be greater than zero.'],[o && o.time>0,'Contact time must be greater than zero.']]);
      if(err) return invalid(err);
      const impulse=o.force*o.time,finalVelocity=o.velocity+impulse/o.mass;
      return good({impulse,initialMomentum:o.mass*o.velocity,finalMomentum:o.mass*finalVelocity,finalVelocity,acceleration:o.force/o.mass});
    },
    collision(o) {
      const err=check(o,['mass1','mass2','velocity1','velocity2','restitution'],[[o && o.mass1>0 && o.mass2>0,'Both masses must be greater than zero.'],[o && o.restitution>=0 && o.restitution<=1,'Restitution must be between 0 and 1.'],[o && o.velocity1>=o.velocity2,'Cart 1 must be catching cart 2: use v₁ ≥ v₂.']]);
      if(err) return invalid(err);
      const m1=o.mass1,m2=o.mass2,u1=o.velocity1,u2=o.velocity2,e=o.restitution,total=m1+m2;
      const finalVelocity1=((m1-e*m2)*u1+(1+e)*m2*u2)/total;
      const finalVelocity2=((m2-e*m1)*u2+(1+e)*m1*u1)/total;
      const initialMomentum=m1*u1+m2*u2,finalMomentum=m1*finalVelocity1+m2*finalVelocity2;
      const initialKineticEnergy=.5*m1*u1*u1+.5*m2*u2*u2,finalKineticEnergy=.5*m1*finalVelocity1*finalVelocity1+.5*m2*finalVelocity2*finalVelocity2;
      return good({finalVelocity1,finalVelocity2,initialMomentum,finalMomentum,initialKineticEnergy,finalKineticEnergy,energyLost:Math.max(0,initialKineticEnergy-finalKineticEnergy),collisionTime:u1>u2?1.5:null});
    }
  };
  physics.duration=function(type,o){
    const r=physics[type]&&physics[type](o); if(!r || !r.valid) return 0;
    if(type==='energy') return r.fallTime || 1;
    if(type==='power'||type==='impulse') return o.time;
    return 6;
  };
  physics.sample=function(type,o,time){
    const r=physics[type]&&physics[type](o); if(!r || !r.valid) return r || invalid('Unknown simulator.');
    const duration=physics.duration(type,o),t=clamp(Number.isFinite(time)?time:0,0,duration),fraction=duration?t/duration:0;
    const s=Object.assign({},r,{time:t,duration,fraction});
    if(type==='forces'||type==='friction'){s.position=.5*r.acceleration*t*t;s.velocity=r.acceleration*t;}
    if(type==='momentum'){s.position=o.velocity*t;s.velocity=o.velocity;}
    if(type==='impulse'){s.position=o.velocity*t+.5*r.acceleration*t*t;s.velocity=o.velocity+r.acceleration*t;s.momentum=o.mass*s.velocity;s.deliveredImpulse=o.force*t;}
    if(type==='work'){s.position=o.distance*fraction;s.accumulatedWork=r.work*fraction;}
    if(type==='energy'){
      s.fallen=Math.min(o.height,.5*o.gravity*t*t);s.height=Math.max(0,o.height-s.fallen);
      s.velocity=Math.sqrt(2*o.gravity*s.fallen);s.potentialEnergy=o.mass*o.gravity*s.height;s.kineticEnergy=o.mass*o.gravity*s.fallen;
    }
    if(type==='power'){s.transferredWork=o.work*fraction;s.energyFraction=o.work===0?0:fraction;}
    if(type==='collision'){
      if(r.collisionTime===null){s.position1=o.velocity1*t-1;s.position2=o.velocity2*t+1;s.velocity1=o.velocity1;s.velocity2=o.velocity2;s.collided=false;}
      else{const before=t<r.collisionTime;s.collided=!before;s.velocity1=before?o.velocity1:r.finalVelocity1;s.velocity2=before?o.velocity2:r.finalVelocity2;s.position1=s.velocity1*(t-r.collisionTime);s.position2=s.velocity2*(t-r.collisionTime);}
      s.momentum1=o.mass1*s.velocity1;s.momentum2=o.mass2*s.velocity2;
    }
    return s;
  };
  Object.freeze(physics);
  if(typeof module==='object'&&module.exports) module.exports=physics;
  if(!root) return;
  root.OrbitCoursePhysics=physics;
  if(!root.document) return;

  const configs={
    forces:{title:'Force and acceleration',formula:'Fₙₑₜ = ma',note:'An ideal cart starts at rest on a frictionless track. A signed force changes its velocity.',fields:[['mass','Mass','kg',2,.01,100,0.1],['force','Net force','N',6,-200,200,1]]},
    friction:{title:'Friction track',formula:'Fₙₑₜ = F + f;  |f| ≤ μmg',note:'The cart starts at rest. This simplified model uses the same coefficient for limiting static and kinetic friction.',fields:[['mass','Mass','kg',3,.01,100,.1],['force','Applied force','N',15,-200,200,1],['mu','Friction coefficient','',.3,0,2,.01]]},
    work:{title:'Work by a force',formula:'W = Fd cos θ',note:'The cart traverses the selected distance in an illustrative six seconds. The animation shows work accumulating, not a prediction of acceleration.',fields:[['force','Force','N',20,-200,200,1],['distance','Distance','m',8,0,100,.1],['angle','Force angle','°',30,-180,180,1]]},
    energy:{title:'Potential to kinetic energy',formula:'E = mgh + ½mv²',note:'A block falls from rest without air resistance. Its potential energy becomes kinetic energy; the total stays constant.',fields:[['mass','Mass','kg',2,.01,100,.1],['height','Starting height','m',8,0,100,.1],['gravity','Gravitational field','m/s²',9.81,.01,100,.01]]},
    power:{title:'Energy transfer and power',formula:'P = W / Δt',note:'A constant rate of work transfers energy. Positive work adds energy; negative work removes it.',fields:[['work','Work transferred','J',600,-10000,10000,10],['time','Transfer time','s',6,.1,60,.1]]},
    momentum:{title:'Momentum on a track',formula:'p = mv',note:'An ideal cart keeps a constant velocity. A negative value points left. Momentum has the same direction as velocity.',fields:[['mass','Mass','kg',3,.01,100,.1],['velocity','Velocity','m/s',4,-30,30,.1]]},
    impulse:{title:'Impulse and momentum change',formula:'J = FΔt = Δp',note:'A constant signed force acts for the selected contact time. Watch the cart speed up, slow down, or reverse direction.',fields:[['mass','Mass','kg',2,.01,100,.1],['velocity','Initial velocity','m/s',-3,-30,30,.1],['force','Force','N',4,-100,100,.1],['time','Contact time','s',4,.1,30,.1]]},
    collision:{title:'Collision laboratory',formula:'m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂',note:'Cart 1 starts behind cart 2. Restitution e = 1 is elastic; e = 0 makes the carts move together. External forces are neglected.',fields:[['mass1','Cart 1 mass','kg',2,.01,100,.1],['mass2','Cart 2 mass','kg',2,.01,100,.1],['velocity1','Cart 1 initial velocity','m/s',4,-30,30,.1],['velocity2','Cart 2 initial velocity','m/s',0,-30,30,.1],['restitution','Restitution e','',1,0,1,.05]]}
  };
  const f=n=>{if(!Number.isFinite(n))return '—';if(Math.abs(n)<1e-9)return '0';if(Math.abs(n)>=1e5||Math.abs(n)<.001)return n.toExponential(2);return Number(n.toFixed(3)).toLocaleString('en-US');};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const NS='http://www.w3.org/2000/svg';
  function svgNode(name,attrs,content){const n=document.createElementNS(NS,name);for(const k of Object.keys(attrs||{}))n.setAttribute(k,String(attrs[k]));if(content!==undefined)n.textContent=content;return n;}
  function mount(host,type){
    if(!host||!configs[type])throw new Error('Choose a supported simulator.');
    const c=configs[type];let inputs=Object.fromEntries(c.fields.map(a=>[a[0],a[3]])),elapsed=0,running=false,raf=0,last=0,rate=1,destroyed=false,trials=[];
    function element(tag,attrs,children){const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs||{})){if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else n.setAttribute(k,String(v));}for(const child of children||[]){if(child!==null&&child!==undefined)n.appendChild(typeof child==='string'?document.createTextNode(child):child);}return n;}
    const style=element('style',{text:".orbit-experiment{color:var(--ink,#17283a);font-family:inherit}.orbit-experiment *{box-sizing:border-box}.orbit-experiment .exp-top{padding:18px 20px;background:var(--soft,#eef4f3);border-radius:18px;margin-bottom:16px}.orbit-experiment .exp-formula{font-size:22px;font-weight:750;letter-spacing:-.02em}.orbit-experiment .exp-note{font-size:13px;line-height:1.6;margin:8px 0 0;color:var(--muted,#536673)}.orbit-experiment .exp-layout{display:grid;grid-template-columns:minmax(200px,260px) minmax(0,1fr);gap:20px;align-items:start}.orbit-experiment .exp-fields{display:grid;gap:13px}.orbit-experiment .exp-field{display:grid;gap:6px;font-size:12px;font-weight:650}.orbit-experiment .exp-input-wrap{display:flex;align-items:center;background:var(--surface,#fff);border:1px solid var(--line,#d3dedc);border-radius:10px;overflow:hidden}.orbit-experiment input[type=number]{min-width:0;width:100%;border:0;padding:11px 12px;background:transparent;color:inherit;font:inherit;font-size:15px;outline-offset:-3px}.orbit-experiment .exp-unit{padding:0 12px 0 3px;color:var(--muted,#536673);font-size:12px;white-space:nowrap}.orbit-experiment .exp-stage{min-width:0;border:1px solid var(--line,#d3dedc);border-radius:18px;overflow:hidden;background:#f5f9f8}.orbit-experiment svg{display:block;width:100%;height:auto;max-height:380px}.orbit-experiment .exp-readout{padding:13px 16px;border-top:1px solid #dce6e4;display:block;font-size:13px;font-variant-numeric:tabular-nums;line-height:1.7;min-height:62px}.orbit-experiment .exp-controls{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:17px}.orbit-experiment button,.orbit-experiment select{font:inherit;border-radius:10px;padding:10px 14px;background:var(--surface,#fff);border:1px solid var(--line,#cbd8d5);color:inherit;cursor:pointer}.orbit-experiment button:focus-visible,.orbit-experiment select:focus-visible,.orbit-experiment input:focus-visible{outline:3px solid #35a985;outline-offset:3px}.orbit-experiment #coursePlaySimulation{background:#163c35;color:white;border-color:#163c35;font-weight:700;min-width:132px}.orbit-experiment button:disabled{opacity:.45;cursor:not-allowed}.orbit-experiment .exp-speed{margin-left:auto;font-size:12px;display:flex;gap:7px;align-items:center}.orbit-experiment select{padding:9px 8px}.orbit-experiment .exp-timeline{display:flex;align-items:center;gap:13px;margin:15px 0}.orbit-experiment input[type=range]{width:100%;min-width:0;accent-color:#1b7861}.orbit-experiment #courseSimulationTime{white-space:nowrap;font-size:12px;color:var(--muted,#536673);min-width:94px;text-align:right}.orbit-experiment .exp-error{color:#b42832;margin:12px 0;font-size:13px;min-height:20px}.orbit-experiment .exp-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px;margin-top:16px}.orbit-experiment .exp-result{background:var(--soft,#eef4f3);border-radius:12px;padding:13px}.orbit-experiment .exp-result small{display:block;font-size:11px;color:var(--muted,#536673);margin-bottom:6px}.orbit-experiment .exp-result strong{font-size:17px;font-variant-numeric:tabular-nums}.orbit-experiment .exp-trials{margin-top:24px;padding-top:20px;border-top:1px solid var(--line,#d3dedc)}.orbit-experiment .exp-trial-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.orbit-experiment .exp-table-wrap{overflow-x:auto}.orbit-experiment table{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}.orbit-experiment th,.orbit-experiment td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line,#d3dedc)}.orbit-experiment textarea{width:100%;height:95px;margin-top:12px;font:12px monospace;background:white;border:1px solid #cbd8d5;border-radius:10px;padding:10px;color:#17283a}.orbit-experiment .exp-status{font-size:12px;color:var(--muted,#536673);line-height:1.5}.orbit-experiment .exp-svg-label{font:12px system-ui,sans-serif;fill:#536673}.orbit-experiment .exp-svg-heading{font:600 14px system-ui,sans-serif;fill:#203c3a}@media(max-width:700px){.orbit-experiment .exp-layout{grid-template-columns:1fr}.orbit-experiment .exp-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.orbit-experiment .exp-top{padding:15px}.orbit-experiment .exp-formula{font-size:19px}.orbit-experiment .exp-stage svg{min-height:180px}.orbit-experiment .exp-speed{margin-left:0}.orbit-experiment .exp-controls{gap:8px}.orbit-experiment button{padding:10px 12px}.orbit-experiment .exp-readout{padding:10px 12px}}@media(prefers-reduced-motion:reduce){.orbit-experiment *{scroll-behavior:auto}}"});
    const fields=element('div',{class:'exp-fields'});
    for(const a of c.fields){fields.appendChild(element('label',{class:'exp-field',for:'courseInput-'+a[0]},[a[1],element('span',{class:'exp-input-wrap'},[element('input',{type:'number',id:'courseInput-'+a[0],'data-input':a[0],value:a[3],min:a[4],max:a[5],step:a[6],inputmode:'decimal'}),element('span',{class:'exp-unit',text:a[2]})])]));}
    const svg=svgNode('svg',{id:'courseSimulationScene',viewBox:'0 0 640 300',role:'img','aria-label':'Animated '+c.title.toLowerCase()});
    const section=element('section',{class:'orbit-experiment','aria-label':c.title},[
      style,
      element('div',{class:'exp-top'},[element('div',{class:'exp-formula',text:c.formula}),element('p',{class:'exp-note',text:c.note})]),
      element('div',{class:'exp-layout'},[fields,element('div',{class:'exp-stage'},[svg,element('output',{id:'courseSimulationMeasurements',class:'exp-readout','aria-live':'off'})])]),
      element('div',{class:'exp-controls'},[element('button',{id:'coursePlaySimulation',type:'button','aria-pressed':'false',text:'Play simulator'}),element('button',{id:'courseResetSimulation',type:'button',text:'Reset'}),element('label',{class:'exp-speed',for:'courseSimulationRate'},['Speed ',element('select',{id:'courseSimulationRate'},[element('option',{value:'.25',text:'0.25×'}),element('option',{value:'.5',text:'0.5×'}),element('option',{value:'1',selected:'',text:'1×'}),element('option',{value:'2',text:'2×'})])])]),
      element('div',{class:'exp-timeline'},[element('label',{for:'courseSimulationProgress',style:'font-size:12px',text:'Timeline'}),element('input',{id:'courseSimulationProgress',type:'range',min:'0',max:'1000',value:'0',step:'1','aria-label':'Simulation timeline'}),element('output',{id:'courseSimulationTime',text:'0 / 6 s'})]),
      element('div',{class:'exp-error',role:'status',id:'courseSimulationError'}),element('div',{class:'exp-results',id:'courseSimulationResults'})
    ]);
    if(type==='collision'){
      const header=element('tr');for(const name of ['Trial','m₁ (kg)','m₂ (kg)','u₁ (m/s)','u₂ (m/s)','e','p before (kg·m/s)','p after (kg·m/s)'])header.appendChild(element('th',{text:name}));
      section.appendChild(element('section',{class:'exp-trials','aria-label':'Recorded collision trials'},[
        element('div',{class:'exp-trial-actions'},[element('button',{id:'courseRecordTrial',type:'button',text:'Record trial'}),element('button',{id:'courseExportTrials',type:'button',disabled:'',text:'Export CSV'}),element('button',{id:'courseClearTrials',type:'button',disabled:'',text:'Clear trials'})]),
        element('p',{class:'exp-status',id:'courseTrialStatus',text:'Record up to 20 parameter sets to compare momentum before and after.'}),
        element('div',{class:'exp-table-wrap'},[element('table',{id:'courseTrialTable'},[element('thead',{},[header]),element('tbody')])]),
        element('textarea',{id:'courseTrialCSV',readonly:'',hidden:'','aria-label':'Recorded trials as CSV'})
      ]));
    }
    host.replaceChildren(section);
    const q=s=>host.querySelector(s),scene=q('#courseSimulationScene'),readout=q('#courseSimulationMeasurements'),playButton=q('#coursePlaySimulation'),progress=q('#courseSimulationProgress'),clock=q('#courseSimulationTime'),error=q('#courseSimulationError'),results=q('#courseSimulationResults');
    function getResult(){return physics[type](inputs);}
    function drawText(x,y,text,size,fill,anchor){scene.appendChild(svgNode('text',{x,y,'font-family':'system-ui,sans-serif','font-size':size||13,fill:fill||'#536673','text-anchor':anchor||'start'},text));}
    function line(x1,y1,x2,y2,stroke,width){scene.appendChild(svgNode('line',{x1,y1,x2,y2,stroke:stroke||'#b4c9c2','stroke-width':width||2,'stroke-linecap':'round'}));}
    function rect(x,y,w,h,fill,r){scene.appendChild(svgNode('rect',{x,y,width:Math.max(0,w),height:Math.max(0,h),rx:r===undefined?8:r,fill}));}
    function circle(cx,cy,r,fill){scene.appendChild(svgNode('circle',{cx,cy,r,fill}));}
    function arrow(x,y,amount,color,label){const length=clamp(amount,-110,110);if(Math.abs(length)<.01)return;const end=x+length;line(x,y,end,y,color,4);const dir=Math.sign(length);scene.appendChild(svgNode('path',{d:`M${end-dir*9},${y-6}L${end},${y}L${end-dir*9},${y+6}`,fill:'none',stroke:color,'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));if(label)drawText((x+end)/2,y-13,label,12,color,'middle');}
    function cart(x,y,color,label){rect(x-25,y-40,50,32,color,8);circle(x-15,y-5,7,'#263f3c');circle(x+15,y-5,7,'#263f3c');drawText(x,y-19,label,13,'#ffffff','middle');}
    function track(){rect(0,0,640,300,'#f5f9f8',0);for(let x=40;x<=600;x+=56)line(x,224,x,230,'#d0ded9',1);line(28,220,612,220,'#b4c9c2',3);drawText(30,267,'← negative direction',12);drawText(610,267,'positive direction →',12,undefined,'end');}
    function positionExtent(){const d=physics.duration(type,inputs);let low=0,high=0;for(let j=0;j<=40;j++){const s=physics.sample(type,inputs,d*j/40);const vals=type==='collision'?[s.position1,s.position2]:[s.position];for(const v of vals)if(Number.isFinite(v)){low=Math.min(low,v);high=Math.max(high,v);}}if(high-low<.1){low-=1;high+=1;}return {low,high};}
    function draw(s){
      scene.replaceChildren();if(!s.valid){track();drawText(320,135,'Adjust the fields to start',20,'#536673','middle');readout.textContent='The simulation is paused until all values are valid.';return;}
      if(type==='energy'){
        rect(0,0,640,300,'#f5f9f8',0);line(35,250,605,250,'#b4c9c2',3);const ground=250,travel=180,y=ground-40-(inputs.height>0?s.height/inputs.height*travel:0);rect(110,y,46,40,'#247b65',8);line(133,y+40,133,250,'#d4e5df',1);drawText(133,y-13,f(s.height)+' m',14,'#247b65','middle');drawText(134,280,'Falling block',12,undefined,'middle');
        const total=s.totalEnergy,scale=total>0?160/total:0;rect(305,70,60,180,'#e2ebe7',6);rect(405,70,60,180,'#e2ebe7',6);rect(505,70,60,180,'#e2ebe7',6);rect(305,250-s.potentialEnergy*scale,60,s.potentialEnergy*scale,'#4f7ea0',5);rect(405,250-s.kineticEnergy*scale,60,s.kineticEnergy*scale,'#e7ac5c',5);rect(505,250-total*scale,60,total*scale,'#247b65',5);drawText(335,275,'Potential',12,undefined,'middle');drawText(435,275,'Kinetic',12,undefined,'middle');drawText(535,275,'Total',12,undefined,'middle');drawText(335,53,f(s.potentialEnergy)+' J',13,'#4f7ea0','middle');drawText(435,53,f(s.kineticEnergy)+' J',13,'#af7228','middle');drawText(535,53,f(total)+' J',13,'#247b65','middle');readout.textContent=`Height ${f(s.height)} m · Speed ${f(s.velocity)} m/s · Potential ${f(s.potentialEnergy)} J + kinetic ${f(s.kineticEnergy)} J = ${f(total)} J`;
      }else if(type==='power'){
        rect(0,0,640,300,'#f5f9f8',0);drawText(320,58,inputs.work<0?'Energy removed':inputs.work>0?'Energy supplied':'No energy transferred',18,'#203c3a','middle');rect(80,105,480,65,'#e2ebe7',13);const fraction=inputs.work<0?1-s.energyFraction:s.energyFraction;const fill=inputs.work===0?0:480*fraction;rect(80,105,fill,65,inputs.work<0?'#d89379':'#51a58a',13);drawText(320,145,Math.round(s.energyFraction*100)+'% transferred',17,'#203c3a','middle');drawText(320,216,f(s.power)+' watts',26,'#247b65','middle');drawText(320,249,'Constant transfer rate',13,undefined,'middle');readout.textContent=`Time ${f(s.time)} s · Work transferred ${f(s.transferredWork)} J · Power ${f(s.power)} W`;
      }else{
        track();const extent=positionExtent(),xpos=v=>80+(v-extent.low)/(extent.high-extent.low)*480;
        if(type==='collision'){
          const x1=clamp(xpos(s.position1)-25,40,546),x2=clamp(xpos(s.position2)+25,94,600);cart(x1,220,'#247b65','1');cart(x2,220,'#bd795d','2');arrow(clamp(x1,140,500),140,Math.sign(s.velocity1)*Math.min(100,Math.abs(s.velocity1)*12),'#247b65','v₁ '+f(s.velocity1));arrow(clamp(x2,140,500),90,Math.sign(s.velocity2)*Math.min(100,Math.abs(s.velocity2)*12),'#bd795d','v₂ '+f(s.velocity2));drawText(320,36,s.collisionTime===null?'Equal speeds · no collision':s.collided?(inputs.restitution===0?'Moving together':'After collision'):'Approaching contact',15,'#203c3a','middle');readout.textContent=`v₁ ${f(s.velocity1)} m/s · v₂ ${f(s.velocity2)} m/s · Total momentum ${f(s.momentum1+s.momentum2)} kg·m/s`;
        }else{
          const x=clamp(xpos(s.position),70,570);cart(x,220,'#247b65',type==='work'?'W':'m');line(xpos(0),227,xpos(0),240,'#668f82',2);drawText(xpos(0),255,'0',11,'#668f82','middle');
          if(type==='work'){const px=clamp(inputs.force*Math.cos(inputs.angle*Math.PI/180)*2,-110,110),py=clamp(-inputs.force*Math.sin(inputs.angle*Math.PI/180)*2,-65,65),startX=clamp(x,125,515),startY=155;line(startX,startY,startX+px,startY+py,'#bd795d',4);const angle=Math.atan2(py,px);if(Math.hypot(px,py)>.01){line(startX+px,startY+py,startX+px-10*Math.cos(angle-.5),startY+py-10*Math.sin(angle-.5),'#bd795d',3);line(startX+px,startY+py,startX+px-10*Math.cos(angle+.5),startY+py-10*Math.sin(angle+.5),'#bd795d',3);}drawText(320,42,'Illustrative traversal · work accumulates with distance',14,'#536673','middle');readout.textContent=`Distance ${f(s.position)} m · Work so far ${f(s.accumulatedWork)} J · Total work ${f(s.work)} J`;}
          else{
            const velocity=s.velocity||0;arrow(clamp(x,140,500),108,Math.sign(velocity)*Math.min(105,Math.abs(velocity)*10),'#247b65','v = '+f(velocity)+' m/s');
            if(type==='forces'||type==='friction'||type==='impulse')arrow(clamp(x,140,500),156,Math.sign(s.force===undefined?inputs.force:s.force)*Math.min(100,Math.abs(inputs.force)*3),'#bd795d','F = '+f(inputs.force)+' N');
            if(type==='friction')drawText(320,38,s.staticFriction?'Static friction balances the force':'Sliding · friction opposes motion',14,'#203c3a','middle');
            readout.textContent=type==='momentum'?`Position ${f(s.position)} m · Velocity ${f(velocity)} m/s · Momentum ${f(s.momentum)} kg·m/s`:type==='impulse'?`Position ${f(s.position)} m · Velocity ${f(velocity)} m/s · Impulse so far ${f(s.deliveredImpulse)} N·s · Momentum ${f(s.momentum)} kg·m/s`:`Position ${f(s.position)} m · Velocity ${f(velocity)} m/s · Acceleration ${f(s.acceleration)} m/s²`;
          }
        }
        drawText(32,291,'Track fitted to the complete run; direction and measurements are physical.',10,'#72857e');
      }
    }
    function resultValues(r){if(!r.valid)return [];
      if(type==='forces')return [['Net force',r.netForce,'N'],['Acceleration',r.acceleration,'m/s²']];
      if(type==='friction')return [['Friction force',r.frictionForce,'N'],['Net force',r.netForce,'N'],['Acceleration',r.acceleration,'m/s²']];
      if(type==='work')return [['Parallel force',r.parallelForce,'N'],['Total work',r.work,'J']];
      if(type==='energy')return [['Total energy',r.totalEnergy,'J'],['Impact speed',r.finalSpeed,'m/s'],['Fall time',r.fallTime,'s']];
      if(type==='power')return [['Constant power',r.power,'W'],['Work transferred',r.work,'J']];
      if(type==='momentum')return [['Momentum',r.momentum,'kg·m/s'],['Velocity',r.velocity,'m/s']];
      if(type==='impulse')return [['Total impulse',r.impulse,'N·s'],['Final velocity',r.finalVelocity,'m/s'],['Final momentum',r.finalMomentum,'kg·m/s']];
      return [['Final cart 1 velocity',r.finalVelocity1,'m/s'],['Final cart 2 velocity',r.finalVelocity2,'m/s'],['Momentum before',r.initialMomentum,'kg·m/s'],['Momentum after',r.finalMomentum,'kg·m/s'],['Kinetic energy lost',r.energyLost,'J']];
    }
    function updateButtons(){playButton.textContent=running?'Pause':'Play simulator';playButton.setAttribute('aria-pressed',String(running));}
    function render(all){if(destroyed)return;const r=getResult(),d=physics.duration(type,inputs);elapsed=clamp(elapsed,0,d||0);const s=physics.sample(type,inputs,elapsed);draw(s);progress.value=d?String(elapsed/d*1000):'0';progress.disabled=!r.valid;clock.textContent=f(elapsed)+' / '+f(d)+' s';playButton.disabled=!r.valid;error.textContent=r.valid?'':r.error;if(all){results.replaceChildren();for(const [label,val,unit]of resultValues(r)){const el=document.createElement('div');el.className='exp-result';const sm=document.createElement('small');sm.textContent=label;const st=document.createElement('strong');st.textContent=f(val)+' '+unit;el.append(sm,st);results.appendChild(el);}if(type==='collision'){q('#courseRecordTrial').disabled=!r.valid||trials.length>=20;}}updateButtons();}
    function pause(){if(destroyed)return;running=false;if(raf)root.cancelAnimationFrame(raf);raf=0;last=0;updateButtons();}
    function frame(timestamp){if(!running||destroyed)return;if(last){elapsed+=Math.min(.1,(timestamp-last)/1000)*rate;}last=timestamp;const d=physics.duration(type,inputs);if(elapsed>=d){elapsed=d;pause();render(false);return;}render(false);raf=root.requestAnimationFrame(frame);}
    function play(){if(destroyed||!getResult().valid)return;if(elapsed>=physics.duration(type,inputs))elapsed=0;if(running)return;running=true;last=0;updateButtons();raf=root.requestAnimationFrame(frame);}
    function reset(){pause();elapsed=0;render(false);}
    function seek(seconds){pause();elapsed=clamp(Number(seconds)||0,0,physics.duration(type,inputs));render(false);}
    function refreshInputs(){pause();inputs=Object.fromEntries(c.fields.map(a=>{const input=q('[data-input="'+a[0]+'"]');return [a[0],input.value.trim()===''?NaN:Number(input.value)];}));elapsed=0;render(true);}
    host.querySelectorAll('[data-input]').forEach(el=>el.addEventListener('input',refreshInputs));
    playButton.addEventListener('click',()=>running?pause():play());q('#courseResetSimulation').addEventListener('click',reset);q('#courseSimulationRate').addEventListener('change',e=>{rate=Number(e.target.value)||1;last=0;});progress.addEventListener('input',()=>seek(Number(progress.value)/1000*physics.duration(type,inputs)));
    const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);
    function csv(){return ['trial,mass1_kg,mass2_kg,initial_velocity1_mps,initial_velocity2_mps,restitution,initial_momentum_kgmps,final_momentum_kgmps',...trials.map((t,i)=>[i+1,t.inputs.mass1,t.inputs.mass2,t.inputs.velocity1,t.inputs.velocity2,t.inputs.restitution,t.result.initialMomentum,t.result.finalMomentum].join(','))].join('\n');}
    function drawTrials(){if(type!=='collision')return;const tbody=q('#courseTrialTable tbody');tbody.replaceChildren();for(let i=0;i<trials.length;i++){const t=trials[i],tr=document.createElement('tr');for(const value of [i+1,t.inputs.mass1,t.inputs.mass2,t.inputs.velocity1,t.inputs.velocity2,t.inputs.restitution,t.result.initialMomentum,t.result.finalMomentum]){const td=document.createElement('td');td.textContent=f(value);tr.appendChild(td);}tbody.appendChild(tr);}q('#courseExportTrials').disabled=!trials.length;q('#courseClearTrials').disabled=!trials.length;q('#courseRecordTrial').disabled=!getResult().valid||trials.length>=20;q('#courseTrialStatus').textContent=trials.length?trials.length+' of 20 trials recorded. Export CSV to keep this session.':'Record up to 20 parameter sets to compare momentum before and after.';q('#courseTrialCSV').hidden=true;}
    if(type==='collision'){
      q('#courseRecordTrial').addEventListener('click',()=>{const r=getResult();if(!r.valid||trials.length>=20)return;trials.push({inputs:{...inputs},result:{...r}});drawTrials();});
      q('#courseClearTrials').addEventListener('click',()=>{trials=[];drawTrials();});
      q('#courseExportTrials').addEventListener('click',()=>{if(!trials.length)return;const content=csv(),ta=q('#courseTrialCSV');ta.value=content;ta.hidden=false;q('#courseTrialStatus').textContent='CSV is shown below. Your browser may also download orbit-collision-trials.csv.';try{const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='orbit-collision-trials.csv';a.click();root.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(_){q('#courseTrialStatus').textContent='Copy the CSV below to save your recorded trials.';}});
    }
    render(true);
    return {play,pause,reset,seek,redraw:()=>render(true),inspect:()=>({type,inputs:{...inputs},valid:getResult().valid,result:getResult(),trials:trials.map(t=>({inputs:{...t.inputs},result:{...t.result}})),animation:{running,elapsed,duration:physics.duration(type,inputs),sample:physics.sample(type,inputs,elapsed)}}),destroy(){if(destroyed)return;pause();destroyed=true;document.removeEventListener('visibilitychange',hidden);host.replaceChildren();}};
  }
  root.OrbitCourseExperiments=Object.freeze({supported:TYPES,mount});
})(typeof window==='object'?window:null);
