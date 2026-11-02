'use strict';
const assert=require('node:assert/strict');
const pendulum=require('../science_gallery/physics-extra.js')['physics-pendulum'];
let checks=0;
function test(name,fn){fn();checks++;process.stdout.write('✓ '+name+'\n');}
function near(actual,expected,tolerance=1e-7){assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} differs from ${expected}`);}
const options=(angle=90,length=1,gravity=9.81)=>({angle,length,gravity});
function independentPeriod(o){
  const k=Math.sin(Math.abs(o.angle)*Math.PI/360),n=20000,step=Math.PI/(2*n);
  const f=u=>1/Math.sqrt(1-k*k*Math.sin(u)**2);
  let total=f(0)+f(Math.PI/2);
  for(let i=1;i<n;i++)total+=(i%2?4:2)*f(i*step);
  return 4*Math.sqrt(o.length/o.gravity)*total*step/3;
}
const atTime=(o,result,t)=>pendulum.sample(o,result,t/6);

test('numeric controls allow signed releases up to ninety degrees',()=>{
  const angle=pendulum.fields.find(f=>f.key==='angle');assert.equal(angle.min,-90);assert.equal(angle.max,90);
  for(const a of[-90,-45,0,45,90])assert.equal(pendulum.calculate(options(a)).valid,true);
  for(const a of[-90.0001,90.0001,NaN,Infinity,'90'])assert.equal(pendulum.calculate(options(a)).valid,false);
});
test('large-angle periods agree with independent elliptic-integral quadrature',()=>{
  for(const a of[0,.001,12,45,90]){const o=options(a),r=pendulum.calculate(o);near(r.period,independentPeriod(o),2e-12);near(r.frequency,1/r.period,1e-14);}
});
test('ninety-degree period is longer than the small-angle approximation',()=>{
  const r=pendulum.calculate(options());near(r.period,2.367841947576237,1e-12);assert.ok(r.period/r.smallAnglePeriod>1.18);
});
test('period depends on amplitude magnitude, length and gravity as expected',()=>{
  near(pendulum.calculate(options(-90)).period,pendulum.calculate(options(90)).period);
  near(pendulum.calculate(options(60,2)).period/pendulum.calculate(options(60,.5)).period,2);
  near(pendulum.calculate(options(60,1,2.4525)).period/pendulum.calculate(options(60)).period,2);
});
test('release is from rest and left and right trajectories are mirror images',()=>{
  const a=options(90),b=options(-90),ra=pendulum.calculate(a),rb=pendulum.calculate(b);
  const start=atTime(a,ra,0);near(start.angle,90,1e-14);near(start.angularVelocity,0,1e-14);
  for(let i=0;i<=100;i++){const x=atTime(a,ra,6*i/100),y=atTime(b,rb,6*i/100);near(x.angle,-y.angle,1e-10);near(x.angularVelocity,-y.angularVelocity,1e-10);}
});
test('nonlinear quarter, half and full cycle return the expected physical states',()=>{
  for(const angle of[12,45,90]){
    const o=options(angle),r=pendulum.calculate(o),quarter=atTime(o,r,r.period/4),half=atTime(o,r,r.period/2),full=atTime(o,r,r.period);
    near(quarter.angle,0,2e-7);near(quarter.angularVelocity,-r.maxAngularSpeed,1e-8);
    near(half.angle,-angle,1e-8);near(half.angularVelocity,0,2e-7);
    near(full.angle,angle,1e-8);near(full.angularVelocity,0,2e-7);
  }
});
test('six-second integration conserves energy across the supported physical extremes',()=>{
  for(const o of[options(90,.1,30),options(-90,3,.1),options(45,1,9.81),options(.001,.1,30)]){
    const r=pendulum.calculate(o),initial=2*o.gravity*o.length*Math.sin(o.angle*Math.PI/360)**2;
    for(let j=0;j<=600;j++){
      const s=atTime(o,r,6*j/600),energy=.5*o.length**2*s.angularVelocity**2+2*o.gravity*o.length*Math.sin(s.theta/2)**2;
      assert.ok(Math.abs(energy-initial)<=initial*1e-7+1e-17,'Energy drift '+JSON.stringify(o));
      assert.ok(Math.abs(s.angle)<=Math.abs(o.angle)+1e-7);
    }
  }
});
test('zero-angle release is stationary with a finite limiting period',()=>{
  const o=options(0),r=pendulum.calculate(o);near(r.period,2*Math.PI*Math.sqrt(o.length/o.gravity),1e-14);
  for(const p of[0,.25,.5,.75,1]){const s=pendulum.sample(o,r,p);assert.equal(s.angle,0);assert.equal(s.angularVelocity,0);}
});
test('geometry and drawing expose a draggable bob, string and live angle for both extremes',()=>{
  assert.ok(Object.isFrozen(pendulum.interaction));assert.deepEqual(pendulum.interaction,{pivotX:185,pivotY:105,lengthPixels:120,maxAngle:90});
  for(const a of[-90,0,90]){
    const o=options(a),r=pendulum.calculate(o),s=pendulum.sample(o,r,0),elements=[];
    const record=(tag,attrs,text)=>{elements.push({tag,attrs:attrs||{},text});return {};};
    const h={el:record,line:(...args)=>record('line',{args}),rect:(...args)=>record('rect',{args}),circle:(...args)=>record('circle',{args}),text:(...args)=>record('text',{args}),path:(...args)=>record('path',{args})};
    pendulum.draw({},o,r,s,0,h);
    assert.ok(elements.some(e=>Object.hasOwn(e.attrs,'data-pendulum-bob')));
    const string=elements.find(e=>Object.hasOwn(e.attrs,'data-pendulum-string')).attrs;
    near(Math.hypot(string.x2-string.x1,string.y2-string.y1),120,1e-14);
    assert.ok(string.x2>=65&&string.x2<=305&&string.y2>=105-1e-12&&string.y2<=225);
    assert.ok(elements.some(e=>e.tag==='text'&&e.attrs.args?.[2]==='θ = '+a+'°'));
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(elements)));
  }
});
process.stdout.write(`\n${checks} nonlinear pendulum checks passed.\n`);
