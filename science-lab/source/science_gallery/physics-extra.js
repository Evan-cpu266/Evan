/* Original Orbit Science physics models. All diagrams are local SVG DOM nodes. */
(function (root) {
  'use strict';
  const PI = Math.PI;
  const C = {ink:'#18364f',muted:'#63778b',blue:'#3178c6',green:'#299b85',orange:'#df9142',purple:'#8c65b6',line:'#cbd9e5',pale:'#eaf2f9'};
  const field = (key,label,unit,value,min,max,step) => ({key,label,unit,type:'number',value,min,max,step});
  const select = (key,label,value,options) => ({key,label,type:'select',value,options:options.map(([value,label])=>({value,label}))});
  const val = (label,value,unit) => ({label,value,unit:unit || ''});
  const invalid = error => ({valid:false,error});
  const fmt = n => Number.isFinite(n) ? Number(n.toFixed(3)).toLocaleString('en-US') : '—';
  function check(o,spec) {
    if (!o || typeof o !== 'object') return 'Enter a value in every field.';
    for (const [key,min,max] of spec) {
      if (typeof o[key] !== 'number' || !Number.isFinite(o[key]) || o[key] < min || o[key] > max) return key+' must be between '+min+' and '+max+'.';
    }
    return '';
  }
  function good(data,values) {
    if (Object.values(data).some(x=>typeof x === 'number' && !Number.isFinite(x))) return invalid('These values exceed the supported range.');
    return {...data,valid:true,values};
  }
  function title(h,text,subtitle) {
    h.text(360,31,text,20,C.ink,'middle');
    if(subtitle) h.text(360,52,subtitle,12,C.muted,'middle');
  }
  function arrow(h,x1,y1,x2,y2,color,width=3) {
    const length=Math.hypot(x2-x1,y2-y1);
    if(length < 0.05) return;
    const a=Math.atan2(y2-y1,x2-x1),head=Math.min(9,length*.4);
    h.line(x1,y1,x2,y2,color,width);
    h.line(x2,y2,x2-head*Math.cos(a-.5),y2-head*Math.sin(a-.5),color,width);
    h.line(x2,y2,x2-head*Math.cos(a+.5),y2-head*Math.sin(a+.5),color,width);
  }
  const models = {};

  models['physics-projectile'] = {
    title:'Projectile Motion',duration:6,
    note:'An ideal projectile launches from and lands on level ground. Gravity is uniform and air resistance is ignored. Playback maps the whole flight onto six presentation seconds; the readout shows physical flight time. Both axes use the same distance scale.',
    fields:[field('speed','Launch speed v₀','m/s',20,1,100,.5),field('angle','Launch angle θ','°',45,5,85,1),field('gravity','Gravity g','m/s²',9.81,.1,30,.01)],
    calculate(o) {
      const error=check(o,[['speed',1,100],['angle',5,85],['gravity',.1,30]]);if(error)return invalid(error);
      const theta=o.angle*PI/180,vx=o.speed*Math.cos(theta),vy=o.speed*Math.sin(theta),flightTime=2*vy/o.gravity,range=vx*flightTime,maxHeight=vy*vy/(2*o.gravity);
      return good({vx,vy,flightTime,range,maxHeight},[val('Horizontal range',range,'m'),val('Maximum height',maxHeight,'m'),val('Flight time',flightTime,'s'),val('Horizontal velocity',vx,'m/s')]);
    },
    sample(o,r,p) {
      const time=r.flightTime*p,x=r.vx*time,y=Math.max(0,r.vy*time-.5*o.gravity*time*time),vy=r.vy-o.gravity*time;
      return {time,x,y,vx:r.vx,vy,values:[val('Flight time now',time,'s'),val('Horizontal position',x,'m'),val('Height',y,'m'),val('Vertical velocity',vy,'m/s')]};
    },
    draw(svg,o,r,s,p,h) {
      title(h,'One launch. Two independent motions.','R = v₀² sin(2θ) / g     ·     x = v₀ cosθ · t     ·     y = v₀ sinθ · t − ½gt²');
      const scale=Math.min(550/r.range,190/r.maxHeight),ox=85,oy=285,toX=x=>ox+x*scale,toY=y=>oy-y*scale;
      h.rect(58,73,618,229,'#f0f6fb',12);
      h.line(ox,oy,657,oy,C.line,2);h.line(ox,oy,ox,78,C.line,2);
      let path='';for(let j=0;j<=80;j++){const t=r.flightTime*j/80,x=r.vx*t,y=Math.max(0,r.vy*t-.5*o.gravity*t*t);path+=(j?' L':'M')+toX(x)+' '+toY(y);}
      h.path(path,{stroke:C.blue,'stroke-width':2.3,'stroke-dasharray':'5 5',opacity:.6});
      h.line(toX(r.range/2),toY(r.maxHeight),toX(r.range/2),oy,C.line,1);
      h.circle(toX(s.x),toY(s.y),9,C.orange);
      const speed=Math.hypot(s.vx,s.vy),length=38;
      arrow(h,toX(s.x),toY(s.y),toX(s.x)+length*s.vx/speed,toY(s.y)-length*s.vy/speed,C.green,2.5);
      h.text(ox,oy+19,'0',11,C.muted,'middle');h.text(toX(r.range),oy+19,fmt(r.range)+' m',12,C.muted,'middle');
      h.text(toX(r.range/2)+12,Math.max(84,toY(r.maxHeight)-12),fmt(r.maxHeight)+' m',12,C.blue);
      h.text(360,337,'t = '+fmt(s.time)+' s   ·   green arrow shows velocity direction',13,C.ink,'middle');
    }
  };

  models['physics-acceleration'] = {
    title:'Motion & Acceleration Graphs',duration:o=>o.time,
    note:'A point-like cart moves along one horizontal axis with constant signed acceleration. Position, velocity and acceleration graphs use physical model time. Negative position means left of the chosen origin; the cart display automatically scales to the full position range.',
    fields:[field('position','Initial position x₀','m',0,-50,50,1),field('velocity','Initial velocity v₀','m/s',2,-20,20,.5),field('acceleration','Acceleration a','m/s²',1,-10,10,.5),field('time','Model duration','s',6,1,20,.5),select('plot','Graph','position',[['position','Position vs time'],['velocity','Velocity vs time'],['acceleration','Acceleration vs time']])],
    calculate(o) {
      const error=check(o,[['position',-50,50],['velocity',-20,20],['acceleration',-10,10],['time',1,20]]);if(error)return invalid(error);
      if(!['position','velocity','acceleration'].includes(o.plot))return invalid('Choose position, velocity or acceleration for the graph.');
      const finalPosition=o.position+o.velocity*o.time+.5*o.acceleration*o.time*o.time,finalVelocity=o.velocity+o.acceleration*o.time;
      const points=[o.position,finalPosition],turningTime=o.acceleration ? -o.velocity/o.acceleration : -1;
      if(turningTime>0 && turningTime<o.time)points.push(o.position+o.velocity*turningTime+.5*o.acceleration*turningTime*turningTime);
      return good({finalPosition,finalVelocity,minPosition:Math.min(...points),maxPosition:Math.max(...points)},[val('Final position',finalPosition,'m'),val('Final velocity',finalVelocity,'m/s'),val('Constant acceleration',o.acceleration,'m/s²')]);
    },
    sample(o,r,p) {
      const time=o.time*p,position=o.position+o.velocity*time+.5*o.acceleration*time*time,velocity=o.velocity+o.acceleration*time;
      return {time,position,velocity,acceleration:o.acceleration,values:[val('Model time',time,'s'),val('Position now',position,'m'),val('Velocity now',velocity,'m/s'),val('Acceleration',o.acceleration,'m/s²')]};
    },
    draw(svg,o,r,s,p,h) {
      title(h,'Read the motion. See the graph.','x = x₀ + v₀t + ½at²     ·     v = v₀ + at');
      h.rect(35,76,265,233,C.pale,13);
      const span=Math.max(1,r.maxPosition-r.minPosition),map=x=>65+205*(x-r.minPosition)/span,carX=map(s.position);
      h.line(60,233,279,233,C.line,3);h.rect(carX-15,193,30,24,C.blue,5);h.circle(carX-9,224,6,C.ink);h.circle(carX+9,224,6,C.ink);
      if(Math.abs(s.velocity)>1e-10)arrow(h,carX,173,carX+Math.sign(s.velocity)*24,173,C.green,2.5);
      h.text(168,112,'POSITION ON THE TRACK',11,C.muted,'middle');h.text(168,143,fmt(s.position)+' m',22,C.ink,'middle');
      h.text(62,258,fmt(r.minPosition)+' m',10,C.muted);h.text(274,258,fmt(r.maxPosition)+' m',10,C.muted,'end');
      h.text(168,287,'Track is automatically scaled',11,C.muted,'middle');
      const values=[];for(let j=0;j<=80;j++)values.push(models['physics-acceleration'].sample(o,r,j/80)[o.plot]);
      let low=Math.min(0,...values),high=Math.max(0,...values);if(high-low<1e-8){low-=1;high+=1;}else{const pad=(high-low)*.1;low-=pad;high+=pad;}
      const px=t=>355+310*t/o.time,py=v=>268-174*(v-low)/(high-low),unit={position:'m',velocity:'m/s',acceleration:'m/s²'}[o.plot];
      h.line(355,85,355,268,C.line,2);h.line(355,268,665,268,C.line,2);h.line(355,py(0),665,py(0),C.line,1);
      h.path(values.map((v,j)=>(j?'L':'M')+px(o.time*j/80)+' '+py(v)).join(' '),{stroke:C.blue,'stroke-width':3});
      h.line(px(s.time),90,px(s.time),268,C.orange,1.5);h.circle(px(s.time),py(s[o.plot]),6,C.orange);
      h.text(352,286,'0',11,C.muted);h.text(665,286,fmt(o.time)+' s',11,C.muted,'end');
      h.text(513,78,o.plot+' ('+unit+')',13,C.ink,'middle');h.text(344,100,fmt(high),10,C.muted,'end');h.text(344,268,fmt(low),10,C.muted,'end');
      h.text(513,312,'Physical model time / s',12,C.muted,'middle');h.text(360,344,'Time = '+fmt(s.time)+' s   ·   a = '+fmt(o.acceleration)+' m/s²',13,C.ink,'middle');
    }
  };

  models['physics-waves'] = {
    title:'Wave Lab',duration:6,
    note:'A sinusoidal transverse wave travels to the right without damping or reflection. The green marker is one medium point: it oscillates up and down while the wave carries energy horizontally. Playback and the readout use six physical seconds.',
    fields:[field('frequency','Frequency f','Hz',1,.1,5,.1),field('wavelength','Wavelength λ','m',2,.5,5,.1),field('amplitude','Amplitude A','m',1,0,2,.1)],
    calculate(o) {
      const error=check(o,[['frequency',.1,5],['wavelength',.5,5],['amplitude',0,2]]);if(error)return invalid(error);
      const speed=o.frequency*o.wavelength,period=1/o.frequency;
      return good({speed,period},[val('Wave speed',speed,'m/s'),val('Period',period,'s'),val('Wavelength',o.wavelength,'m'),val('Amplitude',o.amplitude,'m')]);
    },
    sample(o,r,p) {
      const time=6*p,markerX=2.5,markerDisplacement=o.amplitude*Math.sin(2*PI*(markerX/o.wavelength-o.frequency*time));
      return {time,markerX,markerDisplacement,values:[val('Model time',time,'s'),val('Marker displacement',markerDisplacement,'m'),val('Wave speed to the right',r.speed,'m/s')]};
    },
    draw(svg,o,r,s,p,h) {
      title(h,'A wave moves. The medium oscillates.','y(x,t) = A sin[2π(x/λ − ft)]     ·     v = fλ');
      const ox=61,cy=198,scaleX=59,scaleY=50,toY=y=>cy-y*scaleY;
      for(let y=-2;y<=2;y++){h.line(ox,toY(y),651,toY(y),C.line,y?1:2);h.text(48,toY(y)+4,String(y),10,C.muted,'end');}
      for(let x=0;x<=10;x+=2){h.line(ox+x*scaleX,94,ox+x*scaleX,298,C.line,1);h.text(ox+x*scaleX,318,String(x),11,C.muted,'middle');}
      let d='';for(let j=0;j<=300;j++){const x=10*j/300,y=o.amplitude*Math.sin(2*PI*(x/o.wavelength-o.frequency*s.time));d+=(j?' L':'M')+(ox+x*scaleX)+' '+toY(y);}
      h.path(d,{stroke:C.blue,'stroke-width':3});
      const marker=ox+s.markerX*scaleX;h.line(marker,cy-106,marker,cy+106,C.green,1);h.circle(marker,toY(s.markerDisplacement),8,C.green);
      arrow(h,522,76,608,76,C.orange,3);h.text(510,81,'wave',12,C.orange,'end');
      h.text(80,82,'Displacement / m',11,C.muted);h.text(360,344,'Position / m   ·   t = '+fmt(s.time)+' s   ·   green point stays at x = 2.5 m',12,C.ink,'middle');
    }
  };

  models['physics-pendulum'] = (()=>{
    const geometry=Object.freeze({pivotX:185,pivotY:105,lengthPixels:120,maxAngle:90});
    const trajectories=new Map();
    const duration=6;
    // The exact period uses the arithmetic-geometric mean for the complete
    // elliptic integral K(sin(|theta0|/2)), including its zero-angle limit.
    function periodFor(length,gravity,angle) {
      let a=1,b=Math.cos(Math.abs(angle)*PI/360);
      for(let i=0;i<20&&Math.abs(a-b)>2e-16;i++) {
        const mean=(a+b)/2;b=Math.sqrt(a*b);a=mean;
      }
      return 2*PI*Math.sqrt(length/gravity)/a;
    }
    function trajectory(o,r) {
      const key=o.length+'|'+o.gravity+'|'+o.angle;
      if(trajectories.has(key)) {const cached=trajectories.get(key);trajectories.delete(key);trajectories.set(key,cached);return cached;}
      const steps=Math.ceil(duration/Math.min(.002,r.period/1024)),dt=duration/steps;
      const theta=new Float64Array(steps+1),velocity=new Float64Array(steps+1),q=o.gravity/o.length;
      theta[0]=o.angle*PI/180;
      for(let i=0;i<steps;i++) {
        const a=theta[i],v=velocity[i];
        const k1a=v,k1v=-q*Math.sin(a);
        const k2a=v+dt*k1v/2,k2v=-q*Math.sin(a+dt*k1a/2);
        const k3a=v+dt*k2v/2,k3v=-q*Math.sin(a+dt*k2a/2);
        const k4a=v+dt*k3v,k4v=-q*Math.sin(a+dt*k3a);
        theta[i+1]=a+dt*(k1a+2*k2a+2*k3a+k4a)/6;
        velocity[i+1]=v+dt*(k1v+2*k2v+2*k3v+k4v)/6;
      }
      const table={theta,velocity,dt,steps};trajectories.set(key,table);
      while(trajectories.size>4)trajectories.delete(trajectories.keys().next().value);
      return table;
    }
    function atTime(o,r,time) {
      if(o.angle===0)return {theta:0,angularVelocity:0};
      const table=trajectory(o,r),position=Math.max(0,Math.min(duration,time))/table.dt;
      const i=Math.min(table.steps-1,Math.floor(position)),u=Math.min(1,position-i),u2=u*u,u3=u2*u;
      const a=table.theta[i],b=table.theta[i+1],v=table.velocity[i],w=table.velocity[i+1],dt=table.dt;
      // Cubic Hermite interpolation keeps angle and angular velocity mutually
      // consistent between accurate RK4 integration points.
      const theta=(2*u3-3*u2+1)*a+(u3-2*u2+u)*dt*v+(-2*u3+3*u2)*b+(u3-u2)*dt*w;
      const angularVelocity=((6*u2-6*u)*a+(3*u2-4*u+1)*dt*v+(-6*u2+6*u)*b+(3*u2-2*u)*dt*w)/dt;
      return {theta,angularVelocity};
    }
    return {
      title:'Pendulum Lab',duration,interaction:geometry,
      note:'Drag the bob to either side, then release it to swing from rest. Initial angles from −90° to +90° are measured from the downward vertical. Motion uses the nonlinear equation θ″ = −(g/L) sinθ, so large-angle periods are accurate. The ideal pendulum has a point mass, a massless rigid rod and no damping. Playback shows six physical seconds; the drawing is scaled to fit.',
      fields:[field('length','Pendulum length L','m',1,.1,3,.1),field('gravity','Gravity g','m/s²',9.81,.1,30,.01),field('angle','Initial angle θ₀','°',12,-90,90,.1)],
      calculate(o) {
        const error=check(o,[['length',.1,3],['gravity',.1,30],['angle',-90,90]]);if(error)return invalid(error);
        const naturalFrequency=Math.sqrt(o.gravity/o.length),smallAnglePeriod=2*PI/naturalFrequency,period=periodFor(o.length,o.gravity,o.angle),frequency=1/period;
        const maxAngularSpeed=2*naturalFrequency*Math.sin(Math.abs(o.angle)*PI/360);
        return good({naturalFrequency,smallAnglePeriod,angularFrequency:2*PI/period,period,frequency,maxAngularSpeed},[val('Period at this release angle',period,'s'),val('Frequency',frequency,'Hz'),val('Initial angular displacement',o.angle,'°'),val('Maximum bob speed',o.length*maxAngularSpeed,'m/s')]);
      },
      sample(o,r,p) {
        const time=duration*Math.max(0,Math.min(1,Number.isFinite(p)?p:0)),state=atTime(o,r,time),theta=state.theta;
        const angle=theta*180/PI,x=o.length*Math.sin(theta),drop=o.length*(1-Math.cos(theta));
        return {time,theta,angle,angularVelocity:state.angularVelocity,x,drop,values:[val('Model time',time,'s'),val('Live angle θ',angle,'°'),val('Angular velocity',state.angularVelocity,'rad/s')]};
      },
      draw(svg,o,r,s,p,h) {
        title(h,'Drag. Hold. Release.','θ″ = −(g/L) sinθ     ·     release up to 90° from the vertical');
        const cx=geometry.pivotX,cy=geometry.pivotY,length=geometry.lengthPixels,bx=cx+length*Math.sin(s.theta),by=cy+length*Math.cos(s.theta);
        h.rect(48,73,276,238,C.pale,13);
        h.rect(cx-29,cy-20,58,10,C.ink,3);
        h.path('M'+cx+' '+cy+' L'+cx+' '+(cy+length+12),{stroke:C.line,'stroke-width':1.4,'stroke-dasharray':'4 5'});
        const release=o.angle*PI/180;
        h.path('M'+cx+' '+cy+' L'+(cx+length*Math.sin(release))+' '+(cy+length*Math.cos(release)),{stroke:C.line,'stroke-width':1.2,'stroke-dasharray':'3 4'});
        const arcRadius=42;
        if(Math.abs(s.theta)>1e-7)h.path('M'+cx+' '+(cy+arcRadius)+' A'+arcRadius+' '+arcRadius+' 0 0 '+(s.theta>0?0:1)+' '+(cx+arcRadius*Math.sin(s.theta))+' '+(cy+arcRadius*Math.cos(s.theta)),{stroke:C.green,'stroke-width':2});
        h.text(cx+68*Math.sin(s.theta/2),cy+68*Math.cos(s.theta/2),fmt(s.angle)+'°',11,C.green,'middle');
        h.el('line',{'data-pendulum-string':'',x1:cx,y1:cy,x2:bx,y2:by,stroke:C.blue,'stroke-width':3,'stroke-linecap':'round'});h.circle(cx,cy,5,C.ink);
        const bob=h.el('g',{'data-pendulum-bob':'','class':'pendulum-bob','role':'button',tabindex:'0',style:'touch-action:none;cursor:grab','aria-label':'Pendulum bob. Drag to set angle and release to swing. Arrow keys adjust; Enter releases.'});
        h.el('circle',{cx:bx,cy:by,r:29,fill:'transparent','pointer-events':'all',cursor:'grab',style:'touch-action:none'},undefined,bob);
        h.el('circle',{cx:bx,cy:by,r:17,fill:C.orange,stroke:'#fff0ca','stroke-width':2,'pointer-events':'none'},undefined,bob);
        h.el('circle',{cx:bx-5,cy:by-5,r:4,fill:'#ffe3a0',opacity:.7,'pointer-events':'none'},undefined,bob);
        h.text(185,265,'θ = '+fmt(s.angle)+'°',20,C.ink,'middle');
        h.text(185,287,'L = '+fmt(o.length)+' m · drag the bob',12,C.muted,'middle');
        const gx=394,gy=266,w=278,gh=152,limit=Math.max(1,Math.abs(o.angle)),plotY=a=>gy-gh/2-a/limit*gh/2;
        h.line(gx,98,gx,gy,C.line,2);h.line(gx,plotY(0),gx+w,plotY(0),C.line,1);h.line(gx,gy,gx+w,gy,C.line,2);
        let d='';for(let j=0;j<=150;j++){const a=atTime(o,r,duration*j/150).theta*180/PI;d+=(j?' L':'M')+(gx+w*j/150)+' '+plotY(a);}
        h.path(d,{stroke:C.blue,'stroke-width':2.5});h.line(gx+w*p,105,gx+w*p,gy,C.orange,1);h.circle(gx+w*p,plotY(s.angle),5,C.orange);
        h.text(gx-10,117,'+'+fmt(limit)+'°',10,C.muted,'end');h.text(gx-10,gy,'−'+fmt(limit)+'°',10,C.muted,'end');
        h.text(gx,286,'0 s',11,C.muted);h.text(gx+w,286,'6 s',11,C.muted,'end');h.text(gx+w/2,82,'Live angle versus physical time',13,C.ink,'middle');
        h.text(360,340,'t = '+fmt(s.time)+' s   ·   T = '+fmt(r.period)+' s   ·   released from rest, no damping',12,C.ink,'middle');
      }
    };
  })();

  models['physics-circuit'] = {
    title:'Ohm’s Law Circuit',duration:6,
    note:'An ideal DC voltage source drives one ohmic resistor. Wire resistance and temperature changes are ignored. Moving dots show conventional current (positive charge direction), not electron trajectories; their visual speed is illustrative rather than a physical drift speed.',
    fields:[field('voltage','Source voltage V','V',9,0,24,.5),field('resistance','Resistance R','Ω',100,1,1000,1)],
    calculate(o) {
      const error=check(o,[['voltage',0,24],['resistance',1,1000]]);if(error)return invalid(error);
      const current=o.voltage/o.resistance,power=o.voltage*current;
      return good({current,power},[val('Conventional current',current,'A'),val('Resistor power',power,'W'),val('Source voltage',o.voltage,'V')]);
    },
    sample(o,r,p) { return {time:6*p,phase:p,values:[val('Steady current',r.current,'A'),val('Resistor power',r.power,'W')]}; },
    draw(svg,o,r,s,p,h) {
      title(h,'One complete circuit. One simple law.','I = V / R     ·     P = VI = I²R');
      const x=132,y=101,w=452,height=166;
      h.line(x,y,300,y,C.blue,4);h.line(490,y,x+w,y,C.blue,4);h.line(x+w,y,x+w,y+height,C.blue,4);h.line(x+w,y+height,x,y+height,C.blue,4);
      h.line(x,y,x,171,C.blue,4);h.line(x,202,x,y+height,C.blue,4);
      h.line(x-22,173,x+22,173,C.ink,4);h.line(x-12,199,x+12,199,C.ink,4);h.text(x-39,178,'+',15,C.ink,'middle');h.text(x-39,204,'−',15,C.ink,'middle');
      let zig='M300 '+y;for(let j=0;j<12;j++)zig+=' L'+(309+j*15)+' '+(y+(j%2?-13:13));zig+=' L490 '+y;h.path(zig,{stroke:C.orange,'stroke-width':4});
      h.text(395,76,fmt(o.resistance)+' Ω',16,C.orange,'middle');h.text(88,235,fmt(o.voltage)+' V',16,C.ink,'middle');
      h.text(360,174,'I = '+fmt(r.current)+' A',28,C.ink,'middle');h.text(360,207,'P = '+fmt(r.power)+' W',18,C.muted,'middle');
      if(r.current>0){const perimeter=2*(w+height);for(let j=0;j<12;j++){let distance=((p*1.8+j/12)%1)*perimeter,px,py;if(distance<w){px=x+distance;py=y;}else if(distance<w+height){px=x+w;py=y+distance-w;}else if(distance<2*w+height){px=x+w-(distance-w-height);py=y+height;}else{px=x;py=y+height-(distance-2*w-height);}if(!(Math.abs(px-x)<1&&py>163&&py<208)&&!(py===y&&px>295&&px<495))h.circle(px,py,4,C.green);}}
      if(r.current>0)arrow(h,410,298,295,298,C.green,2.5);h.text(360,329,r.current>0?'Conventional current flows from + to − through the resistor.':'Zero voltage: no steady current flows.',13,C.ink,'middle');
    }
  };

  models['physics-vectors'] = {
    title:'Vector Addition',duration:6,
    note:'Two Cartesian vectors are added using components: R = A + B. Both diagram axes use the same scale. Playback reveals the head-to-tail construction; it is a drawing sequence, not physical motion. Angles are measured counterclockwise from +x; the zero vector has no direction.',
    fields:[field('ax','Vector A: x component','units',3,-10,10,.5),field('ay','Vector A: y component','units',2,-10,10,.5),field('bx','Vector B: x component','units',-1,-10,10,.5),field('by','Vector B: y component','units',3,-10,10,.5)],
    calculate(o) {
      const error=check(o,[['ax',-10,10],['ay',-10,10],['bx',-10,10],['by',-10,10]]);if(error)return invalid(error);
      const rx=o.ax+o.bx,ry=o.ay+o.by,magnitude=Math.hypot(rx,ry),angle=magnitude===0?null:(Math.atan2(ry,rx)*180/PI+360)%360;
      return good({rx,ry,magnitude,angle},[val('Resultant x component',rx,'units'),val('Resultant y component',ry,'units'),val('Resultant magnitude',magnitude,'units'),val('Resultant direction',angle===null?'Undefined (zero vector)':angle,angle===null?'':'° from +x')]);
    },
    sample(o,r,p) { return {aFraction:Math.min(1,p*3),bFraction:Math.min(1,Math.max(0,(p-1/3)*3)),rFraction:Math.min(1,Math.max(0,(p-2/3)*3)),values:r.values}; },
    draw(svg,o,r,s,p,h) {
      title(h,'Add components. Build the resultant.','Rₓ = Aₓ + Bₓ     ·     Rᵧ = Aᵧ + Bᵧ');
      const max=Math.max(1,Math.abs(o.ax),Math.abs(o.ay),Math.abs(o.bx),Math.abs(o.by),Math.abs(r.rx),Math.abs(r.ry)),scale=106/max,cx=244,cy=205,px=x=>cx+x*scale,py=y=>cy-y*scale;
      h.rect(80,75,331,252,C.pale,12);arrow(h,96,cy,398,cy,C.line,1.5);arrow(h,cx,312,cx,82,C.line,1.5);
      h.text(396,cy+19,'+x',12,C.muted,'end');h.text(cx+12,92,'+y',12,C.muted);h.text(cx-8,cy+15,'0',10,C.muted,'end');
      h.path('M'+cx+' '+cy+' L'+px(o.bx)+' '+py(o.by),{stroke:C.purple,'stroke-width':2,'stroke-dasharray':'4 5',opacity:.4});
      arrow(h,cx,cy,px(o.ax*s.aFraction),py(o.ay*s.aFraction),C.blue,3);
      if(s.bFraction>0)arrow(h,px(o.ax),py(o.ay),px(o.ax+o.bx*s.bFraction),py(o.ay+o.by*s.bFraction),C.purple,3);
      if(s.rFraction>0)arrow(h,cx,cy,px(r.rx*s.rFraction),py(r.ry*s.rFraction),C.green,4);
      h.text(456,108,'HEAD TO TAIL',11,C.muted);h.text(456,148,'A = ('+fmt(o.ax)+', '+fmt(o.ay)+')',19,C.blue);h.text(456,185,'B = ('+fmt(o.bx)+', '+fmt(o.by)+')',19,C.purple);h.text(456,226,'R = ('+fmt(r.rx)+', '+fmt(r.ry)+')',19,C.green);
      h.text(456,269,'|R| = '+fmt(r.magnitude)+' units',16,C.ink);h.text(456,297,r.angle===null?'Direction: undefined':'θ = '+fmt(r.angle)+'°',16,C.ink);
      h.text(360,347,'Blue A + purple B = green R   ·   dashed B is a translated reference',12,C.ink,'middle');
    }
  };

  if(typeof module==='object' && module.exports)module.exports=models;
  if(root)Object.assign(root.ChemistryModels || (root.ChemistryModels={}),models);
})(typeof window==='object'?window:null);
