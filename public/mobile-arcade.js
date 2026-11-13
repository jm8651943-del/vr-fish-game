// Fish Arena mobile input bridge; no changes to XR, server balances, or payments.
// The existing gameplay engine owns movement and firing through its keyboard
// and canvas pointer handlers. This module translates touch UI into those inputs.
const shell=document.querySelector('#mobileArcade');
const stick=document.querySelector('#mobileMoveZone');
const thumb=document.querySelector('#mobileMoveThumb');
const fireButton=document.querySelector('#mobileFire');
const reloadButton=document.querySelector('#mobileReload');
const superButton=document.querySelector('#mobileSuper');
const startButton=document.querySelector('#vr');
const canvas=document.querySelector('#c');
const held=new Set();
let stickPointer=null;
let firePointer=null;
let aimX=innerWidth/2, aimY=innerHeight/2;
const coarse=()=>matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const useMobile=()=>coarse()&&!document.body.classList.contains('xr-active');
function key(k,type){window.dispatchEvent(new KeyboardEvent(type,{key:k,bubbles:true,cancelable:true}));}
function setKeys(next){
  for(const k of held)if(!next.has(k))key(k,'keyup');
  for(const k of next)if(!held.has(k))key(k,'keydown');
  held.clear();for(const k of next)held.add(k);
}
function resetStick(){stickPointer=null;setKeys(new Set());thumb.style.transform='translate(-50%,-50%)';}
function resetFire(){
  if(firePointer===null)return;
  firePointer=null;
  fireButton.classList.remove('held');
  // Existing window pointerup handler releases continuous firing.
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));
}
function resetAll(){resetStick();resetFire();}
function sync(){
  const show=useMobile();
  shell.hidden=!show;
  if(!show)resetAll();
  if(show&&startButton?.dataset.mode==='desktop'&&!startButton.disabled)startButton.textContent='START GAME';
}
function moveStick(e){
  const rect=stick.getBoundingClientRect();
  const dx=(e.clientX-(rect.left+rect.width/2))/(rect.width/2);
  const dy=(e.clientY-(rect.top+rect.height/2))/(rect.height/2);
  const len=Math.max(1,Math.hypot(dx,dy));
  const x=dx/len,y=dy/len;
  thumb.style.transform=`translate(calc(-50% + ${x*35}px),calc(-50% + ${y*35}px))`;
  const next=new Set();
  if(x<-.24)next.add('a');else if(x>.24)next.add('d');
  if(y<-.24)next.add('w');else if(y>.24)next.add('s');
  setKeys(next);
}
stick.addEventListener('pointerdown',e=>{
  if(!useMobile()||stickPointer!==null)return;
  e.preventDefault();e.stopPropagation();
  stickPointer=e.pointerId;
  stick.setPointerCapture?.(e.pointerId);
  moveStick(e);
});
stick.addEventListener('pointermove',e=>{
  if(e.pointerId===stickPointer){e.preventDefault();e.stopPropagation();moveStick(e);}
});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
  stick.addEventListener(type,e=>{if(e.pointerId===stickPointer){e.stopPropagation();resetStick();}});
}
canvas.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||e.pointerType==='pen'){
    aimX=e.clientX;aimY=e.clientY;
  }
});
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.pointerType==='pen'){
    aimX=e.clientX;aimY=e.clientY;
  }
});
fireButton.addEventListener('pointerdown',e=>{
  if(!useMobile()||firePointer!==null||e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  firePointer=e.pointerId;fireButton.setPointerCapture?.(e.pointerId);
  fireButton.classList.add('held');
  // Dispatch to canvas because the existing firing handler checks target===canvas.
  canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',clientX:aimX,clientY:aimY}));
});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
  fireButton.addEventListener(type,e=>{if(e.pointerId===firePointer){e.stopPropagation();resetFire();}});
}
for(const [button,k] of [[reloadButton,'r'],[superButton,'e']]){
  button.addEventListener('click',e=>{
    if(!useMobile())return;
    e.preventDefault();e.stopPropagation();
    key(k,'keydown');key(k,'keyup');
  });
}
window.addEventListener('blur',resetAll);
window.addEventListener('pagehide',resetAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAll();});
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
matchMedia('(pointer:coarse)').addEventListener?.('change',sync);
window.addEventListener('resize',sync);
sync();
