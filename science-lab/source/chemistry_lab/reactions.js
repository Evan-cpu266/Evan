/* Orbit Chemistry: solution, gas, reaction and kinetic models. */
(function (root) {
  'use strict';
  const R = 8.31446261815324, RL = 0.08205736608096, NA = 6.02214076e23;
  const C = {ink:'#24334e',muted:'#647089',blue:'#5689c9',cyan:'#63bdcf',purple:'#9274c5',orange:'#dc9d55',red:'#cf747c',green:'#68a996',light:'#edf1f9'};
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const bounded = (n,a,b) => finite(n) && n >= a && n <= b;
  const fail = error => ({valid:false,error});
  const ok = data => Object.assign({valid:true},data);
  const value = (label,n,unit) => ({label,value:n,unit:unit||''});
  const field = (key,label,unit,n,min,max,step) => ({key,label,unit,type:'number',value:n,min,max,step:step===undefined?0.1:step});
  const select = (key,label,n,options) => ({key,label,type:'select',value:n,options:options.map(x=>({value:String(x[0]),label:x[1]}))});
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const fmt = n => !finite(n)?'—':n===0?'0':Math.abs(n)>=1e5||Math.abs(n)<.001?n.toExponential(2):String(Number(n.toFixed(3)));
  const tri = n => {const x=((n%2)+2)%2;return x<=1?x:2-x;};
  function linePath(points){return points.map((a,j)=>(j?'L':'M')+a[0]+','+a[1]).join(' ');}
  function heading(h,title,caption){h.text(30,30,title,17,C.ink);if(caption)h.text(30,51,caption,11,C.muted);}
  function bar(h,x,y,w,v,color){h.rect(x,y,w,12,'#e1e7f1',6);h.rect(x,y,Math.max(0,w*clamp(v,0,1)),12,color,6);}
  function molecule(h,x,y,label,color,r){h.atom(x,y,label,color,r||16);}
  const models = {};

  models.gas = {
    title:'Ideal gas piston',duration:6,
    note:'An ideal gas is compressed isothermally from twice the selected final volume to that volume. Particles are representative; piston travel is illustrative. Pressure follows PV = nRT throughout.',
    fields:[field('moles','Amount of gas','mol',.1,.001,1,.01),field('temperature','Temperature','K',300,150,800,10),field('volume','Final volume','L',5,.5,20,.5)],
    calculate(i){
      if(!i||!bounded(i.moles,.001,1)||!bounded(i.temperature,150,800)||!bounded(i.volume,.5,20))return fail('Use 0.001–1 mol, 150–800 K and 0.5–20 L.');
      return ok({pressure:i.moles*RL*i.temperature/i.volume,initialVolume:2*i.volume,values:[value('Final pressure',i.moles*RL*i.temperature/i.volume,'atm'),value('Final volume',i.volume,'L'),value('Amount',i.moles,'mol')]});
    },
    sample(i,r,p){const volume=i.volume*(2-clamp(p,0,1));const pressure=i.moles*RL*i.temperature/volume;return {volume,pressure,values:[value('Current pressure',pressure,'atm'),value('Current volume',volume,'L'),value('Temperature',i.temperature,'K')]};},
    draw(svg,i,r,s,p,h){
      heading(h,'Isothermal compression','Fixed amount and temperature · ideal, non-interacting particles');
      const left=55,top=82,height=210,width=360*(2-p)/2;
      h.rect(left,top,360,height,'#f3f6fc',12);h.rect(left,top,width,height,'#e7f0fb',10);
      h.line(left,top,left,top+height,C.ink,3);h.line(left,top+height,left+width,top+height,C.ink,3);h.line(left,top,left+width,top,C.ink,3);
      h.rect(left+width-7,top,14,height,C.purple,4);h.line(left+width,187,460,187,C.purple,5);
      const count=8+Math.round(i.moles*32),speed=Math.sqrt(i.temperature/300);
      for(let j=0;j<count;j++){const x=left+14+tri(j*.618+p*speed*(1.8+j%3))*(width-28),y=top+14+tri(j*.372+p*speed*(1.5+j%4))*(height-28);h.circle(x,y,4,C.blue);}
      h.text(510,104,'PRESSURE',11,C.muted);h.text(510,140,fmt(s.pressure)+' atm',26,C.ink);h.text(510,185,'V = '+fmt(s.volume)+' L',17,C.purple);h.text(510,213,'T = '+fmt(i.temperature)+' K',14,C.muted);h.text(510,242,'PV = nRT',20,C.ink);
      h.text(55,325,'Piston width shows current volume relative to the starting volume.',11,C.muted);
    }
  };

  models.imf = {
    title:'Intermolecular attractions',duration:6,
    note:'A qualitative molecular cartoon: attraction and thermal agitation compete. It does not predict a real substance’s phase or boiling point. Relative attraction strengths also depend on molecular size and polarizability. London dispersion forces occur in every species.',
    fields:[select('kind','Dominant attraction','hydrogen',[['dispersion','London dispersion'],['dipole','Dipole–dipole'],['hydrogen','Hydrogen bonding']]),field('agitation','Thermal agitation','relative scale',35,0,100,1)],
    calculate(i){
      const names={dispersion:'London dispersion',dipole:'Dipole–dipole',hydrogen:'Hydrogen bonding'};
      if(!i||!names[i.kind]||!bounded(i.agitation,0,100))return fail('Choose an attraction and agitation from 0 to 100.');
      const descriptions={dispersion:'Temporary fluctuations in electron density.',dipole:'Attraction between permanent molecular dipoles.',hydrogen:'Attraction involving H bonded to N, O or F and a lone pair.'};
      return ok({kind:i.kind,strength:{dispersion:1,dipole:2,hydrogen:3}[i.kind],values:[value('Attraction',names[i.kind]),value('Agitation',i.agitation,'/ 100'),value('Model','Qualitative')],description:descriptions[i.kind]});
    },
    draw(svg,i,r,s,p,h){
      heading(h,r.values[0].value,'Schematic attractions between molecules, not chemical bonds within them');
      const motion=(i.agitation/100),spread=.65+motion*.65;
      const points=[];
      for(let j=0;j<12;j++){const col=j%4,row=Math.floor(j/4);points.push([350+(col-1.5)*100*spread+Math.sin(p*2*Math.PI*(1+j%3)+j)*motion*20,187+(row-1)*66*spread+Math.cos(p*2*Math.PI*(1+j%2)+j)*motion*16]);}
      if(i.agitation<75){for(let j=0;j<11;j++){if(j%4===3)continue;const a=points[j],b=points[j+1];h.el('line',{x1:a[0]+25,y1:a[1],x2:b[0]-25,y2:b[1],stroke:i.kind==='hydrogen'?C.purple:C.cyan,'stroke-width':2,'stroke-dasharray':'4 6',opacity:.7-motion*.5});}}
      points.forEach(([x,y],j)=>{
        if(i.kind==='hydrogen'){h.line(x,y,x-18,y+12,C.muted,2);h.line(x,y,x+18,y+12,C.muted,2);molecule(h,x-18,y+12,'H','#bec9dc',10);molecule(h,x+18,y+12,'H','#bec9dc',10);molecule(h,x,y,'O',C.red,14);}
        else if(i.kind==='dipole'){h.line(x-15,y,x+15,y,C.muted,3);molecule(h,x-15,y,'δ+',C.orange,16);molecule(h,x+15,y,'δ−',C.blue,16);}
        else{molecule(h,x,y,'',C.blue,18);h.el('ellipse',{cx:x+Math.sin(p*8+j)*7,cy:y,rx:26,ry:21,fill:C.cyan,opacity:.2});}
      });
      h.text(30,322,r.description,12,C.muted);h.text(30,344,'Attractions are schematic; thermal agitation is a relative control.',11,C.muted);
    }
  };

  const solubilities={NaCl:{mass:58.44277,table:[35.7,36.0,36.6,37.3,38.4,39.8]},KNO3:{mass:101.1032,table:[13.3,31.6,63.9,110,169,246]}};
  function solubility(salt,t){const a=solubilities[salt].table,n=Math.min(4,Math.floor(t/20));return a[n]+(a[n+1]-a[n])*(t-n*20)/20;}
  models.solution = {
    title:'Dissolving and concentration',duration:6,
    note:'Solubility data are interpolated between tabulated points in g solute per 100 g water. Water is approximated as 1.00 kg/L. Molarity ignores the volume change on dissolving; mass ppm uses dissolved solute divided by total solution mass. Dissolving time is illustrative.',
    fields:[select('salt','Solute','KNO3',[['NaCl','Sodium chloride (NaCl)'],['KNO3','Potassium nitrate (KNO₃)']]),field('mass','Solute added','g',60,0,200,1),field('water','Water volume','L',.1,.05,2,.05),field('temperature','Temperature','°C',20,0,100,5)],
    calculate(i){
      if(!i||!solubilities[i.salt]||!bounded(i.mass,0,200)||!bounded(i.water,.05,2)||!bounded(i.temperature,0,100))return fail('Use 0–200 g solute, 0.05–2 L water and 0–100 °C.');
      const capacity=solubility(i.salt,i.temperature)*10*i.water,dissolved=Math.min(i.mass,capacity),excess=i.mass-dissolved,moles=dissolved/solubilities[i.salt].mass,molarity=moles/i.water,ppm=dissolved/(i.water*1000+dissolved)*1e6;
      return ok({capacity,dissolved,excess,moles,molarity,ppm,solubility:solubility(i.salt,i.temperature),values:[value('Dissolved at equilibrium',dissolved,'g'),value('Undissolved',excess,'g'),value('Approx. molarity',molarity,'mol/L'),value('Solute (mass ppm)',ppm,'ppm')]});
    },
    sample(i,r,p){const dissolved=r.dissolved*p;return {dissolved,undissolved:i.mass-dissolved,molarity:dissolved/solubilities[i.salt].mass/i.water,ppm:dissolved/(i.water*1000+dissolved)*1e6,values:[value('Dissolved',dissolved,'g'),value('Solid remaining',i.mass-dissolved,'g'),value('Approx. molarity',dissolved/solubilities[i.salt].mass/i.water,'mol/L')]};},
    draw(svg,i,r,s,p,h){
      heading(h,'Dissolution and saturation','Representative ions in water · the animation does not model dissolution kinetics');
      h.rect(75,105,300,185,'#e7f2fb',12);h.path('M75 75 V290 Q75 302 87 302 H363 Q375 302 375 290 V75',{fill:'none',stroke:'#9aaec5','stroke-width':3});
      const count=r.dissolved>0?Math.max(0,Math.round(28*p)):0;
      for(let j=0;j<count;j++){const x=94+tri(j*.413+p*.7)*(262),y=120+tri(j*.729+p*.45)*140;molecule(h,x,y,j%2?'+':'−',j%2?C.purple:C.orange,8);}
      const solid=i.mass===0?0:Math.ceil(24*s.undissolved/i.mass);
      for(let j=0;j<solid;j++)h.rect(102+(j%12)*21,279-Math.floor(j/12)*17,15,15,j%2?C.purple:C.orange,2);
      h.text(430,100,i.salt==='NaCl'?'NaCl in water':'KNO₃ in water',21,C.ink);h.text(430,138,fmt(i.temperature)+' °C',17,C.muted);h.text(430,174,fmt(r.solubility)+' g / 100 g water',15,C.purple);
      h.text(430,214,'Dissolved: '+fmt(s.dissolved)+' g',16,C.ink);h.text(430,244,'Solid: '+fmt(s.undissolved)+' g',16,C.ink);
      h.text(430,282,p<1?'Approaching saturation':r.excess>0?'Saturated + excess solid':'All added solid dissolved',13,C.green);
      h.text(75,333,'Ion icons represent many particles. Molarity uses a dilute-volume approximation.',11,C.muted);
    }
  };

  models.vapor = {
    title:'Vapor pressure',duration:6,
    note:'Water vapor pressure uses the Antoine equation from 5 to 95 °C. For an ideal solution with a nonvolatile solute, Raoult’s law gives P = xwater P°water. The particle picture is qualitative and does not model equilibration times.',
    fields:[field('temperature','Temperature','°C',40,5,95,1),field('fraction','Water mole fraction','',1,0,1,.05)],
    calculate(i){
      if(!i||!bounded(i.temperature,5,95)||!bounded(i.fraction,0,1))return fail('Use 5–95 °C and a water mole fraction from 0 to 1.');
      const pure=10**(8.07131-1730.63/(233.426+i.temperature)),pressure=pure*i.fraction;
      return ok({pure,pressure,atm:pressure/760,values:[value('Solution vapor pressure',pressure,'mmHg'),value('Pure-water vapor pressure',pure,'mmHg'),value('Solution vapor pressure',pressure/760,'atm')]});
    },
    draw(svg,i,r,s,p,h){
      heading(h,'Water above an ideal solution','Vapor molecules and liquid are schematic; the pressures are calculated');
      h.rect(70,80,300,222,'#f2f5fa',14);h.rect(70,222,300,80,'#d8eaf8',8);h.rect(70,75,300,12,'#9badc7',3);
      for(let j=0;j<25;j++){const solute=j/25>=i.fraction;h.circle(88+(j%9)*32+Math.sin(p*7+j)*4,240+Math.floor(j/9)*22,5,solute?C.orange:C.blue);}
      const count=Math.round(34*r.pressure/640);
      for(let j=0;j<count;j++)h.circle(85+tri(j*.419+p*(.8+i.temperature/80))*270,99+tri(j*.619+p*(1+i.temperature/100))*105,4,C.blue);
      h.text(425,103,'RAOULT’S LAW',11,C.muted);h.text(425,139,'P = xwater × P°water',21,C.ink);h.text(425,187,fmt(r.pressure)+' mmHg',25,C.purple);h.text(425,224,'xwater = '+fmt(i.fraction),16,C.muted);h.text(425,255,'Pure water: '+fmt(r.pure)+' mmHg',15,C.muted);
      h.text(70,332,'Higher temperature increases vapor pressure; a nonvolatile solute lowers it.',11,C.muted);
    }
  };

  models.stoichiometry = {
    title:'Limiting reactants and yield',duration:6,
    note:'The balanced reaction is 2 H₂ + O₂ → 2 H₂O. Each icon is a molar amount, not one molecule. The animation interpolates reaction extent; it is not a rate prediction. Percent yield describes recovered product after the reaction.',
    fields:[field('hydrogen','Initial hydrogen','mol',6,0,12,1),field('oxygen','Initial oxygen','mol',2,0,12,1),field('yield','Product recovery / yield','%',100,0,100,1)],
    calculate(i){
      if(!i||!bounded(i.hydrogen,0,12)||!Number.isInteger(i.hydrogen)||!bounded(i.oxygen,0,12)||!Number.isInteger(i.oxygen)||i.hydrogen+i.oxygen===0||!bounded(i.yield,0,100))return fail('Use whole-number reactant amounts from 0 to 12 mol, at least one nonzero amount, and a yield from 0 to 100%.');
      const extent=Math.min(i.hydrogen/2,i.oxygen),theoretical=2*extent,recovered=theoretical*i.yield/100,remainingHydrogen=i.hydrogen-2*extent,remainingOxygen=i.oxygen-extent;
      const limiting=i.hydrogen/2<i.oxygen?'Hydrogen (H₂)':i.hydrogen/2>i.oxygen?'Oxygen (O₂)':'Neither: stoichiometric mixture';
      return ok({extent,theoretical,recovered,remainingHydrogen,remainingOxygen,limiting,values:[value('Limiting reactant',limiting),value('Theoretical water',theoretical,'mol'),value('Recovered water',recovered,'mol'),value('Recovered water mass',recovered*18.01528,'g')]});
    },
    sample(i,r,p){const extent=r.extent*p;return {extent,hydrogen:i.hydrogen-2*extent,oxygen:i.oxygen-extent,water:2*extent,recovered:2*extent*i.yield/100,values:[value('Hydrogen remaining',i.hydrogen-2*extent,'mol'),value('Oxygen remaining',i.oxygen-extent,'mol'),value('Water formed',2*extent,'mol'),value('Recoverable water',2*extent*i.yield/100,'mol')]};},
    draw(svg,i,r,s,p,h){
      heading(h,'2 H₂ + O₂ → 2 H₂O','Molar amounts · reaction progress is illustrative');
      h.rect(25,79,210,218,'#edf2fc',14);h.rect(255,79,210,218,'#fbf0ed',14);h.rect(485,79,210,218,'#edf6f2',14);
      h.text(130,106,'H₂: '+fmt(s.hydrogen)+' mol',16,C.ink,'middle');h.text(360,106,'O₂: '+fmt(s.oxygen)+' mol',16,C.ink,'middle');h.text(590,106,'H₂O: '+fmt(s.water)+' mol',16,C.ink,'middle');
      for(let j=0;j<12;j++){
        const x=58+(j%4)*47,y=142+Math.floor(j/4)*55;
        if(j<i.hydrogen){const op=clamp(s.hydrogen-j,0,1);if(op>0){const g=h.el('g',{opacity:op});h.el('line',{x1:x-7,y1:y,x2:x+7,y2:y,stroke:C.muted,'stroke-width':2},undefined,g);h.el('circle',{cx:x-7,cy:y,r:9,fill:C.blue},undefined,g);h.el('circle',{cx:x+7,cy:y,r:9,fill:C.blue},undefined,g);}}
        if(j<i.oxygen){const op=clamp(s.oxygen-j,0,1);if(op>0){const g=h.el('g',{opacity:op});h.el('line',{x1:x+223,y1:y,x2:x+237,y2:y,stroke:C.muted,'stroke-width':2},undefined,g);h.el('circle',{cx:x+223,cy:y,r:10,fill:C.red},undefined,g);h.el('circle',{cx:x+237,cy:y,r:10,fill:C.red},undefined,g);}}
        const waterPerIcon=r.theoretical>12?2:1,water=clamp(s.water/waterPerIcon-j,0,1);if(water>0){const g=h.el('g',{opacity:water});h.el('line',{x1:x+460,y1:y,x2:x+446,y2:y+12,stroke:C.muted,'stroke-width':2},undefined,g);h.el('line',{x1:x+460,y1:y,x2:x+474,y2:y+12,stroke:C.muted,'stroke-width':2},undefined,g);h.el('circle',{cx:x+446,cy:y+12,r:7,fill:C.blue},undefined,g);h.el('circle',{cx:x+474,cy:y+12,r:7,fill:C.blue},undefined,g);h.el('circle',{cx:x+460,cy:y,r:10,fill:C.red},undefined,g);}
      }
      h.text(30,325,'Limiting reactant: '+r.limiting,12,C.muted);h.text(30,346,'Recovered product = '+fmt(r.theoretical)+' mol × '+fmt(i.yield)+'% = '+fmt(r.recovered)+' mol.',12,C.green);
    }
  };

  function titrationAt(i,added){
    const acid=i.acid*i.acidVolume/1000,base=i.base*added/1000,total=(i.acidVolume+added)/1000,excess=(acid-base)/total,Kw=1e-14;
    let hydrogen;if(excess>=0)hydrogen=(excess+Math.hypot(excess,2e-7))/2;else{const hydroxide=(-excess+Math.hypot(excess,2e-7))/2;hydrogen=Kw/hydroxide;}
    const pH=-Math.log10(hydrogen);return {added,hydrogen,pH,pOH:14-pH,excess};
  }
  models.titration = {
    title:'Strong acid–base titration',duration:6,
    note:'HCl is titrated with NaOH at 25 °C. Volumes are additive and activities are approximated by concentrations. Water autoionization is included near equivalence. Bromothymol blue is represented schematically: yellow below pH 6, blue above pH 7.6.',
    fields:[field('acid','HCl concentration','mol/L',.1,.01,1,.01),field('acidVolume','Initial HCl volume','mL',25,5,100,1),field('base','NaOH concentration','mol/L',.1,.01,1,.01),field('added','Target NaOH addition','mL',40,0,200,1)],
    calculate(i){
      if(!i||!bounded(i.acid,.01,1)||!bounded(i.acidVolume,5,100)||!bounded(i.base,.01,1)||!bounded(i.added,0,200))return fail('Use concentrations 0.01–1 mol/L, initial volume 5–100 mL and addition 0–200 mL.');
      const end=titrationAt(i,i.added),equivalence=i.acid*i.acidVolume/i.base;
      return ok({end,equivalence,values:[value('Target pH',end.pH),value('Equivalence volume',equivalence,'mL'),value('Equivalence pH',7,'at 25 °C')]});
    },
    sample(i,r,p){const s=titrationAt(i,i.added*p);s.values=[value('NaOH added',s.added,'mL'),value('Current pH',s.pH),value('Current pOH',s.pOH)];return s;},
    draw(svg,i,r,s,p,h){
      heading(h,'HCl + NaOH → NaCl + H₂O','Strong acid / strong base · 25 °C');
      const color=s.pH<=6?'#e5c65f':s.pH>=7.6?'#6594cf':'#79bd8d';
      h.rect(105,68,28,116,'#e7eef8',4);h.rect(109,75+(1-p)*20,20,70+p*15,'#bad6ef',2);h.line(119,184,119,213,C.muted,3);h.line(112,198,130,198,C.muted,3);
      if(i.added>0&&p<1)h.circle(119,218+tri(p*12)*30,4,C.blue);
      h.path('M88 222 L88 238 L50 294 Q47 307 61 309 H178 Q192 307 188 294 L150 238 V222',{fill:'#f4f7fa',stroke:'#97abc4','stroke-width':3});h.path('M70 271 H169 L183 296 Q185 303 175 304 H64 Q54 303 58 296 Z',{fill:color,opacity:.8});
      for(let j=0;j<8;j++)h.circle(75+j*11+Math.sin(p*12+j)*3,290+Math.cos(p*12+j)*7,2,'#ffffff');
      h.text(32,336,'Bromothymol blue · schematic color',10,C.muted);
      const x0=280,y0=285,w=385,hh=190,maxV=Math.max(i.added,r.equivalence*1.5,1);h.line(x0,y0,x0+w,y0,C.muted,1);h.line(x0,y0,x0,y0-hh,C.muted,1);
      const points=[];for(let j=0;j<=100;j++){const v=maxV*j/100,ph=titrationAt(i,v).pH;points.push([x0+w*j/100,y0-clamp(ph,0,14)/14*hh]);}h.path(linePath(points),{fill:'none',stroke:C.purple,'stroke-width':2.5});
      const xx=x0+w*s.added/maxV,yy=y0-clamp(s.pH,0,14)/14*hh;h.circle(xx,yy,6,C.orange);h.el('line',{x1:x0,y1:y0-hh/2,x2:x0+w,y2:y0-hh/2,stroke:'#b4becd','stroke-dasharray':'4 5'});
      h.text(x0-14,y0+4,'0',10,C.muted,'end');h.text(x0-14,y0-hh/2+4,'7',10,C.muted,'end');h.text(x0-14,y0-hh+4,'14',10,C.muted,'end');h.text(x0-10,y0-hh-15,'pH',11,C.muted,'end');h.text(x0+w,y0+25,fmt(maxV)+' mL added',11,C.muted,'end');h.text(x0,76,'Current pH '+fmt(s.pH),21,C.ink);h.text(x0,336,'Equivalence: '+fmt(r.equivalence)+' mL · current dose '+fmt(s.added)+' mL',12,C.muted);
    }
  };

  function concentration(order,c,k,t){if(order==='0')return Math.max(0,c-k*t);if(order==='1')return c*Math.exp(-k*t);return c/(1+k*c*t);}
  function kineticsAt(i,t){const c=concentration(String(i.order),i.initial,i.rate,t),rate=c<=0?0:i.rate*(String(i.order)==='0'?1:String(i.order)==='1'?c:c*c);return {time:t,concentration:c,rate};}
  models.kinetics = {
    title:'Rate laws and half-life',duration:6,
    note:'Compare integrated rate laws for zero-, first- and second-order disappearance of A. Playback maps six seconds to the selected reaction time. The zero-order law is used only until the reactant is depleted. Particle counts represent concentration.',
    fields:[select('order','Reaction order','1',[['0','Zero order'],['1','First order'],['2','Second order']]),field('initial','Initial concentration','mol/L',1,.01,10,.1),field('rate','Rate constant k','',.1,.001,2,.01),field('time','Reaction time shown','s',20,.1,120,1)],
    calculate(i){
      if(!i||!['0','1','2'].includes(String(i.order))||!bounded(i.initial,.01,10)||!bounded(i.rate,.001,2)||!bounded(i.time,.1,120))return fail('Choose order 0, 1 or 2, [A]₀ 0.01–10 M, k 0.001–2 and time 0.1–120 s.');
      const order=String(i.order),halfLife=order==='0'?i.initial/(2*i.rate):order==='1'?Math.LN2/i.rate:1/(i.rate*i.initial),end=kineticsAt(i,i.time),units=order==='0'?'mol L⁻¹ s⁻¹':order==='1'?'s⁻¹':'L mol⁻¹ s⁻¹';
      return ok({order,halfLife,end,units,values:[value('Final concentration',end.concentration,'mol/L'),value('Half-life',halfLife,'s'),value('k units',units)]});
    },
    sample(i,r,p){const s=kineticsAt(i,i.time*p);s.values=[value('Reaction time',s.time,'s'),value('[A]',s.concentration,'mol/L'),value('Rate of disappearance',s.rate,'mol L⁻¹ s⁻¹')];return s;},
    draw(svg,i,r,s,p,h){
      heading(h,['Zero-order: [A] = [A]₀ − kt','First-order: [A] = [A]₀e⁻ᵏᵗ','Second-order: 1/[A] = 1/[A]₀ + kt'][Number(r.order)],'Reactant concentration is tracked over the selected physical reaction time');
      h.rect(35,80,210,220,'#edf2fb',14);
      const remain=30*s.concentration/i.initial;
      for(let j=0;j<30;j++){const alive=j<remain,x=54+tri(j*.443+p*(.35+j%3*.1))*172,y=101+tri(j*.619+p*.5)*177;h.circle(x,y,alive?6:4,alive?C.purple:'#c8d5e3');}
      h.text(50,330,'Purple = A · pale = products',11,C.muted);
      const x0=300,y0=287,w=365,hh=195;h.line(x0,y0,x0+w,y0,C.muted,1);h.line(x0,y0,x0,y0-hh,C.muted,1);
      const pts=[];for(let j=0;j<=100;j++)pts.push([x0+w*j/100,y0-concentration(r.order,i.initial,i.rate,i.time*j/100)/i.initial*hh]);
      h.path(linePath(pts),{fill:'none',stroke:C.purple,'stroke-width':3});h.circle(x0+w*p,y0-s.concentration/i.initial*hh,6,C.orange);h.text(x0-10,y0-hh+5,fmt(i.initial),10,C.muted,'end');h.text(x0-10,y0+5,'0',10,C.muted,'end');h.text(x0,y0-hh-16,'[A] (mol/L)',11,C.muted);h.text(x0+w,y0+25,fmt(i.time)+' s',11,C.muted,'end');h.text(x0,331,'t = '+fmt(s.time)+' s · [A] = '+fmt(s.concentration)+' M',13,C.ink);
    }
  };

  models.arrhenius = {
    title:'Activation energy and temperature',duration:6,
    note:'The Arrhenius equation calculates a first-order rate constant. exp(−Ea/RT) is the Boltzmann weighting in this model, not the full three-dimensional Maxwell–Boltzmann high-energy fraction. The animated path is a reaction-coordinate illustration; its travel time is not a predicted reaction time.',
    fields:[field('temperature','Temperature','K',300,200,1000,10),field('activation','Activation energy Ea','kJ/mol',50,0,150,1),field('prefactor','Pre-exponential factor A','s⁻¹',1e12,1,1e15,1e10)],
    calculate(i){
      if(!i||!bounded(i.temperature,200,1000)||!bounded(i.activation,0,150)||!bounded(i.prefactor,1,1e15))return fail('Use 200–1000 K, Ea 0–150 kJ/mol and A from 1 to 10¹⁵ s⁻¹.');
      const factor=Math.exp(-i.activation*1000/(R*i.temperature)),rate=i.prefactor*factor;
      return ok({factor,rate,thermal:R*i.temperature/1000,values:[value('Rate constant k',rate,'s⁻¹'),value('Boltzmann weighting',factor),value('RT',R*i.temperature/1000,'kJ/mol')]});
    },
    draw(svg,i,r,s,p,h){
      heading(h,'k = A exp(−Ea / RT)','An activation barrier on a reaction-coordinate diagram');
      const x0=55,y0=280,w=390,barrier=i.activation/150*150;
      h.line(x0,y0,x0+w,y0,C.muted,1);h.line(x0,y0,x0,78,C.muted,1);h.text(60,72,'Energy',11,C.muted);h.text(245,316,'Reaction coordinate',11,C.muted,'middle');
      const height=t=>245-barrier*Math.sin(Math.PI*t)**2,points=[];for(let j=0;j<=80;j++)points.push([70+j/80*350,height(j/80)]);
      h.path(linePath(points),{fill:'none',stroke:C.purple,'stroke-width':3});h.circle(70+p*350,height(p),10,C.orange);
      h.el('line',{x1:245,y1:245,x2:245,y2:245-barrier,stroke:C.orange,'stroke-width':2,'stroke-dasharray':'4 4'});h.text(260,Math.max(80,245-barrier/2),'Ea = '+fmt(i.activation)+' kJ/mol',12,C.muted);
      h.text(485,108,'TEMPERATURE',11,C.muted);h.text(485,140,fmt(i.temperature)+' K',24,C.ink);h.text(485,192,'RATE CONSTANT',11,C.muted);h.text(485,223,fmt(r.rate)+' s⁻¹',22,C.purple);h.text(485,263,'Weighting: '+fmt(r.factor),13,C.muted);
      h.text(30,343,'The dot follows the energy pathway; animation timing is illustrative.',11,C.muted);
    }
  };

  if(typeof module==='object'&&module.exports)module.exports=models;
  if(root)root.ChemistryModels=Object.assign(root.ChemistryModels||{},models);
})(typeof window==='object'?window:null);
