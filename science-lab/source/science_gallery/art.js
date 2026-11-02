/* Original, locally drawn SVG illustrations for the Orbit Science gallery. */
(function (root) {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const colors={mint:'#6de5c1',blue:'#6bbfff',yellow:'#ffe18a',coral:'#ff987f',purple:'#c7acff',white:'#eef7ff',muted:'#8da4bf'};
  function thumbnail(item) {
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 480 260');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const add=(tag,attrs,value,parent)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));if(value!==undefined)e.textContent=String(value);(parent||svg).append(e);return e;};
    const rect=(x,y,width,height,fill,r=7,extra={})=>add('rect',{x,y,width,height,rx:r,fill,...extra});
    const line=(x1,y1,x2,y2,color=colors.muted,width=2,extra={})=>add('line',{x1,y1,x2,y2,stroke:color,'stroke-width':width,'stroke-linecap':'round',...extra});
    const path=(d,color=colors.muted,width=2,extra={})=>add('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',...extra});
    const circle=(cx,cy,r,fill,extra={})=>add('circle',{cx,cy,r,fill,...extra});
    const text=(x,y,value,size=17,color=colors.white,anchor='start',extra={})=>add('text',{x,y,fill:color,'font-size':size,'font-family':'system-ui,sans-serif','font-weight':550,'text-anchor':anchor,...extra},value);
    const arrow=(x1,y1,x2,y2,color=colors.mint,width=3)=>{line(x1,y1,x2,y2,color,width);const a=Math.atan2(y2-y1,x2-x1),length=10;path(`M${x2-length*Math.cos(a-.48)} ${y2-length*Math.sin(a-.48)}L${x2} ${y2}L${x2-length*Math.cos(a+.48)} ${y2-length*Math.sin(a+.48)}`,color,width);};
    const atom=(x,y,label,color=colors.mint,r=21)=>{circle(x,y,r,color);circle(x-r*.27,y-r*.31,r*.23,'#ffffff',{opacity:.24});if(label)text(x,y+6,label,r<17?12:17,'#11223b','middle',{'font-weight':750});};
    const beaker=(x,y,w,h,fill=colors.blue,level=.55)=>{rect(x+4,y+h*(1-level),w-8,h*level-3,fill,5,{opacity:.2});path(`M${x} ${y}V${y+h-10}Q${x} ${y+h} ${x+10} ${y+h}H${x+w-10}Q${x+w} ${y+h} ${x+w} ${y+h-10}V${y}`,colors.muted,3);line(x+5,y+h*(1-level),x+w-5,y+h*(1-level),fill,2);for(let i=1;i<4;i++)line(x+w-13,y+i*h/4,x+w-4,y+i*h/4,colors.muted,1);};
    const cart=(x,y,color,w=82)=>{rect(x,y,w,42,color,8);rect(x+8,y+7,w-16,6,'#ffffff',3,{opacity:.2});circle(x+17,y+46,9,'#0b1427',{stroke:colors.muted,'stroke-width':3});circle(x+w-17,y+46,9,'#0b1427',{stroke:colors.muted,'stroke-width':3});};
    const axes=(x=91,y=198,w=305,h=133)=>{line(x,y,x+w,y,colors.muted,1.5);line(x,y,x,y-h,colors.muted,1.5);for(let i=1;i<5;i++){line(x+i*w/5,y,x+i*w/5,y-h,colors.muted,1,{opacity:.12});line(x,y-i*h/5,x+w,y-i*h/5,colors.muted,1,{opacity:.12});}};
    const model=item.model||'';
    const hash=Array.from(model).reduce((s,c)=>s+c.charCodeAt(0),0),accent=[colors.mint,colors.blue,colors.purple,colors.coral,colors.yellow][hash%5];
    rect(0,0,480,260,item.subject==='physics'?'#16213c':'#112a3a',0);
    circle(442,17,127,accent,{opacity:.035});circle(12,249,88,accent,{opacity:.035});
    for(let x=22;x<480;x+=28)for(let y=23;y<260;y+=28)circle(x,y,.65,'#d8e8ff',{opacity:.1});
    switch(model) {
      case 'moles': {
        line(87,193,196,193,colors.blue,3);rect(96,154,91,34,'#273d54',6);rect(116,163,51,15,'#162c3b',2);text(142,175,'36.0 g',12,colors.mint,'middle');
        path('M112 115L107 150H176L171 115Z',colors.muted,2,{fill:'#6bbfff18'});text(142,139,'H₂O',18,colors.white,'middle');arrow(213,140,267,140,colors.mint);text(327,126,'2.00',39,colors.yellow,'middle');text(327,153,'mol H₂O',18,colors.white,'middle');text(240,226,'Mass → amount of substance',16,colors.muted,'middle');break;
      }
      case 'isotopes': {
        axes(95,193,293,119);[[151,103,'20'],[246,174,'21'],[340,139,'22']].forEach(([x,y,label],i)=>{line(x,193,x,y,[colors.mint,colors.purple,colors.yellow][i],11);text(x,217,label,17,colors.white,'middle');});text(95,59,'ABUNDANCE',12,colors.muted);text(387,235,'isotope mass',13,colors.muted,'end');break;
      }
      case 'electrons': {
        [47,79].forEach(r=>circle(240,136,r,'none',{stroke:colors.muted,'stroke-width':1.5,opacity:.6}));atom(240,136,'Na⁺',colors.coral,28);
        [[240,89],[240,183],[240,57],[296,80],[319,136],[296,192],[240,215],[184,192],[161,136],[184,80]].forEach(([x,y])=>circle(x,y,5,colors.mint));text(390,55,'11 p⁺',16,colors.coral,'end');text(390,79,'10 e⁻',16,colors.mint,'end');break;
      }
      case 'pes': {
        axes(91,196,305,124);[[137,85,colors.yellow],[220,134,colors.purple],[313,165,colors.mint],[365,153,colors.mint]].forEach(([x,y,c])=>{line(x,195,x,y,c,8);circle(x,y,4,c);});text(112,65,'PHOTOELECTRON SPECTRUM',12,colors.muted);text(149,222,'1s',14,colors.yellow,'middle');text(240,222,'2s',14,colors.purple,'middle');text(345,222,'2p',14,colors.mint,'middle');break;
      }
      case 'trends': {
        const symbols=['Li','Be','B','C','N','O','F','Ne'];symbols.forEach((symbol,i)=>{const x=68+i*47;rect(x,87,40,48,i<2?'#244c54':'#29354f',5,{stroke:i<2?colors.mint:colors.purple,'stroke-opacity':.5});text(x+20,118,symbol,16,colors.white,'middle');circle(x+20,173,17-i*1.4,[colors.mint,colors.blue,colors.purple][i%3]);});arrow(88,214,390,214,colors.yellow,2);text(240,57,'ACROSS A PERIOD',13,colors.muted,'middle');break;
      }
      case 'geometry': {
        line(239,106,153,172.6,colors.white,9);line(239,106,325,172.6,colors.white,9);atom(239,106,'O',colors.coral,34);atom(153,172.6,'H',colors.blue,26);atom(325,172.6,'H',colors.blue,26);path('M214 129Q237 153 263 129',colors.yellow,2);text(240,176,'104.5°',15,colors.yellow,'middle');arrow(239,86,239,48,colors.mint,2);circle(215,73,3,colors.white);circle(225,70,3,colors.white);circle(253,70,3,colors.white);circle(264,74,3,colors.white);text(240,228,'SHAPE + BOND POLARITY',13,colors.muted,'middle');break;
      }
      case 'lattice': {
        atom(148,130,'Na⁺',colors.purple,42);atom(331,130,'Cl⁻',colors.mint,48);arrow(199,130,226,130,colors.yellow);arrow(279,130,252,130,colors.yellow);line(148,200,331,200,colors.muted,1.5);line(148,194,148,206);line(331,194,331,206);text(239,224,'separation r',16,colors.muted,'middle');text(240,60,'OPPOSITE CHARGES ATTRACT',13,colors.muted,'middle');break;
      }
      case 'imf': {
        [[151,107],[324,107],[237,184]].forEach(([x,y])=>{line(x,y,x-22,y+20,colors.white,5);line(x,y,x+23,y+20,colors.white,5);atom(x,y,'O',colors.coral,22);atom(x-22,y+20,'H',colors.blue,14);atom(x+23,y+20,'H',colors.blue,14);});line(182,119,292,119,colors.mint,3,{'stroke-dasharray':'4 8'});line(254,162,301,137,colors.mint,3,{'stroke-dasharray':'4 8'});text(240,53,'MOLECULES. MUTUAL ATTRACTION.',13,colors.muted,'middle');break;
      }
      case 'gas': {
        rect(111,75,259,127,'#ffffff',9,{opacity:.035});path('M111 69V199H370V69',colors.muted,3);rect(105,79,271,12,colors.blue,3);line(240,39,240,79,colors.blue,8);[[140,116],[192,163],[247,123],[337,173],[310,111],[267,179]].forEach(([x,y],i)=>{circle(x,y,7,i%2?colors.yellow:colors.mint);arrow(x-20,y+11,x-8,y+4,colors.muted,1.4);});text(240,232,'PV = nRT',23,colors.white,'middle');break;
      }
      case 'solution': {
        beaker(161,70,158,132,colors.blue,.7);[[182,140],[210,159],[251,116],[281,172],[295,132],[229,184]].forEach(([x,y],i)=>atom(x,y,i%2?'−':'+',i%2?colors.purple:colors.mint,10));rect(177,186,15,12,colors.yellow,2);rect(194,187,15,11,colors.yellow,2);text(240,46,'DISSOLVE. MIX. SATURATE.',13,colors.muted,'middle');text(240,232,'concentration = amount / volume',16,colors.white,'middle');break;
      }
      case 'vapor': {
        beaker(153,85,173,117,colors.purple,.5);[[179,174],[209,157],[246,180],[289,166],[303,188]].forEach(([x,y])=>circle(x,y,5,colors.purple));[[178,72],[227,44],[280,83],[315,47]].forEach(([x,y])=>{circle(x,y,6,colors.mint);arrow(x,y+23,x,y+10,colors.muted,1.5);});text(240,234,'LIQUID ⇌ VAPOR',16,colors.white,'middle');break;
      }
      case 'stoichiometry': {
        [[96,102],[96,164]].forEach(([x,y])=>{line(x,y,x+25,y,colors.blue,5);atom(x,y,'H',colors.blue,15);atom(x+25,y,'H',colors.blue,15);});line(194,132,222,132,colors.coral,6);atom(194,132,'O',colors.coral,20);atom(222,132,'O',colors.coral,20);text(158,141,'+',22,colors.white,'middle');arrow(263,132,300,132,colors.yellow);[[359,98],[359,170]].forEach(([x,y])=>{line(x,y,x-20,y+20,colors.white,4);line(x,y,x+20,y+20,colors.white,4);atom(x,y,'O',colors.coral,19);atom(x-20,y+20,'H',colors.blue,13);atom(x+20,y+20,'H',colors.blue,13);});text(240,232,'2H₂ + O₂ → 2H₂O',21,colors.white,'middle');break;
      }
      case 'titration': {
        path('M223 35V120H246V35',colors.muted,3);rect(226,51,17,61,colors.blue,2,{opacity:.45});line(235,121,235,143,colors.muted,3);line(221,129,248,129,colors.yellow,3);path('M235 150C220 168 249 168 235 150',colors.blue,1,{fill:colors.blue});beaker(176,172,118,49,colors.purple,.5);text(321,86,'ADD BASE',13,colors.blue);text(321,107,'watch pH',16,colors.white);break;
      }
      case 'kinetics': {
        axes();path('M98 79C125 105 156 142 192 160S275 190 391 193',colors.mint,4);path('M98 79L391 193',colors.purple,2,{'stroke-dasharray':'6 6'});[[111,91],[153,131],[211,168],[310,188]].forEach(([x,y])=>circle(x,y,4,colors.yellow));text(95,51,'REACTANT CONCENTRATION',12,colors.muted);text(387,226,'time',15,colors.muted,'end');break;
      }
      case 'arrhenius': {
        axes(83,198,319,127);path('M93 165H140C174 165 181 66 232 66S296 165 337 165H392',colors.coral,4);arrow(236,156,236,82,colors.yellow,2);text(252,123,'Eₐ',23,colors.yellow);atom(145,164,'',colors.mint,8);text(92,54,'REACTION ENERGY',12,colors.muted);text(395,226,'reaction progress',13,colors.muted,'end');break;
      }
      case 'calorimetry': {
        beaker(113,81,192,125,colors.blue,.62);[145,186,229,272].forEach((x,i)=>circle(x,164+(i%2)*18,5,colors.blue));line(336,62,336,176,colors.muted,12);line(336,119,336,177,colors.coral,6);circle(336,187,17,colors.coral);circle(336,187,8,'#ffc6b7');[80,95,110].forEach(y=>line(349,y,357,y,colors.muted,2));path('M155 75q-12-15 0-29M189 75q-12-15 0-29M223 75q-12-15 0-29',colors.yellow,2);text(240,237,'q = mcΔT',22,colors.white,'middle');break;
      }
      case 'gibbs': {
        axes(97,198,286,124);rect(122,86,48,111,colors.coral,5);rect(210,123,48,74,colors.purple,5);rect(298,161,48,36,colors.mint,5);text(146,221,'ΔH',17,colors.coral,'middle');text(234,221,'TΔS',17,colors.purple,'middle');text(322,221,'ΔG',17,colors.mint,'middle');text(240,50,'ENERGY + ENTROPY',13,colors.muted,'middle');break;
      }
      case 'equilibrium': {
        atom(125,131,'A',colors.blue,32);atom(355,131,'B',colors.mint,32);arrow(183,112,294,112,colors.blue,3);arrow(294,150,183,150,colors.mint,3);text(240,69,'forward rate = reverse rate',16,colors.white,'middle');text(240,216,'DYNAMIC EQUILIBRIUM',13,colors.muted,'middle');break;
      }
      case 'gasEquilibrium': {
        line(111,130,145,130,colors.coral,8);atom(111,130,'N',colors.coral,24);atom(145,130,'N',colors.coral,24);[92,164].forEach(x=>{atom(x,108,'O',colors.blue,13);atom(x,152,'O',colors.blue,13);});arrow(199,112,268,112,colors.yellow,2);arrow(268,148,199,148,colors.yellow,2);[[326,95],[354,165]].forEach(([x,y])=>{line(x,y,x-19,y+19,colors.white,3);line(x,y,x+19,y+19,colors.white,3);atom(x,y,'N',colors.coral,19);atom(x-19,y+19,'O',colors.blue,12);atom(x+19,y+19,'O',colors.blue,12);});text(240,229,'N₂O₄ ⇌ 2NO₂',20,colors.white,'middle');break;
      }
      case 'acidbase': {
        const fills=['#f28586','#f8b286','#e8cd80','#9be2b0','#7dd6c3','#82bce6','#b3a3e9'];fills.forEach((c,i)=>rect(88+i*44,115,42,53,c,4));text(88,191,'0',15,colors.muted);text(241,191,'7',15,colors.muted,'middle');text(392,191,'14',15,colors.muted,'end');arrow(242,64,242,103,colors.white,2);text(98,89,'ACID',13,colors.coral);text(380,89,'BASE',13,colors.blue,'end');text(240,231,'pH = −log₁₀[H⁺]',22,colors.white,'middle');break;
      }
      case 'buffer': {
        beaker(122,78,182,127,colors.blue,.67);[[145,142],[196,178],[256,135]].forEach(([x,y])=>atom(x,y,'HA',colors.purple,17));[[175,124],[235,179],[282,161]].forEach(([x,y])=>atom(x,y,'A⁻',colors.mint,17));path('M356 86L386 98V128Q386 153 356 168Q326 153 326 128V98Z',colors.yellow,2,{fill:'#ffe18a10'});path('M342 124L352 134L371 112',colors.yellow,3);text(240,237,'RESIST A CHANGE IN pH',14,colors.muted,'middle');break;
      }
      case 'galvanic':
      case 'electrolysis': {
        const plating=model==='electrolysis';beaker(92,115,113,93,colors.blue,.7);beaker(277,115,113,93,colors.purple,.7);rect(125,97,18,93,colors.muted,2);rect(340,97,18,93,colors.coral,2);path('M134 97V66H349V97',colors.muted,3);rect(211,48,62,34,'#24445c',5);text(242,71,plating?'DC':'1.10 V',plating?18:14,colors.yellow,'middle');path('M184 163V119H297V163',colors.mint,9);text(143,232,plating?'ANODE':'Zn',15,colors.muted,'middle');text(347,232,plating?'CATHODE':'Cu',15,colors.coral,'middle');arrow(164,64,192,64,colors.yellow,2);if(plating){for(let i=0;i<4;i++)circle(339,119+i*16,4,colors.yellow);text(240,36,'CHARGE → METAL',12,colors.muted,'middle');}else{text(240,36,'CHEMICAL → ELECTRICAL',12,colors.muted,'middle');}break;
      }
      case 'forces':
      case 'friction': {
        const friction=model==='friction';line(69,198,416,198,colors.muted,2);if(friction)for(let x=77;x<414;x+=14)line(x,201,x-8,212,colors.muted,1.5);cart(197,141,colors.blue,92);arrow(294,160,380,160,colors.mint,4);text(342,138,'F',24,colors.mint,'middle');if(friction){arrow(186,169,120,169,colors.coral,4);text(147,148,'f',23,colors.coral,'middle');}else{arrow(242,129,242,77,colors.yellow,3);text(263,97,'a',20,colors.yellow);}text(240,58,friction?'PUSH. RESIST. MOVE.':'A PUSH CHANGES MOTION',13,colors.muted,'middle');break;
      }
      case 'work': {
        line(73,191,411,191,colors.muted,2);cart(116,133,colors.blue,75);arrow(151,127,236,76,colors.mint,4);text(226,68,'F',22,colors.mint);arrow(221,171,354,171,colors.yellow,2);text(286,151,'distance d',15,colors.yellow,'middle');path('M196 126A50 50 0 0 0 184 99',colors.purple,2);text(205,111,'θ',20,colors.purple);text(240,231,'W = Fd cos θ',22,colors.white,'middle');break;
      }
      case 'energy': {
        line(90,203,390,203,colors.muted,2);rect(107,124,45,78,colors.purple,4);rect(170,161,45,41,colors.mint,4);rect(233,83,45,119,colors.yellow,4);text(130,227,'PE',14,colors.purple,'middle');text(193,227,'KE',14,colors.mint,'middle');text(256,227,'total',14,colors.yellow,'middle');circle(353,92,19,colors.coral);arrow(353,124,353,177,colors.coral,3);text(240,48,'ENERGY CHANGES FORM',13,colors.muted,'middle');break;
      }
      case 'power': {
        circle(240,134,74,'none',{stroke:'#2a3b52','stroke-width':14});path('M240 60A74 74 0 0 1 311 155',colors.mint,14);path('M249 91L217 138H239L229 178L267 124H244Z',colors.yellow,1,{fill:colors.yellow});text(240,236,'SAME ENERGY. LESS TIME.',14,colors.muted,'middle');break;
      }
      case 'momentum': {
        line(76,193,402,193,colors.muted,2);cart(194,136,colors.purple,95);arrow(305,155,397,155,colors.mint,4);text(345,130,'v',24,colors.mint,'middle');for(let i=0;i<3;i++)line(105-i*15,145+i*15,175,145+i*15,colors.purple,3,{opacity:.5});text(240,70,'p = mv',32,colors.white,'middle');text(240,233,'MASS IN MOTION',13,colors.muted,'middle');break;
      }
      case 'impulse': {
        axes(91,198,305,126);rect(137,100,181,98,colors.blue,1,{opacity:.2});path('M91 198H137V100H318V198H396',colors.blue,3);text(226,157,'J = area',23,colors.yellow,'middle');text(93,58,'FORCE',12,colors.muted);text(396,229,'time',14,colors.muted,'end');break;
      }
      case 'collision': {
        line(62,198,417,198,colors.muted,2);cart(99,143,colors.blue,83);cart(298,143,colors.coral,83);arrow(191,163,222,163,colors.blue,3);arrow(288,163,257,163,colors.coral,3);[[-12,-7],[0,-17],[12,-7]].forEach(([x,y])=>line(240+x,128+y,240+x*.55,137+y*.5,colors.yellow,2));text(240,72,'MOMENTUM, CONSERVED.',13,colors.muted,'middle');text(240,231,'before → after',18,colors.white,'middle');break;
      }
      case 'physics-projectile': {
        line(75,201,411,201,colors.muted,2);path('M91 198Q239 -19 389 198',colors.mint,3,{'stroke-dasharray':'6 7'});circle(292,105,13,colors.yellow);arrow(91,198,124,146,colors.blue,3);text(114,131,'v₀',20,colors.blue);line(91,223,389,223,colors.purple,2);text(240,244,'range R',15,colors.purple,'middle');text(240,41,'UP, OVER, AND DOWN.',13,colors.muted,'middle');break;
      }
      case 'physics-acceleration': {
        axes(91,181,306,112);path('M98 176Q223 177 388 77',colors.mint,4);text(100,53,'POSITION',12,colors.muted);text(397,203,'time',13,colors.muted,'end');cart(157,199,colors.blue,53);arrow(231,226,316,226,colors.yellow,2);text(337,233,'a',21,colors.yellow);break;
      }
      case 'physics-waves': {
        line(52,143,429,143,colors.muted,1.5);let d='';for(let x=55;x<=425;x+=3)d+=(x===55?'M':'L')+x+' '+(143-54*Math.sin((x-55)/170*2*Math.PI));path(d,colors.blue,4);line(97,59,267,59,colors.yellow,2);line(97,53,97,66,colors.yellow,2);line(267,53,267,66,colors.yellow,2);text(181,45,'λ',25,colors.yellow,'middle');arrow(366,214,420,214,colors.mint,2);text(290,220,'v = fλ',22,colors.white,'middle');break;
      }
      case 'physics-pendulum': {
        line(154,48,319,48,colors.muted,4);circle(238,54,4,colors.yellow);line(238,54,238,205,colors.muted,1.5,{'stroke-dasharray':'4 6',opacity:.6});line(238,54,277,199,colors.white,3);circle(277,199,20,colors.blue);path('M218 204Q249 216 280 202',colors.mint,2);path('M238 101A47 47 0 0 1 250 100',colors.yellow,2);text(271,111,'±90°',15,colors.yellow);text(179,140,'L',23,colors.white);text(240,245,'DRAG · RELEASE · EXPLORE',20,colors.white,'middle');break;
      }
      case 'physics-circuit': {
        path('M123 111V73H354V190H123V150',colors.muted,4);line(103,123,144,123,colors.yellow,3);line(112,140,135,140,colors.yellow,5);path('M220 73L228 60L240 86L252 60L264 86L276 60L284 73',colors.coral,3);arrow(319,107,319,149,colors.mint,3);text(165,144,'9 V',20,colors.yellow);text(251,117,'3 Ω',20,colors.coral,'middle');text(240,231,'I = V / R = 3 A',21,colors.white,'middle');break;
      }
      case 'physics-vectors': {
        axes(111,202,282,145);arrow(111,202,285,158,colors.blue,4);arrow(285,158,343,70,colors.purple,4);arrow(111,202,343,70,colors.mint,4);text(222,193,'A⃗',23,colors.blue);text(333,133,'B⃗',23,colors.purple);text(209,110,'R⃗',25,colors.mint);text(240,241,'R⃗ = A⃗ + B⃗',23,colors.white,'middle');break;
      }
      default: {
        [[189,91],[294,107],[237,185]].forEach(([x,y],i)=>{line(240,130,x,y,colors.muted,5);atom(x,y,'',[colors.blue,colors.mint,colors.purple][i],24);});atom(240,130,'',colors.coral,31);break;
      }
    }
    return svg;
  }
  root.ScienceArt=Object.freeze({thumbnail});
})(typeof globalThis!=='undefined'?globalThis:this);
