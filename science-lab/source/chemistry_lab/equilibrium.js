/* Orbit Chemistry: thermodynamics, equilibrium, acid-base and electrochemistry models. */
(function (root) {
  'use strict';
  const R = 8.314462618, F = 96485.33212, KW = 1e-14;
  const C = {ink:'#183449', muted:'#647586', blue:'#5c82ca', pale:'#e7eefb', orange:'#d7945e', green:'#50a58e', pink:'#b67ab1', line:'#cbd7df'};
  const fmt = value => !Number.isFinite(value) ? '—' : (Math.abs(value) >= 1e5 || (Math.abs(value) > 0 && Math.abs(value) < .001)) ? value.toExponential(3) : Number(value.toFixed(4)).toLocaleString('en-US');
  const field = (key,label,unit,value,min,max,step) => ({key,label,unit,type:'number',value,min,max,step});
  const select = (key,label,value,options) => ({key,label,type:'select',value,options:options.map(x => ({value:x[0],label:x[1]}))});
  const value = (label, v, unit) => ({label,value:v,unit:unit || ''});
  const invalid = error => ({valid:false,error});
  function check(o, spec) {
    if (!o) return 'Enter a value in every field.';
    for (const [key, low, high] of spec) {
      if (typeof o[key] !== 'number' || !Number.isFinite(o[key]) || o[key] < low || o[key] > high) return key + ' must be between ' + low + ' and ' + high + '.';
    }
    return '';
  }
  function result(data, values) {
    if (Object.values(data).some(x => typeof x === 'number' && !Number.isFinite(x))) return invalid('These values exceed the supported numerical range.');
    return Object.assign({valid:true,values},data);
  }
  const circleParticles = (h, count, box, p, color, radius, seed) => {
    for (let j=0;j<count;j++) {
      const x=box.x+12+(Math.sin((j+1)*2.399+seed)*.5+.5)*(box.w-24);
      const y=box.y+12+((j*.618+p*.33+Math.sin(j+seed)*.12)%1+1)%1*(box.h-24);
      h.circle(x+Math.sin(p*6.283+j)*4,y,radius || 6,color);
    }
  };
  function flask(h,x,y,w,height,fill) {
    h.rect(x,y,w,height,fill || '#f1f5fa',16);
    h.line(x,y,x,y+height,C.line,3); h.line(x+w,y,x+w,y+height,C.line,3); h.line(x,y+height,x+w,y+height,C.line,3);
  }
  function arrow(h,x1,y1,x2,y2,color) {
    const dx=x2-x1,dy=y2-y1,angle=Math.atan2(dy,dx);
    h.line(x1,y1,x2,y2,color,3);
    h.line(x2,y2,x2-9*Math.cos(angle-.5),y2-9*Math.sin(angle-.5),color,3);
    h.line(x2,y2,x2-9*Math.cos(angle+.5),y2-9*Math.sin(angle+.5),color,3);
  }
  const models = {};
  models.calorimetry = {
    title:'Heat transfer & calorimetry', duration:6,
    note:'The system is liquid water. Positive q adds heat to the water; negative q removes it. Constant specific heat, no heat loss and no phase change are assumed. Keep both temperatures between 0 and 100 °C.',
    fields:[field('mass','Water mass','g',100,1,1000,1),field('specificHeat','Specific heat','J/(g·K)',4.184,.1,10,.001),field('initialTemperature','Initial temperature','°C',20,0,100,1),field('heat','Heat added to water','J',5000,-50000,50000,100)],
    calculate(o) {
      const e=check(o,[['mass',1,1000],['specificHeat',.1,10],['initialTemperature',0,100],['heat',-50000,50000]]); if(e)return invalid(e);
      const deltaTemperature=o.heat/(o.mass*o.specificHeat),finalTemperature=o.initialTemperature+deltaTemperature;
      if(finalTemperature<0||finalTemperature>100)return invalid('This liquid-water model excludes phase changes. Adjust the heat so the final temperature is between 0 and 100 °C.');
      return result({deltaTemperature,finalTemperature},[value('Final water temperature',finalTemperature,'°C'),value('Temperature change',deltaTemperature,'K'),value('Heat for water',o.heat,'J'),value('Water process',o.heat>0?'Endothermic':o.heat<0?'Exothermic':'No net heat')]);
    },
    sample(o,r,p) { const temperature=o.initialTemperature+r.deltaTemperature*p; return {temperature,heat:o.heat*p,values:[value('Water temperature now',temperature,'°C'),value('Heat transferred',o.heat*p,'J')]}; },
    draw(svg,o,r,s,p,h) {
      h.text(360,35,'Water is the system',19,C.ink,'middle');
      flask(h,145,112,255,180,'#e3edf9');
      circleParticles(h,28,{x:152,y:120,w:240,h:160},p*(.25+s.temperature/60),C.blue,6,1);
      h.rect(460,83,42,206,'#e8edef',20);h.rect(472,98+(100-s.temperature)*1.62,18,s.temperature*1.62+15,C.orange,9);h.circle(481,287,23,C.orange);
      [0,25,50,75,100].forEach(t=>{const y=275-t*1.62;h.line(506,y,515,y,C.muted,1);h.text(524,y+4,t+' °C',12,C.muted);});
      h.text(270,92,fmt(s.temperature)+' °C',24,C.ink,'middle');
      if(o.heat>0)arrow(h,62,209,128,209,C.orange);else if(o.heat<0)arrow(h,128,209,62,209,C.blue);
      h.text(84,247,o.heat>0?'heat in':o.heat<0?'heat out':'no heat',12,C.muted,'middle');
      h.text(360,337,'q = mcΔT   ·   Transferred '+fmt(s.heat)+' J',15,C.ink,'middle');
    }
  };
  models.gibbs = {
    title:'Entropy & Gibbs free energy',duration:6,
    note:'ΔG° = ΔH° − TΔS° uses constant standard enthalpy and entropy at the chosen temperature. A negative ΔG° favours products under standard conditions; it does not determine reaction speed. The moving marker traces a reaction coordinate, not time.',
    fields:[field('enthalpy','Standard enthalpy ΔH°','kJ/mol',-40,-200,200,1),field('entropy','Standard entropy ΔS°','J/(mol·K)',-80,-500,500,1),field('temperature','Temperature','K',298.15,100,1500,1)],
    calculate(o) {
      const e=check(o,[['enthalpy',-200,200],['entropy',-500,500],['temperature',100,1500]]);if(e)return invalid(e);
      const entropyTerm=o.temperature*o.entropy/1000,deltaG=o.enthalpy-entropyTerm;
      return result({entropyTerm,deltaG},[value('Standard Gibbs energy ΔG°',deltaG,'kJ/mol'),value('TΔS°',entropyTerm,'kJ/mol'),value('Standard forward direction',Math.abs(deltaG)<1e-9?'At equilibrium':deltaG<0?'Thermodynamically favoured':'Not thermodynamically favoured')]);
    },
    draw(svg,o,r,s,p,h) {
      const scale=95/Math.max(1,Math.abs(r.deltaG)),startY=175,endY=startY-r.deltaG*scale;
      h.text(360,33,'Standard-state energy comparison',19,C.ink,'middle');
      h.line(72,65,72,285,C.line,2);h.line(72,285,654,285,C.line,2);
      h.text(363,321,'Reaction coordinate (not a kinetic prediction)',13,C.muted,'middle');
      h.text(34,177,'G°',17,C.muted,'middle');
      h.line(125,startY,248,startY,C.blue,5);h.line(488,endY,615,endY,C.green,5);
      h.path('M248 '+startY+' C330 '+startY+' 402 '+endY+' 488 '+endY,{fill:'none',stroke:C.pink,'stroke-width':3,'stroke-dasharray':'6 6'});
      const u=p,blend=u*u*(3-2*u),x=248+240*u,y=startY+(endY-startY)*blend;h.circle(x,y,9,C.orange);
      h.text(185,startY+29,'Reactants',13,C.muted,'middle');h.text(551,endY+29,'Products',13,C.muted,'middle');
      arrow(h,653,startY,653,endY===startY?endY+.1:endY,C.pink);
      h.text(360,68,'ΔG° = '+fmt(r.deltaG)+' kJ/mol',22,C.ink,'middle');
      h.text(360,348,'No activation barrier or reaction rate is inferred from this diagram.',12,C.muted,'middle');
    }
  };
  models.equilibrium = {
    title:'Reversible reactions & equilibrium',duration:6,
    note:'A ⇌ B follows elementary first-order forward and reverse rate laws in a closed, constant-volume system. The playback spans the selected model time. At equilibrium the forward and reverse rates are equal; molecules continue reacting.',
    fields:[field('forwardRate','Forward rate constant','s⁻¹',.35,.001,5,.01),field('reverseRate','Reverse rate constant','s⁻¹',.15,.001,5,.01),field('initialA','Initial [A]','mol/L',1,0,5,.1),field('initialB','Initial [B]','mol/L',0,0,5,.1),field('time','Model duration','s',20,1,120,1)],
    calculate(o) {
      const e=check(o,[['forwardRate',.001,5],['reverseRate',.001,5],['initialA',0,5],['initialB',0,5],['time',1,120]]);if(e)return invalid(e);
      const total=o.initialA+o.initialB;if(total<=0)return invalid('Add some A or B before starting the reversible reaction.');
      const equilibriumA=o.reverseRate/(o.forwardRate+o.reverseRate)*total,equilibriumB=total-equilibriumA,Kc=o.forwardRate/o.reverseRate;
      return result({total,equilibriumA,equilibriumB,Kc},[value('Equilibrium constant Kc',Kc),value('Equilibrium [A]',equilibriumA,'mol/L'),value('Equilibrium [B]',equilibriumB,'mol/L'),value('Equal equilibrium rates',o.forwardRate*equilibriumA,'mol/(L·s)')]);
    },
    sample(o,r,p) { const time=o.time*p,A=r.equilibriumA+(o.initialA-r.equilibriumA)*Math.exp(-(o.forwardRate+o.reverseRate)*time),B=r.total-A;return {time,A,B,forwardRate:o.forwardRate*A,reverseRate:o.reverseRate*B,values:[value('Model time',time,'s'),value('[A] now',A,'mol/L'),value('[B] now',B,'mol/L'),value('Forward rate',o.forwardRate*A,'mol/(L·s)'),value('Reverse rate',o.reverseRate*B,'mol/(L·s)')]}; },
    draw(svg,o,r,s,p,h) {
      h.text(360,34,'A  ⇌  B     ·     t = '+fmt(s.time)+' s',20,C.ink,'middle');
      flask(h,38,75,335,220,'#eff3fa');
      const nA=Math.round(36*s.A/r.total);
      for(let j=0;j<36;j++){const x=64+(j%6)*53+Math.sin(p*6.283+j)*7,y=99+Math.floor(j/6)*33+Math.cos(p*6.283+j*2)*5;h.circle(x,y,9,j<nA?C.blue:C.orange);}
      h.circle(75,325,6,C.blue);h.text(91,330,'A',13,C.muted);h.circle(155,325,6,C.orange);h.text(171,330,'B',13,C.muted);h.text(259,330,'Representative particles',11,C.muted,'middle');
      const x0=424,y0=268,w=250,height=157,maxC=r.total;
      h.line(x0,83,x0,y0,C.line,2);h.line(x0,y0,x0+w,y0,C.line,2);
      ['A','B'].forEach((species,index)=>{let d='';for(let j=0;j<=50;j++){const point=models.equilibrium.sample(o,r,j/50),x=x0+w*j/50,y=y0-height*point[species]/maxC;d+=(j?' L':'M')+x+' '+y;}h.path(d,{fill:'none',stroke:index?C.orange:C.blue,'stroke-width':3});});
      h.line(x0+w*p,90,x0+w*p,y0,C.pink,1);h.text(550,304,'Concentration versus model time',12,C.muted,'middle');
      h.text(550,330,'Rates: '+fmt(s.forwardRate)+' / '+fmt(s.reverseRate),12,C.ink,'middle');
    }
  };
  models.gasEquilibrium = {
    title:'Le Châtelier’s principle & gas equilibrium',duration:6,
    note:'For N₂O₄(g) ⇌ 2 NO₂(g), Kc is modelled from Kc = 0.100 at 298.15 K and constant ΔH° = +57.0 kJ/mol using van ’t Hoff’s equation. The vessel starts with pure N₂O₄. The colour change illustrates approach to equilibrium; no kinetic rate is predicted. Kp/Kc uses R = 0.082057 L·atm/(mol·K).',
    fields:[field('initialConcentration','Initial N₂O₄ at reference volume','mol/L',.5,.01,3,.01),field('volumeRatio','Volume / reference volume','',1,.25,4,.05),field('temperature','Temperature','K',298.15,250,400,1)],
    calculate(o) {
      const e=check(o,[['initialConcentration',.01,3],['volumeRatio',.25,4],['temperature',250,400]]);if(e)return invalid(e);
      const Kc=.1*Math.exp(-57000/R*(1/o.temperature-1/298.15)),concentration=o.initialConcentration/o.volumeRatio;
      const extent=2*Kc*concentration/(Math.sqrt(Kc*Kc+16*Kc*concentration)+Kc),N2O4=concentration-extent,NO2=2*extent,Kp=Kc*.082057366*o.temperature;
      return result({Kc,Kp,concentration,extent,N2O4,NO2,dissociationFraction:extent/concentration},[value('Kc at this temperature',Kc),value('Kp at this temperature',Kp),value('Equilibrium [N₂O₄]',N2O4,'mol/L'),value('Equilibrium [NO₂]',NO2,'mol/L'),value('N₂O₄ dissociated',extent/concentration*100,'%')]);
    },
    sample(o,r,p){const extent=r.extent*p;return {N2O4:r.concentration-extent,NO2:2*extent,dissociationFraction:extent/r.concentration,values:[value('[N₂O₄] in illustrated mixture',r.concentration-extent,'mol/L'),value('[NO₂] in illustrated mixture',2*extent,'mol/L')]};},
    draw(svg,o,r,s,p,h){
      h.text(360,33,'N₂O₄(g)  ⇌  2 NO₂(g)',21,C.ink,'middle');
      const width=225+55*Math.log2(o.volumeRatio),x=282-width/2;
      flask(h,x,79,width,219,'#f7eee9');
      h.el('rect',{x:x+3,y:82,width:width-6,height:213,rx:14,fill:'#b76f48','fill-opacity':Math.min(.5,s.NO2/(s.NO2+s.N2O4)*.5)});
      const split=Math.round(s.dissociationFraction*20);
      for(let j=0;j<20;j++){
        const xx=x+23+(j%5)*(width-46)/4+Math.sin(p*6.283+j)*3,yy=104+Math.floor(j/5)*53+Math.cos(p*6.283+j)*5;
        if(j<split){h.circle(xx-9,yy-6,7,C.orange);h.circle(xx+9,yy+8,7,C.orange);}else{h.circle(xx-5,yy,7,C.blue);h.circle(xx+6,yy,7,C.blue);h.line(xx-4,yy,xx+5,yy,C.blue,3);}
      }
      h.text(282,328,'Volume × '+fmt(o.volumeRatio),14,C.muted,'middle');
      h.text(528,117,fmt(o.temperature)+' K',25,C.ink,'middle');h.text(528,156,'Kc = '+fmt(r.Kc),18,C.ink,'middle');
      h.circle(466,203,7,C.blue);h.circle(476,203,7,C.blue);h.text(499,209,'N₂O₄',14,C.muted);
      h.circle(472,243,7,C.orange);h.text(499,249,'NO₂ (brown)',14,C.muted);
      h.text(360,354,'Representative molecules · colour intensity is illustrative',11,C.muted,'middle');
    }
  };
  function acidIon(concentration,constant){
    let low=1e-16,high=concentration+1;
    for(let i=0;i<160;i++){const mid=(low+high)/2,v=mid-KW/mid-concentration*constant/(constant+mid);if(v>0)high=mid;else low=mid;}
    return (low+high)/2;
  }
  models.acidbase = {
    title:'Strong & weak acids and bases',duration:6,
    note:'A monoprotic acid or monobasic base at 25 °C is modelled with ideal concentrations and Kw = 1.00 × 10⁻¹⁴. Weak-solution pH uses mass balance and charge balance including water autoionisation. Particle counts and indicator-style colour are representative.',
    fields:[select('kind','Solution type','weakAcid',[['strongAcid','Strong acid'],['weakAcid','Weak acid'],['strongBase','Strong base'],['weakBase','Weak base']]),field('concentration','Analytical concentration','mol/L',.1,1e-9,1,.001),field('constant','Ka for acid / Kb for base','',1.8e-5,1e-12,1,.00001)],
    calculate(o){
      if(!['strongAcid','weakAcid','strongBase','weakBase'].includes(o&&o.kind))return invalid('Choose a solution type.');
      const e=check(o,[['concentration',1e-9,1],['constant',1e-12,1]]);if(e)return invalid(e);
      const basic=o.kind.endsWith('Base'),weak=o.kind.startsWith('weak');
      const dominant=weak?acidIon(o.concentration,o.constant):(o.concentration+Math.sqrt(o.concentration*o.concentration+4*KW))/2;
      const hydrogen=basic?KW/dominant:dominant,hydroxide=KW/hydrogen,pH=-Math.log10(hydrogen),pOH=-Math.log10(hydroxide);
      const dissociation=weak?o.constant/(o.constant+dominant):1;
      return result({basic,weak,hydrogen,hydroxide,pH,pOH,dissociation},[value('pH',pH),value('pOH',pOH),value('[H₃O⁺]',hydrogen,'mol/L'),value('[OH⁻]',hydroxide,'mol/L'),value('Solute ionised',dissociation*100,'%')]);
    },
    draw(svg,o,r,s,p,h){
      h.text(360,34,'Ionisation at equilibrium · 25 °C',19,C.ink,'middle');
      const hue=Math.max(0,Math.min(280,r.pH*20)),color='hsl('+hue+' 55% 82%)';flask(h,74,94,360,212,color);
      const free=Math.round(r.dissociation*28);
      for(let j=0;j<28;j++){const xx=100+(j%7)*47+Math.sin(p*6.283+j)*5,yy=121+Math.floor(j/7)*49+Math.cos(p*6.283+j)*5;h.circle(xx,yy,8,j<free?C.orange:C.blue);if(j>=free)h.circle(xx+10,yy,4,C.pink);}
      h.text(550,120,'pH '+fmt(r.pH),30,C.ink,'middle');h.text(550,160,r.basic?'Basic solution':'Acidic solution',16,C.muted,'middle');
      h.circle(481,210,7,C.orange);h.text(500,215,'Ionised solute',13,C.muted);h.circle(481,246,7,C.blue);h.circle(490,246,4,C.pink);h.text(510,251,'Unionised solute',13,C.muted);
      for(let j=0;j<14;j++)h.rect(84+j*40,326,40,9,'hsl('+(j*20)+' 55% 65%)',0);
      const pointer=84+Math.max(0,Math.min(14,r.pH))/14*560;h.line(pointer,318,pointer,343,C.ink,3);
      h.text(84,356,'0',11,C.muted,'middle');h.text(364,356,'7',11,C.muted,'middle');h.text(644,356,'14',11,C.muted,'middle');
    }
  };
  models.buffer = {
    title:'Buffers & added acid or base',duration:6,
    note:'This HA/A⁻ buffer uses Henderson–Hasselbalch after quantitative neutralisation of added strong acid (+ mol) or strong base (− mol). Added volume is neglected. The approximation works best with appreciable concentrations and 0.1 ≤ [A⁻]/[HA] ≤ 10; it is not a full charge-balance solver.',
    fields:[field('acidMoles','Initial weak acid HA','mol',.1,.001,1,.01),field('baseMoles','Initial conjugate base A⁻','mol',.1,.001,1,.01),field('volume','Buffer volume','L',1,.1,10,.1),field('pKa','Weak acid pKa','',4.76,1,13,.01),field('addition','Strong acid (+) / base (−)','mol',.025,-.5,.5,.005)],
    calculate(o){
      const e=check(o,[['acidMoles',.001,1],['baseMoles',.001,1],['volume',.1,10],['pKa',1,13],['addition',-.5,.5]]);if(e)return invalid(e);
      const acid=o.acidMoles+o.addition,base=o.baseMoles-o.addition;
      if(acid<=0||base<=0)return invalid('This addition exhausts a buffer component. Reduce it so both HA and A⁻ remain; Henderson–Hasselbalch no longer applies once either is exhausted.');
      const ratio=base/acid,pH=o.pKa+Math.log10(ratio),useful=ratio>=.1&&ratio<=10;
      return result({acid,base,ratio,pH,useful},[value('Final approximate pH',pH),value('Final [HA]',acid/o.volume,'mol/L'),value('Final [A⁻]',base/o.volume,'mol/L'),value('Ratio [A⁻]/[HA]',ratio),value('Usual useful ratio band',useful?'Within 0.1–10':'Outside 0.1–10')]);
    },
    sample(o,r,p){const acid=o.acidMoles+o.addition*p,base=o.baseMoles-o.addition*p,pH=o.pKa+Math.log10(base/acid);return{acid,base,pH,addition:o.addition*p,values:[value('Approximate pH now',pH),value('Strong acid (+) / base (−) added',o.addition*p,'mol')]};},
    draw(svg,o,r,s,p,h){
      h.text(360,34,'HA ⇌ H⁺ + A⁻',21,C.ink,'middle');flask(h,76,96,365,205,'#edf0fb');
      const acidCount=Math.round(32*s.acid/(s.acid+s.base));
      for(let j=0;j<32;j++){const x=103+(j%8)*42+Math.sin(p*6.283+j)*4,y=124+Math.floor(j/8)*48+Math.cos(p*6.283+j)*4;h.circle(x,y,8,j<acidCount?C.blue:C.orange);if(j<acidCount)h.circle(x+9,y-4,4,C.pink);}
      h.text(558,124,'pH ≈ '+fmt(s.pH),25,C.ink,'middle');h.text(558,168,'pKa '+fmt(o.pKa),16,C.muted,'middle');
      h.rect(481,203,153*s.acid/(s.acid+s.base),18,C.blue,8);h.rect(481,234,153*s.base/(s.acid+s.base),18,C.orange,8);h.text(643,217,'HA',12,C.muted);h.text(643,248,'A⁻',12,C.muted);
      if(o.addition!==0){h.circle(258,67+(p*3%1)*31,5,o.addition>0?C.pink:C.green);h.text(258,70,o.addition>0?'H⁺ added':'OH⁻ added',13,C.muted,'middle');}
      h.text(360,334,'HA '+fmt(s.acid)+' mol   ·   A⁻ '+fmt(s.base)+' mol',15,C.ink,'middle');
    }
  };
  models.galvanic = {
    title:'Galvanic cells & the Nernst equation',duration:6,
    note:'Daniell cell: Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s), n = 2, E° = 1.10 V at 298.15 K. E = E° − RT/(nF) ln Q with ideal ion activities. Concentrations are fixed for this calculation; particle flow and electrode size changes are illustrative.',
    fields:[field('zincConcentration','Zn²⁺ concentration','mol/L',1,1e-6,5,.01),field('copperConcentration','Cu²⁺ concentration','mol/L',1,1e-6,5,.01)],
    calculate(o){const e=check(o,[['zincConcentration',1e-6,5],['copperConcentration',1e-6,5]]);if(e)return invalid(e);const quotient=o.zincConcentration/o.copperConcentration,potential=1.1-R*298.15/(2*F)*Math.log(quotient),deltaG=-2*F*potential/1000;return result({quotient,potential,deltaG},[value('Cell potential',potential,'V'),value('Reaction quotient Q',quotient),value('Reaction ΔG',deltaG,'kJ/mol'),value('Forward electron flow',potential>0?'Zn → Cu':potential<0?'Reverse direction favoured':'No net flow')]);},
    draw(svg,o,r,s,p,h){
      h.text(360,29,'Daniell cell · 298.15 K',20,C.ink,'middle');flask(h,67,151,239,153,'#eef1f6');flask(h,414,151,239,153,'#e3eefb');
      h.rect(112,127,35-9*p,149,'#9da9b7',3);h.rect(568-7*p,127,33+7*p,149,'#c58f67',3);
      h.path('M130 126 V72 H588 V126',{fill:'none',stroke:C.ink,'stroke-width':3});h.rect(305,48,110,48,'#f3eafa',12);h.text(360,78,fmt(r.potential)+' V',17,C.ink,'middle');
      h.path('M257 190 V119 Q257 103 273 103 H447 Q463 103 463 119 V190',{fill:'none',stroke:'#aebbc9','stroke-width':14});h.text(360,128,'Salt bridge',11,C.muted,'middle');
      const flow=r.potential>0?p:r.potential<0?1-p:0;if(Math.abs(r.potential)>1e-10){for(let j=0;j<5;j++){const x=144+((flow+j/5)%1)*431;h.circle(x,72,4,C.blue);}arrow(h,r.potential>0?196:502,52,r.potential>0?245:453,52,C.blue);}
      circleParticles(h,12,{x:153,y:173,w:133,h:103},p,C.muted,5,2);circleParticles(h,12,{x:434,y:173,w:110,h:103},p,C.blue,5,3);
      h.text(181,330,'Zn · anode (oxidation)',13,C.ink,'middle');h.text(539,330,'Cu · cathode (reduction)',13,C.ink,'middle');h.text(360,353,'Electrons through wire · ions through salt bridge',11,C.muted,'middle');
    }
  };
  models.electrolysis = {
    title:'Electrolysis & Faraday’s law',duration:6,
    note:'Copper deposition at the cathode: Cu²⁺ + 2 e⁻ → Cu(s). Copper ions are in excess. The efficiency specifies the fraction of charge depositing copper; other electrode reactions and concentration changes are not modelled. Electrode sizes are illustrative.',
    fields:[field('current','Current','A',2,0,10,.1),field('time','Electrolysis time','s',600,0,7200,10),field('efficiency','Copper deposition efficiency','%',100,0,100,1)],
    calculate(o){const e=check(o,[['current',0,10],['time',0,7200],['efficiency',0,100]]);if(e)return invalid(e);const charge=o.current*o.time,electronMoles=charge/F,copperMoles=electronMoles/2*o.efficiency/100,mass=copperMoles*63.546;return result({charge,electronMoles,copperMoles,mass},[value('Copper deposited',mass,'g'),value('Copper deposited',copperMoles,'mol'),value('Total charge',charge,'C'),value('Electron transfer',electronMoles,'mol e⁻')]);},
    sample(o,r,p){return {time:o.time*p,charge:r.charge*p,mass:r.mass*p,values:[value('Elapsed model time',o.time*p,'s'),value('Copper deposited now',r.mass*p,'g'),value('Charge passed',r.charge*p,'C')]};},
    draw(svg,o,r,s,p,h){
      h.text(360,29,'Cu²⁺ + 2 e⁻ → Cu(s)',21,C.ink,'middle');flask(h,112,152,496,152,'#e5effb');
      h.rect(185,125,24,150,'#9da9b7',3);h.rect(506,125,24,150,'#9da9b7',3);
      const thickness=r.mass>0?18*p:0;if(thickness)h.rect(506-thickness,139,thickness,136,'#c58f67',2);
      h.path('M197 125 V75 H518 V125',{fill:'none',stroke:C.ink,'stroke-width':3});h.rect(294,49,128,48,'#f2eaf8',12);h.text(358,69,'DC power supply',11,C.muted,'middle');h.text(316,89,'+',17,C.ink);h.text(389,89,'−',18,C.ink);
      if(r.charge>0){for(let j=0;j<4;j++){const x=428+((p+j/4)%1)*78;h.circle(x,75,4,C.blue);}}
      for(let j=0;j<18;j++){const x=238+((j*37+115*p)%240),y=176+(j%4)*30+Math.sin(p*6.283+j)*4;h.circle(x,y,7,C.blue);}
      h.text(197,329,'Anode (+)',13,C.ink,'middle');h.text(518,329,'Cathode (−)',13,C.ink,'middle');
      h.text(358,121,'t = '+fmt(s.time)+' s',14,C.muted,'middle');h.text(359,353,'Deposited copper: '+fmt(s.mass)+' g  ·  Charge: '+fmt(s.charge)+' C',14,C.ink,'middle');
    }
  };
  if(typeof module==='object' && module.exports)module.exports=models;
  if(root)Object.assign(root.ChemistryModels||(root.ChemistryModels={}),models);
})(typeof window==='object'?window:null);
