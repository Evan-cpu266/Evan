'use strict';
const assert=require('node:assert/strict');
const models=require('../chemistry_lab/reactions.js');
let assertions=0;
function check(x,msg){assert.ok(x,msg);assertions++;}
function near(a,b,tol=1e-10){check(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≉ ${b}`);}
function defaults(model){return Object.fromEntries(model.fields.map(f=>[f.key,f.value]));}
for(const [id,m]of Object.entries(models)){
 const i=defaults(m),r=m.calculate(i);check(r.valid,id+' defaults');
 for(const p of [0,.1,.5,1]){const s=m.sample?m.sample(i,r,p):{};for(const v of [...r.values,...(s.values||[])])if(typeof v.value==='number')check(Number.isFinite(v.value),id+' finite values');}
 check(!m.calculate({}).valid,id+' empty validation');
 const key=m.fields.find(f=>f.type==='number').key;
 for(const bad of [NaN,Infinity,-Infinity,Number.MAX_VALUE])check(!m.calculate({...i,[key]:bad}).valid,id+' numeric validation');
}
{
const m=models.gas,i=defaults(m),r=m.calculate(i);near(r.pressure,i.moles*.08205736608096*i.temperature/i.volume);near(m.sample(i,r,0).pressure*2,r.pressure);near(m.calculate({...i,temperature:i.temperature*2}).pressure,r.pressure*2);
for(let j=0;j<=20;j++){const s=m.sample(i,r,j/20);near(s.pressure*s.volume,i.moles*.08205736608096*i.temperature);}
}
{
const m=models.imf,i=defaults(m);for(const kind of ['dispersion','dipole','hydrogen'])check(m.calculate({...i,kind}).valid);check(!m.calculate({...i,kind:'ionic'}).valid);
}
{
const m=models.solution,i={salt:'NaCl',mass:50,water:.1,temperature:20},r=m.calculate(i);near(r.capacity,36);near(r.dissolved,36);near(r.excess,14);near(r.ppm,36/136*1e6);near(r.molarity,36/58.44277/.1);
const warm=m.calculate({salt:'KNO3',mass:100,water:.1,temperature:60});near(warm.capacity,110);near(warm.dissolved,100);near(warm.excess,0);
const between=m.calculate({salt:'KNO3',mass:100,water:.1,temperature:30});near(between.solubility,(31.6+63.9)/2);
for(let j=0;j<=10;j++){const s=m.sample(i,r,j/10);near(s.dissolved+s.undissolved,i.mass);check(s.dissolved<=r.capacity);}
const zero=m.calculate({...i,mass:0});near(zero.ppm,0);near(zero.molarity,0);
}
{
const m=models.vapor,i={temperature:25,fraction:1},r=m.calculate(i);check(r.pure>23.6&&r.pure<23.9,'Water vapor pressure near23.76mmHg at25C');near(m.calculate({...i,fraction:.6}).pressure,.6*r.pure);near(m.calculate({...i,fraction:0}).pressure,0);check(m.calculate({...i,temperature:50}).pure>r.pure);
}
{
const m=models.stoichiometry,r=m.calculate({hydrogen:6,oxygen:2,yield:80});near(r.theoretical,4);near(r.recovered,3.2);near(r.remainingHydrogen,2);near(r.remainingOxygen,0);
for(let h=0;h<=12;h++)for(let o=0;o<=12;o++){if(h+o===0)continue;const i={hydrogen:h,oxygen:o,yield:75},r=m.calculate(i);check(r.valid);near(r.remainingHydrogen+r.theoretical,h);near(2*r.remainingOxygen+r.theoretical,2*o);for(const p of [0,.25,.5,1]){const s=m.sample(i,r,p);near(s.hydrogen+s.water,h);near(2*s.oxygen+s.water,2*o);}}
check(!m.calculate({hydrogen:1.5,oxygen:2,yield:100}).valid,'whole molar icon amounts');
}
{
const m=models.titration,i={acid:.1,acidVolume:25,base:.1,added:50},r=m.calculate(i);near(r.equivalence,25);near(m.sample(i,r,0).pH,1,1e-10);near(m.sample(i,r,.5).pH,7,1e-9);check(m.sample(i,r,1).pH>12&&m.sample(i,r,1).pH<13);
let prev=-Infinity;for(let j=0;j<=200;j++){const ph=m.sample(i,r,j/200).pH;check(ph>=prev-1e-10,'monotonic titration');prev=ph;}
for(const added of [24.99999,25,25.00001]){const z={...i,added},end=m.calculate(z).end;check(Number.isFinite(end.pH));near(end.pH+end.pOH,14);near(end.hydrogen-1e-14/end.hydrogen,end.excess,1e-8);}
}
{
const m=models.kinetics;for(const order of ['0','1','2']){const i={order,initial:2,rate:.1,time:40},r=m.calculate(i);const half=m.sample({...i,time:r.halfLife},r,1);near(half.concentration,1);let prev=Infinity;for(let j=0;j<=100;j++){const s=m.sample(i,r,j/100);check(s.concentration>=0&&s.concentration<=prev);prev=s.concentration;}}
near(m.calculate({order:'0',initial:1,rate:1,time:2}).end.concentration,0);
near(m.calculate({order:'1',initial:1,rate:.1,time:10}).end.concentration,Math.exp(-1));
near(m.calculate({order:'2',initial:1,rate:.1,time:10}).end.concentration,.5);
}
{
const m=models.arrhenius,i={temperature:300,activation:50,prefactor:1e12},r=m.calculate(i);near(r.rate,1e12*Math.exp(-50000/(8.31446261815324*300)));check(m.calculate({...i,temperature:400}).rate>r.rate);check(m.calculate({...i,activation:60}).rate<r.rate);near(m.calculate({...i,activation:0}).rate,i.prefactor);near(m.calculate({...i,prefactor:i.prefactor*2}).rate,2*r.rate);
}
console.log(`PASS: ${Object.keys(models).length} chemistry reaction/property models; ${assertions} assertions (gas invariants, solubility, Raoult, atom balance, titration neutrality, rate laws and Arrhenius).`);
