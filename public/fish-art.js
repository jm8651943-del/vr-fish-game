import * as THREE from '/vendor/three.module.js';
import {createFishModel,animateFishModel} from './fish-models.js';
export {animateFishModel};

const labelTextureCache=new Map();
function canvas2d(w=768,h=384){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';return [c,ctx];
}
function texture(canvas){
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
}
function resetShadow(ctx){ctx.shadowBlur=0;ctx.shadowColor='transparent'}
function labelTexture(text,color='#ffd34a',small='',cache=true){
  const key=text+'|'+color+'|'+small;
  if(cache&&labelTextureCache.has(key))return labelTextureCache.get(key);
  const [canvas,ctx]=canvas2d(768,150);
  const g=ctx.createLinearGradient(0,0,768,0);g.addColorStop(0,'rgba(2,9,18,0)');g.addColorStop(.18,'rgba(2,9,18,.92)');g.addColorStop(.82,'rgba(2,9,18,.92)');g.addColorStop(1,'rgba(2,9,18,0)');
  ctx.fillStyle=g;ctx.fillRect(0,8,768,134);
  ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(120,10,528,130);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 68px system-ui';ctx.fillStyle='#fff';ctx.shadowBlur=18;ctx.shadowColor=color;ctx.fillText(text,384,61);
  resetShadow(ctx);
  if(small){ctx.font='800 24px system-ui';ctx.fillStyle=color;ctx.fillText(small,384,111);}
  const t=texture(canvas);if(cache){t.userData.sharedResource=true;labelTextureCache.set(key,t)}return t;
}
let healthBackgroundTexture,healthForegroundTexture;
function healthSprite(){
  if(healthBackgroundTexture)return new THREE.Sprite(new THREE.SpriteMaterial({map:healthBackgroundTexture,transparent:true,depthWrite:false}));
  const [canvas,ctx]=canvas2d(512,48);
  ctx.fillStyle='rgba(0,0,0,.8)';ctx.roundRect(4,4,504,40,18);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=3;ctx.stroke();
  healthBackgroundTexture=texture(canvas);healthBackgroundTexture.userData.sharedResource=true;
  return new THREE.Sprite(new THREE.SpriteMaterial({map:healthBackgroundTexture,transparent:true,depthWrite:false}));
}
function healthFillSprite(){
  if(healthForegroundTexture)return new THREE.Sprite(new THREE.SpriteMaterial({map:healthForegroundTexture,transparent:true,depthWrite:false}));
  const [canvas,ctx]=canvas2d(512,48);
  const g=ctx.createLinearGradient(0,0,512,0);g.addColorStop(0,'#67ff9a');g.addColorStop(.65,'#ffd54a');g.addColorStop(1,'#ff5e5e');
  ctx.fillStyle=g;ctx.roundRect(6,8,500,32,14);ctx.fill();
  healthForegroundTexture=texture(canvas);healthForegroundTexture.userData.sharedResource=true;
  return new THREE.Sprite(new THREE.SpriteMaterial({map:healthForegroundTexture,transparent:true,depthWrite:false}));
}

export function createArcadeFishVisual({speciesId='dart',bossId=null,color=0x19dfff,specialId='',value=50,multiplier=2,bossName='',size=1,hp=1}={}){
  const group=new THREE.Group();
  const boss=Boolean(bossId);
  const model=createFishModel({speciesId,bossId,color,specialId,size});
  group.add(model);
  const h=boss?3.1:1.1*size;
  group.userData.model3d=model;
  const mult=Math.max(1,Math.round(Number(multiplier)||1));
  const badge=new THREE.Sprite(new THREE.SpriteMaterial({
    map:labelTexture('×'+mult,boss?'#ffcf40':specialId?'#fff27a':'#79f8ff',boss?(bossName||'WORLD BOSS'):'HP '+hp),
    transparent:true,depthWrite:false
  }));
  badge.scale.set(boss?2.65:1.38,boss?.64:.35,1);badge.position.set(0,boss?2.0:(h*.60),.03);group.add(badge);

  const hb=healthSprite(),hf=healthFillSprite();
  const barW=boss?2.8:1.25;
  hb.scale.set(barW,.10,1);hf.scale.set(barW*.96,.072,1);
  hb.position.set(0,boss?1.48:(h*.42),.04);hf.position.copy(hb.position);hf.position.z=.05;
  group.add(hb,hf);

  group.userData.badgeSprite=badge;
  group.userData.healthFill=hf;
  group.userData.healthBarWidth=barW*.96;
  return group;
}

export function updateArcadeFishHealth(group,ratio=1){
  const fill=group?.userData?.healthFill;
  const full=group?.userData?.healthBarWidth||1;
  if(!fill)return;
  const r=Math.max(0,Math.min(1,ratio));
  fill.scale.x=Math.max(.001,full*r);
  fill.position.x=-(full-fill.scale.x)/2;
  fill.visible=r<.999;
}

export function flipArcadeFish(group,dir=1){
  const model=group?.userData?.model3d;
  if(model)model.rotation.y=dir>=0?0:Math.PI;
}

export function makeHologramLabel(text,color='#79f8ff',small=''){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(text,color,small,false),transparent:true,depthWrite:false,depthTest:false}));
  s.scale.set(1.4,.35,1);
  return s;
}
