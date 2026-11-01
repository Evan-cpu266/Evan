'use strict';
const assert = require('node:assert/strict');
const models = require('../chemistry_lab/structure.js');
let count=0;
function near(a,b,tol=1e-10){assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);count++;}
function defaults(model){return Object.fromEntries(model.fields.map(f=>[f.key,f.value]));}
for(const [id,model]of Object.entries(models)){
  const input=defaults(model),result=model.calculate(input);assert.equal(result.valid,true,id+' defaults');count++;
  assert.ok(result.values.length,id+' results');count++;
  for(const p of [0,.25,.5,.75,1])if(model.sample){const sample=model.sample(input,result,p);assert.ok(sample.values.length,id+' sample');count++;}
}
const mole=models.moles.calculate({mass:18.015,molarMass:18.015});near(mole.moles,1);near(mole.entities,6.02214076e23);assert.equal(models.moles.calculate({mass:1,molarMass:0}).valid,false);count++;
for(const percent of [0,10,24.22,50,100]){const r=models.isotopes.calculate({heavyPercent:percent});near(r.light+r.heavy,1);near(r.average,34.96885268*(1-percent/100)+36.96590260*percent/100);}
for(let z=1;z<=18;z++)for(let charge=-3;charge<=3;charge++){
 const r=models.electrons.calculate({atomicNumber:z,charge}),n=z-charge;
 assert.equal(r.valid,n>=0&&n<=18);count++;
 if(r.valid){assert.equal(r.electrons,n);assert.equal(r.shells.reduce((a,b)=>a+b,0),n);count+=2;}
}
assert.equal(models.electrons.calculate({atomicNumber:11,charge:1}).configuration,'1s² 2s² 2p⁶');count++;
assert.equal(models.electrons.calculate({atomicNumber:8,charge:-2}).valence,8);count++;
const neon=models.pes.calculate({element:'Ne',photonEnergy:1250});assert.equal(neon.peaks.reduce((n,a)=>n+a.count,0),10);count++;
const sodium=models.pes.calculate({element:'Na',photonEnergy:10});assert.equal(sodium.accessible,1);near(sodium.peaks[3].kinetic,4.86);count++;
assert.equal(models.pes.calculate({element:'Ne',photonEnergy:1}).accessible,0);count++;
for(const property of ['radius','ionization','electronegativity'])for(const element of ['1','2','9','18']){assert.equal(models.trends.calculate({element,compare:'3',property}).valid,true);count++;}
const polar={H2O:true,NH3:true,CO2:false,BF3:false,CH4:false,PF5:false,SF6:false};
for(const [molecule,isPolar]of Object.entries(polar)){const r=models.geometry.calculate({molecule});assert.equal(r.polar,isPolar);assert.equal(r.vectors.length,{H2O:2,NH3:3,CO2:2,BF3:3,CH4:4,PF5:5,SF6:6}[molecule]);count+=2;}
function angle(a,b){return Math.acos(a.reduce((sum,x,i)=>sum+x*b[i],0)/(Math.hypot(...a)*Math.hypot(...b)))*180/Math.PI;}
near(angle(...models.geometry.calculate({molecule:'H2O'}).vectors),104.5,1e-7);
const methane=models.geometry.calculate({molecule:'CH4'});near(angle(methane.vectors[0],methane.vectors[1]),109.4712206,1e-7);
for(const q1 of [1,2,3])for(const q2 of [1,2,3])for(const separation of [100,250,500]){const input={positiveCharge:q1,negativeCharge:q2,separation},r=models.lattice.calculate(input),s0=models.lattice.sample(input,r,0),s1=models.lattice.sample(input,r,1);assert.ok(r.energy<0&&r.force>0);assert.ok(s0.energy>r.energy&&s0.force<r.force);near(s1.energy,r.energy);near(s1.force,r.force);count+=2;}
const pair1=models.lattice.calculate({positiveCharge:1,negativeCharge:1,separation:200}),pair2=models.lattice.calculate({positiveCharge:1,negativeCharge:1,separation:400});near(pair1.energy,2*pair2.energy);near(pair1.force,4*pair2.force);
for(const [id,model]of Object.entries(models)){
 const input=defaults(model),numeric=model.fields.find(f=>f.type==='number');
 if(numeric)for(const value of [NaN,Infinity,-Infinity,Number.MAX_VALUE]){assert.equal(model.calculate({...input,[numeric.key]:value}).valid,false,id+' invalid numeric');count++;}
}
// Drawing descriptors must stay finite at both ends and animate real geometry.
for(const [id,model]of Object.entries(models)){
 const input=defaults(model),result=model.calculate(input),frames=[];
 for(const p of [0,.43,1]){
  const calls=[];
  const record=(name,args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),id+' diagram finite');calls.push([name,...args]);};
  const h=Object.fromEntries(['line','rect','circle','text','path','el','atom'].map(name=>[name,(...args)=>record(name,args)]));
  model.draw(null,input,result,model.sample?model.sample(input,result,p):{},p,h);
  assert.ok(calls.length>=10,id+' substantive diagram');count++;
  frames.push(JSON.stringify(calls));
 }
 assert.notEqual(frames[0],frames[1],id+' must animate geometry, not only timeline');count++;
}
console.log(`PASS: structure models (${Object.keys(models).length}); ${count} meaningful assertions for moles, isotope weighting, ions, PES, trends, geometry and Coulomb scaling.`);
