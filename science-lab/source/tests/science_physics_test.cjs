'use strict';
const assert=require('node:assert/strict');
const models=require('../science_gallery/physics-extra.js');
let checks=0;
const test=(name,fn)=>{fn();checks++;process.stdout.write('✓ '+name+'\n');};
const near=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<=epsilon*Math.max(1,Math.abs(b)),`${a} differs from ${b}`);
const defaults=model=>Object.fromEntries(model.fields.map(f=>[f.key,f.value]));
// Independent composite-Simpson integral, not the model's AGM implementation.
function pendulumPeriod(length,gravity,angle){
  const k=Math.sin(Math.abs(angle)*Math.PI/360),n=2048,step=(Math.PI/2)/n;
  const f=x=>1/Math.sqrt(1-k*k*Math.sin(x)**2);
  let sum=f(0)+f(Math.PI/2);
  for(let i=1;i<n;i++)sum+=(i%2?4:2)*f(i*step);
  return 4*Math.sqrt(length/gravity)*sum*step/3;
}

const projectile=models['physics-projectile'],acc=models['physics-acceleration'],wave=models['physics-waves'],pendulum=models['physics-pendulum'],circuit=models['physics-circuit'],vectors=models['physics-vectors'];

test('six independent physics descriptors with usable valid defaults',()=>{
  assert.equal(Object.keys(models).length,6);
  for(const m of Object.values(models)){assert.ok(m.title&&m.note&&m.fields.length);assert.ok(m.calculate(defaults(m)).valid);}
});
test('projectile matches analytic 20 m/s launch at 45 degrees',()=>{
  const o={speed:20,angle:45,gravity:10},r=projectile.calculate(o);
  near(r.range,40);near(r.maxHeight,10);near(r.flightTime,2*Math.SQRT2);
  const apex=projectile.sample(o,r,.5);near(apex.x,20);near(apex.y,10);near(apex.vy,0);
  const end=projectile.sample(o,r,1);near(end.x,40);near(end.y,0);near(end.vy,-r.vy);
});
test('projectile complementary angles have same range and different heights',()=>{
  const a=projectile.calculate({speed:12,angle:30,gravity:9.81}),b=projectile.calculate({speed:12,angle:60,gravity:9.81});near(a.range,b.range);assert.ok(b.maxHeight>a.maxHeight);
});
test('projectile initial state is ground level and launch velocity',()=>{
  const o=defaults(projectile),r=projectile.calculate(o),s=projectile.sample(o,r,0);near(s.time,0);near(s.x,0);near(s.y,0);near(s.vy,r.vy);
});
test('constant acceleration displacement and velocity match kinematics',()=>{
  const o={position:3,velocity:4,acceleration:-2,time:6,plot:'position'},r=acc.calculate(o),s=acc.sample(o,r,.5);
  near(r.finalPosition,-9);near(r.finalVelocity,-8);near(s.position,6);near(s.velocity,-2);near(s.time,3);near(r.maxPosition,7);near(r.minPosition,-9);
});
test('constant zero acceleration and negative velocity stay signed',()=>{
  const o={position:10,velocity:-3,acceleration:0,time:4,plot:'velocity'},r=acc.calculate(o);near(r.finalPosition,-2);near(r.finalVelocity,-3);near(r.maxPosition,10);near(r.minPosition,-2);
});
test('acceleration rejects unrecognized graph modes',()=>assert.equal(acc.calculate({...defaults(acc),plot:'html'}).valid,false));
test('wave speed and period match v=fλ and reciprocal frequency',()=>{
  const o={frequency:2,wavelength:3,amplitude:1},r=wave.calculate(o);near(r.speed,6);near(r.period,.5);
  const at0=wave.sample(o,r,0),onePeriod=wave.sample(o,r,r.period/6);near(at0.markerDisplacement,onePeriod.markerDisplacement);
});
test('wave marker stays at one medium x-coordinate and within amplitude',()=>{
  const o=defaults(wave),r=wave.calculate(o);let changed=false;
  for(let i=0;i<=50;i++){const s=wave.sample(o,r,i/50);near(s.markerX,2.5);assert.ok(Math.abs(s.markerDisplacement)<=o.amplitude+1e-12);if(i&&Math.abs(s.markerDisplacement-wave.sample(o,r,0).markerDisplacement)>.1)changed=true;}assert.ok(changed);
});
test('zero amplitude gives a valid flat wave',()=>{
  const o={frequency:1,wavelength:1,amplitude:0},r=wave.calculate(o);assert.ok(r.valid);near(wave.sample(o,r,.21).markerDisplacement,0);
});
test('pendulum zero-angle period approaches the small-angle limit',()=>{
  const r=pendulum.calculate({length:1,gravity:9.81,angle:0});
  near(r.period,2*Math.PI/Math.sqrt(9.81));near(r.frequency,1/r.period);
});
test('pendulum 90-degree period and trajectory agree with independent nonlinear values',()=>{
  const o={length:1,gravity:9.81,angle:90},r=pendulum.calculate(o);assert.ok(r.valid);
  near(r.period,pendulumPeriod(o.length,o.gravity,o.angle),1e-10);
  assert.ok(r.period>2*Math.PI/Math.sqrt(9.81));near(r.frequency,1/r.period);
  const release=pendulum.sample(o,r,0);near(release.angle,90);near(release.angularVelocity,0);
  const quarter=pendulum.sample(o,r,r.period/24);near(quarter.angle,0,1e-6);assert.ok(quarter.angularVelocity<0);
  near(pendulum.sample(o,r,r.period/6).angle,90,1e-6);
});
test('pendulum four times the length doubles period',()=>{
  const a=pendulum.calculate({length:.5,gravity:9.81,angle:10}),b=pendulum.calculate({length:2,gravity:9.81,angle:10});near(b.period,2*a.period);
});
test('pendulum accepts both 90-degree directions and rejects angles outside that range',()=>{
  for(const angle of[-90,90])assert.ok(pendulum.calculate({length:1,gravity:9.81,angle}).valid);
  for(const angle of[-91,91])assert.equal(pendulum.calculate({length:1,gravity:9.81,angle}).valid,false);
});
test('circuit uses I=V/R and P=VI, allowing zero voltage',()=>{
  const r=circuit.calculate({voltage:12,resistance:100});near(r.current,.12);near(r.power,1.44);
  const zero=circuit.calculate({voltage:0,resistance:100});assert.ok(zero.valid);near(zero.current,0);near(zero.power,0);
});
test('circuit rejects zero/negative resistance and negative supply',()=>{
  for(const o of[{voltage:9,resistance:0},{voltage:9,resistance:-1},{voltage:-1,resistance:100}])assert.equal(circuit.calculate(o).valid,false);
});
test('vector components and magnitude obey head-to-tail addition',()=>{
  const r=vectors.calculate({ax:3,ay:0,bx:0,by:4});near(r.rx,3);near(r.ry,4);near(r.magnitude,5);near(r.angle,Math.atan2(4,3)*180/Math.PI);
});
test('vector directions retain all four quadrants',()=>{
  for(const [x,y,a]of[[1,1,45],[-1,1,135],[-1,-1,225],[1,-1,315]])near(vectors.calculate({ax:x,ay:y,bx:0,by:0}).angle,a);
});
test('opposite vectors give zero magnitude and explicitly undefined direction',()=>{
  const r=vectors.calculate({ax:3,ay:-2,bx:-3,by:2});near(r.magnitude,0);assert.equal(r.angle,null);assert.match(r.values.at(-1).value,/Undefined/);
});
test('vector drawing sequence does not pretend to be a physical trajectory',()=>{
  const o=defaults(vectors),r=vectors.calculate(o),first=vectors.sample(o,r,0),last=vectors.sample(o,r,1);near(first.aFraction,0);near(first.bFraction,0);near(first.rFraction,0);near(last.aFraction,1);near(last.bFraction,1);near(last.rFraction,1);assert.deepEqual(first.values,last.values);
});
test('all numeric fields reject NaN, infinity, strings and out-of-range values',()=>{
  for(const m of Object.values(models))for(const f of m.fields.filter(f=>f.type==='number'))for(const value of[NaN,Infinity,-Infinity,String(f.value),undefined,f.min-1,f.max+1])assert.equal(m.calculate({...defaults(m),[f.key]:value}).valid,false,m.title+' '+f.key+' '+value);
});

function drawingHelper(){
  const records=[];
  const add=(type,args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),'Drawing '+type+' received nonfinite coordinate');records.push({type,args});return {};};
  return {records,el:(...a)=>add('el',a),line:(...a)=>add('line',a),rect:(...a)=>{assert.ok(a[2]>=0&&a[3]>=0);return add('rect',a);},circle:(...a)=>{assert.ok(a[2]>=0);return add('circle',a);},text:(...a)=>add('text',a),path:(d,attrs)=>{assert.ok(!/NaN|Infinity|undefined/.test(d),'SVG path has invalid value');return add('path',[d,attrs]);}};
}
test('conventional current returns leftward along the bottom wire toward the negative terminal',()=>{
  const draw=voltage=>{const o={voltage,resistance:100},r=circuit.calculate(o),h=drawingHelper();circuit.draw({},o,r,circuit.sample(o,r,.2),.2,h);return h.records.filter(v=>v.type==='line'&&v.args[1]===298&&v.args[3]===298&&v.args[4]==='#299b85');};
  const arrows=draw(9);assert.equal(arrows.length,1);assert.ok(arrows[0].args[2]<arrows[0].args[0]);assert.equal(draw(0).length,0);
});
test('all six diagrams render finite coordinates at start, middle and end',()=>{
  for(const m of Object.values(models)){
    const o=defaults(m),r=m.calculate(o);
    for(const p of[0,.25,.5,.75,1]){const helper=drawingHelper();m.draw({},o,r,m.sample(o,r,p),p,helper);assert.ok(helper.records.length>10,m.title+' has meaningful diagram');}
  }
});
test('extreme valid values draw safely including zero-amplitude, zero-vector and zero-current',()=>{
  for(const m of Object.values(models))for(const which of['min','max']){
    const o=Object.fromEntries(m.fields.map(f=>[f.key,f.type==='number'?f[which]:f.value])),r=m.calculate(o);assert.ok(r.valid,m.title+' '+which);
    const helper=drawingHelper();m.draw({},o,r,m.sample(o,r,.5),.5,helper);
  }
  for(const [m,o]of[[vectors,{ax:0,ay:0,bx:0,by:0}],[wave,{frequency:1,wavelength:2,amplitude:0}],[circuit,{voltage:0,resistance:100}]]){const r=m.calculate(o),helper=drawingHelper();m.draw({},o,r,m.sample(o,r,.5),.5,helper);}
});
console.log('\n'+checks+' Orbit Science physics checks passed.');
