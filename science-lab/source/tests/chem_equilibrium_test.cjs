'use strict';
const assert = require('node:assert/strict');
const models = require('../chemistry_lab/equilibrium.js');
let assertions=0;
function check(condition,message){assert.ok(condition,message);assertions++;}
function near(a,b,eps=1e-9){check(Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≠ ${b}`);}
const defaults=id=>Object.fromEntries(models[id].fields.map(f=>[f.key,f.value]));
const helpers={el:()=>({}),line:()=>{},rect:()=>{},circle:()=>{},text:()=>{},path:()=>{},atom:()=>{}};

for(const [id,model]of Object.entries(models)){
 const input=defaults(id),r=model.calculate(input);
 check(r.valid,id+' defaults valid');
 check(Array.isArray(r.values)&&r.values.length>0,id+' results present');
 for(const p of [0,.25,.5,.75,1]){
  const s=model.sample?model.sample(input,r,p):{};
  model.draw({},input,r,s,p,helpers);
  check(true,id+' drawing safe');
 }
 for(const field of model.fields.filter(f=>f.type==='number')){
  check(!model.calculate({...input,[field.key]:NaN}).valid,id+' rejects NaN '+field.key);
  check(!model.calculate({...input,[field.key]:Infinity}).valid,id+' rejects infinity '+field.key);
 }
}
{
 const o=defaults('calorimetry'),r=models.calorimetry.calculate(o);
 near(r.deltaTemperature,5000/(100*4.184));near(r.finalTemperature,o.initialTemperature+r.deltaTemperature);
 const cooling=models.calorimetry.calculate({...o,heat:-5000});near(cooling.deltaTemperature,-r.deltaTemperature);
 check(!models.calorimetry.calculate({...o,heat:50000}).valid,'No unmodelled boiling');
 check(!models.calorimetry.calculate({...o,initialTemperature:0,heat:-1}).valid,'No unmodelled freezing');
 near(models.calorimetry.sample(o,r,.5).heat,2500);
}
{
 const r=models.gibbs.calculate(defaults('gibbs'));near(r.deltaG,-40-298.15*(-.08));
 near(models.gibbs.calculate({enthalpy:100,entropy:100,temperature:1000}).deltaG,0);
 check(models.gibbs.calculate({enthalpy:100,entropy:100,temperature:1500}).deltaG<0,'Temperature flips standard favourability');
}
{
 const model=models.equilibrium;
 for(const A of [0,.1,1,3])for(const B of [0,.5,2]){
  if(A+B===0)continue;
  const o={forwardRate:.35,reverseRate:.15,initialA:A,initialB:B,time:120},r=model.calculate(o);
  near(r.equilibriumB/r.equilibriumA,r.Kc);
  near(o.forwardRate*r.equilibriumA,o.reverseRate*r.equilibriumB);
  const s0=model.sample(o,r,0);near(s0.A,A);near(s0.B,B);
  for(const p of [0,.05,.3,.7,1]){const s=model.sample(o,r,p);near(s.A+s.B,A+B);check(s.A>=0&&s.B>=0,'Nonnegative concentrations');}
  near(model.sample(o,r,1).A,r.equilibriumA,1e-8);
 }
 check(!model.calculate({...defaults('equilibrium'),initialA:0,initialB:0}).valid,'Empty system rejected');
}
{
 const model=models.gasEquilibrium;
 for(const temperature of [250,298.15,350,400])for(const volumeRatio of [.25,1,4]){
  const o={initialConcentration:.5,temperature,volumeRatio},r=model.calculate(o);
  check(r.valid,'Gas equilibrium valid');near(r.NO2*r.NO2/r.N2O4,r.Kc,1e-8);
  near(r.Kp/r.Kc,.082057366*temperature);
  near(r.N2O4+r.NO2/2,.5/volumeRatio);
 }
 const cold=model.calculate({initialConcentration:.5,temperature:250,volumeRatio:1}),hot=model.calculate({initialConcentration:.5,temperature:400,volumeRatio:1});
 check(hot.Kc>cold.Kc&&hot.dissociationFraction>cold.dissociationFraction,'Endothermic dissociation favoured by heat');
 const compressed=model.calculate({initialConcentration:.5,temperature:298.15,volumeRatio:.25}),expanded=model.calculate({initialConcentration:.5,temperature:298.15,volumeRatio:4});
 check(expanded.dissociationFraction>compressed.dissociationFraction,'Expansion favours more gas molecules');
 near(model.calculate({initialConcentration:.5,temperature:298.15,volumeRatio:1}).Kc,.1);
}
{
 const model=models.acidbase;
 for(const kind of ['strongAcid','weakAcid','strongBase','weakBase'])for(const concentration of [1e-9,1e-8,1e-5,.01,1])for(const constant of [1e-12,1.8e-5,.1]){
  const o={kind,concentration,constant},r=model.calculate(o);
  check(r.valid,'Acid/base valid');near(r.hydrogen*r.hydroxide,1e-14,1e-12);near(r.pH+r.pOH,14);
  check(r.pH>=-1e-9&&r.pH<=14.000001,'Water-aware pH bounds');
  const dominant=r.basic?r.hydroxide:r.hydrogen;
  const opposite=r.basic?r.hydrogen:r.hydroxide;
  const soluteIons=r.weak?concentration*constant/(constant+dominant):concentration;
  near(dominant-opposite,soluteIons,1e-10);
 }
 const strong=model.calculate({kind:'strongAcid',concentration:.01,constant:1e-5});near(strong.pH,2,1e-8);
 const dilute=model.calculate({kind:'strongAcid',concentration:1e-8,constant:1e-5});check(dilute.pH<7&&dilute.pH>6.9,'Dilute strong acid includes water');
 const wa=model.calculate({kind:'weakAcid',concentration:.1,constant:1.8e-5}),wb=model.calculate({kind:'weakBase',concentration:.1,constant:1.8e-5});near(wa.pH+wb.pH,14);
}
{
 const model=models.buffer,o=defaults('buffer'),r=model.calculate(o);
 near(r.acid,.125);near(r.base,.075);near(r.pH,4.76+Math.log10(.075/.125));
 near(model.calculate({...o,addition:0}).pH,o.pKa);
 near(model.calculate({...o,volume:5}).pH,r.pH);
 check(!model.calculate({...o,addition:.1}).valid,'Exhausted conjugate base rejected');
 check(!model.calculate({...o,addition:-.1}).valid,'Exhausted weak acid rejected');
 const start=model.sample(o,r,0),end=model.sample(o,r,1);near(start.pH,4.76);near(end.pH,r.pH);
}
{
 const model=models.galvanic,o=defaults('galvanic'),r=model.calculate(o);
 near(r.potential,1.1);near(r.deltaG,-2*96485.33212*1.1/1000);
 const q10=model.calculate({...o,zincConcentration:1,copperConcentration:.1});
 near(q10.potential,1.1-8.314462618*298.15/(2*96485.33212)*Math.log(10));
 check(q10.potential<r.potential,'Increasing Q lowers cell potential');
}
{
 const model=models.electrolysis,o=defaults('electrolysis'),r=model.calculate(o);
 near(r.charge,1200);near(r.mass,1200/96485.33212/2*63.546);
 near(model.calculate({...o,efficiency:50}).mass,r.mass/2);
 near(model.calculate({...o,current:0}).mass,0);
 near(model.calculate({...o,time:0}).mass,0);
 near(model.sample(o,r,.5).mass,r.mass/2);
}
console.log(`PASS: ${assertions} thermodynamics/equilibrium/acid-base/electrochemistry assertions; all8 models draw at5 playback positions.`);
