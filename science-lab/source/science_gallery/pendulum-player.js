/* Pointer and keyboard controls for Orbit Science's pendulum only. */
(function(root){
  'use strict';
  const original=root.ChemistryExperiments;
  const TYPE='physics-pendulum';
  const clamp=value=>Math.max(-90,Math.min(90,value));
  function mount(host,type){
    const player=original.mount(host,type);
    if(type!==TYPE)return player;
    const model=root.ChemistryModels[TYPE],geometry=model.interaction;
    const svg=host.querySelector('#courseSimulationScene');
    const angleInput=host.querySelector('[data-input="angle"]');
    const measurements=host.querySelector('#courseSimulationMeasurements');
    let dragging=false,pointerId=null,offset={x:0,y:0},destroyed=false,writingAngle=false,cancelled=false;
    const style=document.createElement('style');
    style.textContent='.pendulum-interactive #courseSimulationScene{touch-action:none;user-select:none;-webkit-user-select:none}.pendulum-interactive [data-pendulum-bob]{cursor:grab;outline:none}.pendulum-interactive [data-pendulum-bob]:focus-visible circle{stroke:#125db7;stroke-width:4}.pendulum-interactive[data-dragging="true"] #courseSimulationScene,.pendulum-interactive[data-dragging="true"] [data-pendulum-bob]{cursor:grabbing}.pendulum-drag-status{display:grid;grid-template-columns:minmax(0,1fr) 112px;align-items:center;gap:12px;min-height:72px;padding:13px 16px;background:#eef5ff;border-bottom:1px solid #dce5f1;font-size:12px;line-height:1.6;color:#3d546d}.pendulum-drag-status>span{min-height:40px;display:flex;align-items:center}.pendulum-drag-status strong{text-align:right;color:#173b64;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:16px}.pendulum-interactive[data-dragging="true"] .pendulum-drag-status{background:#fff3db}.pendulum-interactive[data-dragging="true"] #pendulumLiveAngle{color:#845000}@media(max-width:760px){.pendulum-drag-status{grid-template-columns:1fr;gap:4px;min-height:100px}.pendulum-drag-status strong{text-align:left}}';
    host.prepend(style);host.classList.add('pendulum-interactive');
    const status=document.createElement('div');status.className='pendulum-drag-status';
    const hint=document.createElement('span');hint.id='pendulumDragHint';hint.setAttribute('role','status');
    const live=document.createElement('strong');live.id='pendulumLiveAngle';live.setAttribute('aria-label','Live angle from downward vertical');
    status.append(hint,live);svg.before(status);
    function currentAngle(){const state=player.inspect();return dragging?state.inputs.angle:Number.isFinite(state.animation.sample?.angle)?state.animation.sample.angle:state.inputs.angle;}
    function updateStatus(){
      if(destroyed)return;
      const state=player.inspect(),angle=currentAngle();
      live.textContent=Number.isFinite(angle)?'θ = '+(Object.is(angle,-0)?0:angle).toFixed(1)+'°':'θ = —';
      hint.textContent=dragging?'Release the bob to start from this angle.':cancelled?'Drag cancelled. Press Play or drag again.':state.animation.running?'Drag the bob to choose a new release angle.':'Drag the bob, or enter an angle and press Play.';
      host.dataset.dragging=String(dragging);
    }
    function localPoint(event){
      const matrix=svg.getScreenCTM();if(!matrix)return null;
      try{const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const result=point.matrixTransform(matrix.inverse());return Number.isFinite(result.x)&&Number.isFinite(result.y)?result:null;}catch(_){return null;}
    }
    function bobPoint(){const angle=currentAngle()*Math.PI/180;return {x:geometry.pivotX+geometry.lengthPixels*Math.sin(angle),y:geometry.pivotY+geometry.lengthPixels*Math.cos(angle)};}
    function onBob(event){
      if(event.target?.closest?.('[data-pendulum-bob]'))return true;
      const point=bobPoint(),matrix=svg.getScreenCTM();if(!matrix)return false;
      const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const screen=p.matrixTransform(matrix);
      return Math.hypot(event.clientX-screen.x,event.clientY-screen.y)<=24;
    }
    function setAngle(angle){
      if(!Number.isFinite(angle))return;
      const rounded=Math.round(clamp(angle)*10)/10;
      writingAngle=true;
      try{angleInput.value=String(Object.is(rounded,-0)?0:rounded);angleInput.dispatchEvent(new Event('input',{bubbles:true}));}
      finally{writingAngle=false;}
      updateStatus();
    }
    function applyPointer(event){const point=localPoint(event);if(!point)return;const dx=point.x-offset.x-geometry.pivotX,dy=point.y-offset.y-geometry.pivotY;setAngle(Math.atan2(dx,dy)*180/Math.PI);}
    function releaseCapture(id){if(id===null)return;try{if(svg.hasPointerCapture?.(id))svg.releasePointerCapture(id);}catch(_){} }
    function cancelDrag(showMessage=true){
      if(!dragging)return;
      const id=pointerId;dragging=false;pointerId=null;cancelled=showMessage;
      player.pause();releaseCapture(id);updateStatus();
    }
    function down(event){
      if(destroyed||dragging||event.isPrimary===false||event.button!==0||!player.inspect().valid||!onBob(event))return;
      const point=localPoint(event);if(!point)return;
      event.preventDefault();
      const center=bobPoint(),angle=currentAngle();offset={x:point.x-center.x,y:point.y-center.y};
      // Finish any native field edit before dragging changes its value. Leaving
      // the angle field focused would commit a delayed change when Pause is
      // clicked, resetting the player just before the button's click handler.
      if(host.contains(document.activeElement)&&document.activeElement?.matches('input,select,textarea'))document.activeElement.blur();
      player.pause();dragging=true;pointerId=event.pointerId;cancelled=false;setAngle(angle);
      try{svg.setPointerCapture(event.pointerId);}catch(_){}
      updateStatus();
    }
    function move(event){if(!dragging||event.pointerId!==pointerId)return;event.preventDefault();applyPointer(event);}
    function up(event){
      if(!dragging||event.pointerId!==pointerId)return;
      event.preventDefault();applyPointer(event);
      const id=pointerId;dragging=false;pointerId=null;cancelled=false;releaseCapture(id);
      player.play();updateStatus();
    }
    function pointerCancel(event){if(dragging&&event.pointerId===pointerId)cancelDrag();}
    function lostCapture(event){if(dragging&&event.pointerId===pointerId)cancelDrag();}
    function captureInput(){if(!writingAngle&&dragging)cancelDrag(false);}
    function captureChange(event){
      const control=event.target,key=control?.dataset?.input;
      if(key){
        const value=control.tagName==='SELECT'?control.value:control.value.trim()===''?NaN:Number(control.value);
        const current=player.inspect().inputs[key];
        // Number fields already update on input. Their later native change
        // must not redraw and remove the bob as keyboard focus moves to it.
        if(Object.is(value,current)){
          event.stopPropagation();updateStatus();return;
        }
      }
      captureInput();
    }
    function input(){if(!writingAngle){cancelled=false;updateStatus();}}
    function captureClick(event){if(event.target?.closest?.('button')&&dragging)cancelDrag(false);}
    function click(){cancelled=false;updateStatus();}
    function key(event){
      if(event.key==='Escape'&&dragging){event.preventDefault();cancelDrag();return;}
      if(!event.target?.closest?.('[data-pendulum-bob]'))return;
      const change={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[event.key];
      if(change){event.preventDefault();cancelled=false;const value=currentAngle();player.pause();setAngle(value+change*(event.shiftKey?10:1));svg.querySelector('[data-pendulum-bob]')?.focus({preventScroll:true});}
      else if(event.key==='Enter'||event.code==='Space'){event.preventDefault();cancelDrag(false);cancelled=false;player.play();updateStatus();}
    }
    function escape(event){if(event.key==='Escape'&&dragging){event.preventDefault();cancelDrag();}}
    function hidden(){if(document.hidden){cancelDrag(false);player.pause();updateStatus();}}
    function blur(){cancelDrag();}
    svg.addEventListener('pointerdown',down);
    svg.addEventListener('lostpointercapture',lostCapture);
    svg.addEventListener('keydown',key);
    root.addEventListener('pointermove',move,{passive:false});
    root.addEventListener('pointerup',up,{passive:false});
    root.addEventListener('pointercancel',pointerCancel);
    root.addEventListener('blur',blur);
    root.addEventListener('keydown',escape);
    document.addEventListener('visibilitychange',hidden);
    host.addEventListener('input',captureInput,true);host.addEventListener('input',input);
    host.addEventListener('change',captureChange,true);host.addEventListener('change',input);
    host.addEventListener('click',captureClick,true);host.addEventListener('click',click);
    const observer=new MutationObserver(updateStatus);observer.observe(measurements,{childList:true,characterData:true,subtree:true});
    updateStatus();
    return {
      play(){cancelDrag(false);cancelled=false;player.play();updateStatus();},
      pause(){cancelDrag(false);player.pause();updateStatus();},
      reset(){cancelDrag(false);cancelled=false;player.reset();updateStatus();},
      seek(time){cancelDrag(false);cancelled=false;player.seek(time);updateStatus();},
      redraw(){player.redraw();updateStatus();},
      inspect(){return {...player.inspect(),interaction:{dragging,angle:currentAngle(),pointerId}};},
      destroy(){
        if(destroyed)return;cancelDrag(false);destroyed=true;observer.disconnect();
        svg.removeEventListener('pointerdown',down);svg.removeEventListener('lostpointercapture',lostCapture);svg.removeEventListener('keydown',key);
        root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',pointerCancel);root.removeEventListener('blur',blur);root.removeEventListener('keydown',escape);
        document.removeEventListener('visibilitychange',hidden);
        host.removeEventListener('input',captureInput,true);host.removeEventListener('input',input);host.removeEventListener('change',captureChange,true);host.removeEventListener('change',input);host.removeEventListener('click',captureClick,true);host.removeEventListener('click',click);
        host.classList.remove('pendulum-interactive');delete host.dataset.dragging;player.destroy();
      }
    };
  }
  root.ChemistryExperiments=Object.freeze({...original,mount});
})(window);
