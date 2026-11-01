'use strict';
const assert=require('node:assert/strict');
const P=require('../orbit_course/experiments.js');
let assertions=0;
function ok(value,message){assert.ok(value,message);assertions++;}
function close(a,b,message){assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${message}: ${a} ≠ ${b}`);assertions++;}
const defs={forces:{mass:2,force:6},friction:{mass:3,force:15,mu:.3},work:{force:20,distance:8,angle:30},energy:{mass:2,height:8,gravity:9.81},power:{work:600,time:6},momentum:{mass:3,velocity:4},impulse:{mass:2,velocity:-3,force:4,time:4},collision:{mass1:2,mass2:2,velocity1:4,velocity2:0,restitution:1}};
for(const [type,input] of Object.entries(defs)){
  const r=P[type](input);ok(r.valid,type+' default valid');
  const duration=P.duration(type,input);ok(Number.isFinite(duration)&&duration>0,type+' positive finite duration');
  const start=P.sample(type,input,0),end=P.sample(type,input,duration);
  close(start.time,0,type+' starts at zero');close(end.fraction,1,type+' reaches final frame');
  close(P.sample(type,input,-3).time,0,type+' clamps negative seek');close(P.sample(type,input,duration+100).time,duration,type+' clamps final seek');
  for(let i=0;i<=40;i++){const s=P.sample(type,input,duration*i/40);ok(s.valid,type+' samples valid');for(const val of Object.values(s))if(typeof val==='number')ok(Number.isFinite(val),type+' samples finite');}
}
close(P.forces(defs.forces).acceleration,3,'F=ma');
close(P.sample('forces',defs.forces,2).position,6,'force position');
close(P.sample('forces',{mass:2,force:-6},2).position,-6,'negative force position');
const staticInput={mass:5,force:4,mu:.4};
ok(P.friction(staticInput).staticFriction,'static friction regime');
close(P.friction(staticInput).frictionForce,-4,'static friction balances force');close(P.sample('friction',staticInput,6).position,0,'static cart stays still');
const negativeSlide={mass:2,force:-15,mu:.2};ok(!P.friction(negativeSlide).staticFriction,'negative sliding');ok(P.friction(negativeSlide).frictionForce>0,'friction opposes negative movement');ok(P.sample('friction',negativeSlide,2).velocity<0,'negative sliding velocity');
close(P.work({force:10,distance:3,angle:0}).work,30,'parallel work');close(P.work({force:10,distance:3,angle:90}).work,0,'perpendicular work');close(P.work({force:10,distance:3,angle:180}).work,-30,'negative work');
close(P.sample('work',defs.work,3).accumulatedWork,P.work(defs.work).work/2,'work accumulation');
const e=defs.energy,fall=P.duration('energy',e);
for(let i=0;i<=100;i++){const s=P.sample('energy',e,fall*i/100);close(s.potentialEnergy+s.kineticEnergy,s.totalEnergy,'energy conservation');close(s.velocity*s.velocity,2*e.gravity*s.fallen,'fall speed');}
const zeroHeight=P.sample('energy',{mass:2,height:0,gravity:9.81},1);close(zeroHeight.height,0,'zero height at ground');close(zeroHeight.kineticEnergy,0,'zero height zero kinetic');
close(P.power({work:-500,time:5}).power,-100,'negative power');close(P.sample('power',{work:0,time:4},2).energyFraction,0,'zero work no energy transfer');close(P.sample('power',defs.power,3).transferredWork,300,'half transfer');
close(P.momentum({mass:5,velocity:-3}).momentum,-15,'signed momentum');close(P.sample('momentum',{mass:5,velocity:-3},2).position,-6,'signed constant speed position');
const impulse={mass:2,velocity:-3,force:4,time:4},ir=P.impulse(impulse);
close(ir.impulse,16,'impulse');close(ir.finalMomentum-ir.initialMomentum,ir.impulse,'momentum change');close(P.sample('impulse',impulse,1.5).velocity,0,'impulse reversal');close(P.sample('impulse',impulse,1.5).position,-2.25,'turning position');
let combinations=0;
for(const m1 of [.05,1,10])for(const m2 of [.05,2,20])for(const u1 of [-1,0,4])for(const u2 of [-5,-1,0])for(const restitution of [0,.25,1]){
  if(u1<u2)continue;const input={mass1:m1,mass2:m2,velocity1:u1,velocity2:u2,restitution},r=P.collision(input);ok(r.valid,'collision inputs valid');close(r.initialMomentum,r.finalMomentum,'collision momentum');close(r.finalVelocity2-r.finalVelocity1,restitution*(u1-u2),'relative separation speed');ok(r.finalKineticEnergy<=r.initialKineticEnergy+1e-8,'no generated energy');
  if(restitution===0)close(r.finalVelocity1,r.finalVelocity2,'inelastic common velocity');if(restitution===1)close(r.initialKineticEnergy,r.finalKineticEnergy,'elastic energy');
  if(u1>u2){const before=P.sample('collision',input,1.5-1e-8),contact=P.sample('collision',input,1.5),after=P.sample('collision',input,1.5+1e-8);close(contact.position1,0,'contact x1');close(contact.position2,0,'contact x2');ok(Math.abs(before.position1)<1e-5&&Math.abs(after.position1)<1e-5,'continuous x1');ok(Math.abs(before.position2)<1e-5&&Math.abs(after.position2)<1e-5,'continuous x2');}
  combinations++;
}
const same=P.collision({mass1:1,mass2:3,velocity1:2,velocity2:2,restitution:1});ok(same.collisionTime===null,'same speed no collision');
const tiny={mass1:1,mass2:1,velocity1:.0001,velocity2:0,restitution:0};close(P.sample('collision',tiny,3).position1,P.sample('collision',tiny,3).position2,'slow stuck carts same coordinate');
for(const [type,input]of Object.entries(defs))for(const value of [NaN,Infinity,-Infinity,'2',Number.MIN_VALUE,1e20]){const key=Object.keys(input)[0];ok(!P[type]({...input,[key]:value}).valid,type+' rejects unsupported number');}
for(const type of ['forces','friction','energy','momentum','impulse'])ok(!P[type]({...defs[type],mass:0}).valid,type+' zero mass invalid');
ok(!P.energy({...e,height:-1}).valid,'negative height invalid');ok(!P.power({work:4,time:0}).valid,'zero duration invalid');ok(!P.collision({...defs.collision,velocity1:-1}).valid,'separating carts invalid');ok(!P.collision({...defs.collision,restitution:1.1}).valid,'invalid restitution');ok(!P.friction({...defs.friction,mu:-.1}).valid,'negative friction invalid');
console.log(`PASS ${assertions} assertions: all eight models, signed trajectories, energy conversion, impulse reversal, ${combinations} collision configurations, and invalid-input guards.`);
