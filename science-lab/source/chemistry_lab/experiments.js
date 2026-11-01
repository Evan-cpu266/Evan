/* Shared, offline experiment player. All diagrams use safe SVG DOM methods. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const format = value => {
    if (typeof value !== 'number') return String(value === undefined ? '—' : value);
    if (!Number.isFinite(value)) return '—';
    if (value === 0) return '0';
    if (Math.abs(value) < .001 || Math.abs(value) >= 1e6) return value.toExponential(3);
    return Number(value.toFixed(4)).toLocaleString('en-US');
  };
  const CSS = `.chem-experiment{color:#172a37;font-family:inherit;min-width:0}.chem-experiment *{box-sizing:border-box}.chem-experiment .ce-note{margin:0 0 20px;padding:15px 18px;background:#f0edf8;border:1px solid #e4dff0;border-radius:13px;font-size:13px;line-height:1.7;color:#5b5570}.chem-experiment .ce-layout{display:grid;grid-template-columns:minmax(190px,240px) minmax(0,1fr);gap:23px;align-items:start}.chem-experiment .ce-fields{display:grid;gap:15px}.chem-experiment .ce-field{display:grid;gap:7px;font-size:12px;font-weight:650;min-width:0}.chem-experiment .ce-input-wrap{display:flex;align-items:center;min-width:0;background:#fff;border:1px solid #d8dfe4;border-radius:10px;overflow:hidden}.chem-experiment input[type=number],.chem-experiment .ce-field select{width:100%;min-width:0;border:0;background:transparent;padding:12px 11px;font:inherit;font-size:14px;color:#172a37;border-radius:9px}.chem-experiment .ce-field select{border:1px solid #d8dfe4;background:#fff}.chem-experiment .ce-unit{padding:0 10px 0 0;color:#6a7781;font-size:11px;white-space:nowrap}.chem-experiment .ce-stage{min-width:0;overflow:hidden;border-radius:17px;border:1px solid #dce1e7;background:#f7f9fc}.chem-experiment svg{display:block;width:100%;height:auto;aspect-ratio:2/1;min-width:0}.chem-experiment .ce-readout{display:block;padding:13px 16px;border-top:1px solid #e0e5eb;font-size:12px;line-height:1.8;min-height:54px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.chem-experiment .ce-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:20px 0 12px}.chem-experiment button,.chem-experiment .ce-speed select{font:inherit;color:inherit;border:1px solid #d8dfe4;border-radius:9px;padding:11px 15px;background:#fff;cursor:pointer;font-size:13px}.chem-experiment #coursePlaySimulation{min-width:130px;background:#343b8d;color:#fff;font-weight:700;border-color:#343b8d}.chem-experiment button:disabled{opacity:.45;cursor:not-allowed}.chem-experiment .ce-speed{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:#6a7482}.chem-experiment .ce-speed select{padding:9px}.chem-experiment .ce-timeline{display:flex;align-items:center;gap:12px;color:#697582;font-size:11px}.chem-experiment .ce-timeline input{flex:1;min-width:0;width:100%;accent-color:#5b57a6}.chem-experiment #courseSimulationTime{white-space:nowrap;min-width:90px;text-align:right;font-variant-numeric:tabular-nums}.chem-experiment .ce-error{font-size:13px;line-height:1.6;color:#a52c49;margin:13px 0;min-height:21px}.chem-experiment .ce-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}.chem-experiment .ce-result{border-radius:12px;padding:16px;background:#eef2f8;min-width:0}.chem-experiment .ce-result small{display:block;color:#687585;font-size:11px;line-height:1.6;margin-bottom:6px}.chem-experiment .ce-result strong{font-size:17px;font-weight:650;line-height:1.6;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.chem-experiment .ce-result .ce-result-unit{font-size:11px;color:#687585;font-weight:500}.chem-experiment input:focus-visible,.chem-experiment select:focus-visible,.chem-experiment button:focus-visible{outline:3px solid #9b85df;outline-offset:3px}@media(max-width:760px){.chem-experiment .ce-layout{grid-template-columns:1fr;gap:17px}.chem-experiment .ce-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.chem-experiment .ce-note{font-size:12px;padding:13px 14px}.chem-experiment svg{min-height:175px}.chem-experiment .ce-readout{font-size:11px;padding:11px 12px}.chem-experiment .ce-speed{margin-left:0}.chem-experiment .ce-results{grid-template-columns:repeat(2,minmax(0,1fr))}.chem-experiment .ce-result{padding:13px}.chem-experiment .ce-result strong{font-size:15px}}@media(max-width:360px){.chem-experiment .ce-field{font-size:11px}.chem-experiment input[type=number],.chem-experiment .ce-field select{padding:11px 8px;font-size:13px}.chem-experiment .ce-unit{font-size:9px;padding-right:7px}.chem-experiment .ce-timeline{gap:7px;font-size:10px}.chem-experiment button{font-size:12px;padding:11px 13px}}`;
  function node(tag,attrs,text) {
    const n=document.createElement(tag);
    for(const [key,value] of Object.entries(attrs||{})) n.setAttribute(key,String(value));
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function mount(host,type) {
    const model=root.ChemistryModels && root.ChemistryModels[type];
    if(!host || !model)throw new Error('Choose a supported chemistry simulator.');
    let inputs=Object.fromEntries(model.fields.map(f=>[f.key,f.value]));
    let elapsed=0, running=false, raf=0, last=0, rate=1, destroyed=false;
    let currentResult={valid:false},currentSample={};
    const wrapper=node('section',{'class':'chem-experiment','aria-label':model.title});
    const style=node('style',{},CSS);wrapper.append(style);
    if(model.note)wrapper.append(node('p',{'class':'ce-note'},model.note));
    const layout=node('div',{'class':'ce-layout'}),fields=node('div',{'class':'ce-fields'}),stage=node('div',{'class':'ce-stage'});
    const controls=new Map();
    for(const field of model.fields){
      const label=node('label',{'class':'ce-field','for':'chemInput-'+field.key});
      label.append(node('span',{},field.label));
      let input;
      if(field.type==='select'){
        input=node('select',{'id':'chemInput-'+field.key,'data-input':field.key});
        for(const option of field.options||[]){
          const choice=typeof option==='object'?option:{value:option,label:option};
          input.append(node('option',{'value':choice.value},choice.label));
        }
        input.value=String(field.value);label.append(input);
      }else{
        const attrs={'id':'chemInput-'+field.key,'data-input':field.key,'type':'number','inputmode':'decimal'};
        for(const key of ['min','max','step'])if(field[key]!==undefined)attrs[key]=field[key];
        if(attrs.step===undefined)attrs.step='any';
        input=node('input',attrs);input.value=String(field.value);
        const wrap=node('span',{'class':'ce-input-wrap'});wrap.append(input);
        if(field.unit)wrap.append(node('span',{'class':'ce-unit'},field.unit));
        label.append(wrap);
      }
      controls.set(field.key,input);fields.append(label);
    }
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('id','courseSimulationScene');svg.setAttribute('viewBox','0 0 720 360');
    svg.setAttribute('role','img');svg.setAttribute('aria-label',model.title+' animated model');
    const readout=node('output',{'id':'courseSimulationMeasurements','class':'ce-readout','aria-live':'off'});
    stage.append(svg,readout);layout.append(fields,stage);wrapper.append(layout);
    const toolbar=node('div',{'class':'ce-controls'});
    const playButton=node('button',{'id':'coursePlaySimulation','type':'button','aria-pressed':'false'},'Play simulator');
    const resetButton=node('button',{'id':'courseResetSimulation','type':'button'},'Reset');
    const speedLabel=node('label',{'class':'ce-speed','for':'courseSimulationRate'},'Playback speed');
    const speed=node('select',{'id':'courseSimulationRate'});
    for(const value of [.25,.5,1,2])speed.append(node('option',{'value':value},value+'×'));
    speed.value='1';speedLabel.append(speed);toolbar.append(playButton,resetButton,speedLabel);wrapper.append(toolbar);
    const timeline=node('div',{'class':'ce-timeline'});
    const progress=node('input',{'type':'range','id':'courseSimulationProgress','min':0,'max':1000,'step':1,'value':0,'aria-label':'Simulation playback timeline'});
    const clock=node('output',{'id':'courseSimulationTime'},'0 / 6 s');
    timeline.append(node('label',{'for':'courseSimulationProgress'},'Playback'),progress,clock);wrapper.append(timeline);
    const error=node('div',{'class':'ce-error','role':'status','id':'courseSimulationError'});
    const results=node('div',{'class':'ce-results','id':'courseSimulationResults'});
    wrapper.append(error,results);host.replaceChildren(wrapper);
    const h={
      el(tag,attrs,text,parent){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);(parent||svg).append(n);return n;},
      line(x1,y1,x2,y2,color,width){return h.el('line',{x1,y1,x2,y2,stroke:color||'#b7c4d1','stroke-width':width===undefined?2:width,'stroke-linecap':'round'});},
      rect(x,y,width,height,fill,r){return h.el('rect',{x,y,width:Math.max(0,width),height:Math.max(0,height),fill:fill||'#e9edf6',rx:r===undefined?8:r});},
      circle(cx,cy,r,fill){return h.el('circle',{cx,cy,r:Math.max(0,r),fill:fill||'#7a74bd'});},
      text(x,y,text,size,color,anchor){return h.el('text',{x,y,'font-family':'system-ui,sans-serif','font-size':size||14,fill:color||'#566575','text-anchor':anchor||'start'},text);},
      path(d,attrs){return h.el('path',Object.assign({d,fill:'none',stroke:'#9a99bf','stroke-width':2},attrs||{}));},
      atom(x,y,label,color,r){h.circle(x,y,r===undefined?18:r,color||'#7a74bd');return h.text(x,y+5,label,14,'#fff','middle');},
      format
    };
    function duration(){let d=typeof model.duration==='function'?model.duration(inputs):model.duration;return Number.isFinite(d)&&d>0?clamp(d,.1,120):6;}
    function evaluate(){
      for(const field of model.fields)if(field.type!=='select'&&!Number.isFinite(inputs[field.key]))return {valid:false,error:'Enter a finite number in every field.'};
      try{
        const result=model.calculate({...inputs});
        if(!result||result.valid===false)return result||{valid:false,error:'Check the experiment values.'};
        if((result.values||[]).some(v=>typeof v.value==='number'&&!Number.isFinite(v.value)))return {valid:false,error:'These values exceed the model’s supported range.'};
        return Object.assign({valid:true},result);
      }catch(_){return {valid:false,error:'Check that the values are within the supported ranges.'};}
    }
    function buttonState(){playButton.textContent=running?'Pause':'Play simulator';playButton.setAttribute('aria-pressed',String(running));}
    function render(updateResults){
      if(destroyed)return;
      const d=duration();elapsed=clamp(elapsed,0,d);const p=elapsed/d;
      currentResult=evaluate();currentSample={};svg.replaceChildren();
      if(currentResult.valid){
        try{
          currentSample=model.sample?model.sample({...inputs},currentResult,p)||{}:{};
          if((currentSample.values||[]).some(v=>typeof v.value==='number'&&!Number.isFinite(v.value)))throw new Error('Non-finite sample');
          model.draw(svg,{...inputs},currentResult,currentSample,p,h);
        }catch(_){currentResult={valid:false,error:'This combination is outside the diagram’s supported range.'};}
      }
      if(!currentResult.valid){
        pause();svg.replaceChildren();h.rect(0,0,720,360,'#f4f5fa',0);h.text(360,165,'Adjust the experiment values',22,'#6a7089','middle');h.text(360,198,'The simulation will resume when the values are valid.',14,'#70798a','middle');
        readout.textContent='Paused. '+(currentResult.error||'Check the values.');
      }else{
        const values=(currentSample.values&&currentSample.values.length)?currentSample.values:currentResult.values||[];
        readout.textContent=values.map(v=>v.label+': '+format(v.value)+(v.unit?' '+v.unit:'')).join(' · ');
      }
      if(updateResults){results.replaceChildren();if(currentResult.valid)for(const value of currentResult.values||[]){
        const card=node('div',{'class':'ce-result'}),strong=node('strong',{},format(value.value));
        if(value.unit)strong.append(node('span',{'class':'ce-result-unit'},' '+value.unit));
        card.append(node('small',{},value.label),strong);results.append(card);
      }}
      error.textContent=currentResult.valid?'':currentResult.error||'Check the experiment values.';
      playButton.disabled=!currentResult.valid;progress.disabled=!currentResult.valid;
      progress.value=String(p*1000);clock.textContent=format(elapsed)+' / '+format(d)+' s';buttonState();
    }
    function pause(){running=false;if(raf)root.cancelAnimationFrame(raf);raf=0;last=0;if(!destroyed)buttonState();}
    function frame(timestamp){
      if(!running||destroyed)return;
      if(last)elapsed+=Math.min(.1,Math.max(0,(timestamp-last)/1000))*rate;
      last=timestamp;
      if(elapsed>=duration()){elapsed=duration();pause();render(false);return;}
      render(false);if(running)raf=root.requestAnimationFrame(frame);
    }
    function play(){if(destroyed)return;render(false);if(!currentResult.valid)return;if(elapsed>=duration())elapsed=0;if(running)return;running=true;last=0;buttonState();raf=root.requestAnimationFrame(frame);}
    function reset(){if(destroyed)return;pause();elapsed=0;render(true);}
    function seek(seconds){if(destroyed)return;pause();elapsed=clamp(Number(seconds)||0,0,duration());render(false);}
    function updateInputs(){
      pause();inputs=Object.fromEntries(model.fields.map(field=>{const input=controls.get(field.key);return [field.key,field.type==='select'?input.value:(input.value.trim()===''?NaN:Number(input.value))];}));
      elapsed=0;render(true);
    }
    for(const input of controls.values()){input.addEventListener('input',updateInputs);input.addEventListener('change',updateInputs);}
    playButton.addEventListener('click',()=>running?pause():play());resetButton.addEventListener('click',reset);
    progress.addEventListener('input',()=>seek(Number(progress.value)/1000*duration()));
    speed.addEventListener('change',()=>{rate=clamp(Number(speed.value)||1,.25,2);last=0;});
    const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);
    render(true);
    return {play,pause,reset,seek,redraw:()=>render(true),inspect:()=>({type,inputs:{...inputs},valid:currentResult.valid,result:currentResult,animation:{running,elapsed,duration:duration(),sample:currentSample}}),destroy(){if(destroyed)return;pause();destroyed=true;document.removeEventListener('visibilitychange',visibility);host.replaceChildren();}};
  }
  root.ChemistryExperiments=Object.freeze({supported:Object.freeze(Object.keys(root.ChemistryModels||{})),mount});
})(window);
