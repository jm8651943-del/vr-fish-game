import * as THREE from '/vendor/three.module.js';

const fishTextureCache=new Map();
const labelTextureCache=new Map();

function canvas2d(w=512,h=256){
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  return [c,c.getContext('2d')];
}
function cssColor(hex){
  return '#'+Number(hex||0xffffff).toString(16).padStart(6,'0');
}
function shade(hex,amount){
  const c=new THREE.Color(hex);
  if(amount>=0)c.lerp(new THREE.Color(0xffffff),Math.min(1,amount));
  else c.lerp(new THREE.Color(0x000000),Math.min(1,-amount));
  return '#'+c.getHexString();
}
function finishTexture(canvas){
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;
  t.minFilter=THREE.LinearFilter;
  t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=false;
  return t;
}
function glow(ctx,x,y,r,color,alpha=.55){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);
  g.addColorStop(.35,color);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function fishGradient(ctx,color,x0=120,x1=390){
  const g=ctx.createLinearGradient(x0,60,x1,210);
  g.addColorStop(0,shade(color,.5));
  g.addColorStop(.38,cssColor(color));
  g.addColorStop(.72,shade(color,-.16));
  g.addColorStop(1,shade(color,-.42));
  return g;
}
function outline(ctx){
  ctx.lineWidth=10;
  ctx.strokeStyle='rgba(6,13,22,.88)';
  ctx.lineJoin='round';
  ctx.lineCap='round';
}
function drawEye(ctx,x,y,r=16){
  ctx.save();
  ctx.shadowBlur=12;ctx.shadowColor='rgba(255,255,255,.55)';
  ctx.fillStyle='#f8ffff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#111724';ctx.beginPath();ctx.arc(x+4,y,r*.48,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x+8,y-5,r*.14,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawScales(ctx,x,y,w,h,color){
  ctx.save();
  ctx.strokeStyle=shade(color,.48);
  ctx.globalAlpha=.28;
  ctx.lineWidth=2;
  const step=18;
  for(let yy=y;yy<y+h;yy+=step){
    for(let xx=x+(Math.floor((yy-y)/step)%2?step/2:0);xx<x+w;xx+=step){
      ctx.beginPath();
      ctx.arc(xx,yy,step*.48,0,Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawTail(ctx,x,y,color,size=1){
  const g=ctx.createLinearGradient(x-90*size,y,x+10*size,y);
  g.addColorStop(0,shade(color,.35));g.addColorStop(1,cssColor(color));
  ctx.fillStyle=g;outline(ctx);
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.bezierCurveTo(x-45*size,y-22*size,x-72*size,y-62*size,x-98*size,y-74*size);
  ctx.bezierCurveTo(x-88*size,y-18*size,x-88*size,y+20*size,x-100*size,y+72*size);
  ctx.bezierCurveTo(x-68*size,y+58*size,x-38*size,y+20*size,x,y);
  ctx.closePath();ctx.fill();ctx.stroke();
}
function drawFin(ctx,x,y,color,flip=1,scale=1){
  ctx.fillStyle=shade(color,.22);outline(ctx);
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x-8*scale,y+flip*40*scale,x+42*scale,y+flip*48*scale);
  ctx.quadraticCurveTo(x+20*scale,y+flip*8*scale,x,y);
  ctx.closePath();ctx.fill();ctx.stroke();
}
function standardFish(ctx,color,variant='dart'){
  glow(ctx,270,130,175,cssColor(color),.18);
  drawTail(ctx,138,132,color,1);
  const body=ctx.createLinearGradient(150,64,420,205);
  body.addColorStop(0,shade(color,.55));body.addColorStop(.4,cssColor(color));body.addColorStop(.78,shade(color,-.18));body.addColorStop(1,shade(color,-.42));
  ctx.fillStyle=body;outline(ctx);
  ctx.beginPath();
  ctx.moveTo(150,132);
  ctx.bezierCurveTo(205,54,335,54,418,116);
  ctx.bezierCurveTo(442,132,436,159,411,173);
  ctx.bezierCurveTo(332,218,208,202,150,132);
  ctx.closePath();ctx.fill();ctx.stroke();

  drawScales(ctx,205,82,168,92,color);
  drawFin(ctx,260,157,color,1,.75);
  drawFin(ctx,292,95,color,-1,.72);

  if(variant==='angler'){
    ctx.strokeStyle=shade(color,.55);ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(350,88);ctx.quadraticCurveTo(395,28,432,56);ctx.stroke();
    glow(ctx,437,55,22,'#fff27a',.95);ctx.fillStyle='#fff6a0';ctx.beginPath();ctx.arc(437,55,9,0,Math.PI*2);ctx.fill();
  }
  if(variant==='ember'){
    for(let i=0;i<5;i++){ctx.fillStyle='rgba(255,238,93,.7)';ctx.beginPath();ctx.moveTo(205+i*38,80);ctx.lineTo(224+i*38,122);ctx.lineTo(201+i*38,165);ctx.closePath();ctx.fill();}
  }
  if(variant==='comet'){
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=7;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(160,105+i*24);ctx.lineTo(70-i*22,88+i*32);ctx.stroke();}
  }
  drawEye(ctx,378,119,16);
}
function puffer(ctx,color){
  glow(ctx,280,130,175,cssColor(color),.20);
  drawTail(ctx,155,132,color,.72);
  const g=ctx.createRadialGradient(285,105,24,285,132,125);
  g.addColorStop(0,shade(color,.55));g.addColorStop(.65,cssColor(color));g.addColorStop(1,shade(color,-.35));
  ctx.fillStyle=g;outline(ctx);
  ctx.beginPath();ctx.ellipse(292,132,108,86,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI*2,r=105,x=292+Math.cos(a)*r,y=132+Math.sin(a)*r*.78;
    ctx.fillStyle=shade(color,.18);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*26,y+Math.sin(a)*26);ctx.lineTo(x+Math.cos(a+.18)*8,y+Math.sin(a+.18)*8);ctx.closePath();ctx.fill();
  }
  for(let i=0;i<15;i++){ctx.globalAlpha=.28;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(240+Math.random()*105,88+Math.random()*85,4+Math.random()*5,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;drawEye(ctx,354,109,17);
}
function rayFish(ctx,color){
  glow(ctx,280,130,190,cssColor(color),.18);
  const g=ctx.createRadialGradient(280,125,15,280,130,165);
  g.addColorStop(0,shade(color,.55));g.addColorStop(.58,cssColor(color));g.addColorStop(1,shade(color,-.42));
  ctx.fillStyle=g;outline(ctx);
  ctx.beginPath();
  ctx.moveTo(84,132);ctx.bezierCurveTo(170,82,198,42,285,66);ctx.bezierCurveTo(365,48,411,82,454,132);
  ctx.bezierCurveTo(410,184,357,207,285,192);ctx.bezierCurveTo(210,210,158,176,84,132);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=shade(color,.4);ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(280,188);ctx.bezierCurveTo(270,230,224,240,205,247);ctx.stroke();
  ctx.globalAlpha=.28;ctx.strokeStyle='#ffffff';ctx.lineWidth=4;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(185+i*44,90);ctx.quadraticCurveTo(205+i*38,132,185+i*44,176);ctx.stroke();}
  ctx.globalAlpha=1;drawEye(ctx,335,109,14);
}
function eelFish(ctx,color){
  glow(ctx,275,130,190,cssColor(color),.15);
  ctx.strokeStyle=fishGradient(ctx,color);ctx.lineWidth=66;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(112,160);ctx.bezierCurveTo(176,70,236,196,316,108);ctx.bezierCurveTo(352,70,400,81,435,120);ctx.stroke();
  ctx.strokeStyle=shade(color,.48);ctx.globalAlpha=.45;ctx.lineWidth=7;
  for(let i=0;i<7;i++){const x=160+i*36;ctx.beginPath();ctx.moveTo(x,105);ctx.lineTo(x+12,159);ctx.stroke();}
  ctx.globalAlpha=1;drawEye(ctx,414,110,15);
}
function shark(ctx,color){
  glow(ctx,280,130,195,cssColor(color),.15);
  drawTail(ctx,128,132,color,1.25);
  const g=fishGradient(ctx,color,140,440);ctx.fillStyle=g;outline(ctx);
  ctx.beginPath();ctx.moveTo(140,132);ctx.bezierCurveTo(210,66,350,65,448,122);ctx.bezierCurveTo(424,178,300,203,140,132);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=shade(color,.18);ctx.beginPath();ctx.moveTo(268,78);ctx.lineTo(314,25);ctx.lineTo(340,88);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#e5eef2';ctx.beginPath();ctx.moveTo(339,154);ctx.lineTo(433,137);ctx.lineTo(365,183);ctx.closePath();ctx.fill();
  drawEye(ctx,397,110,14);
}
function bossDragon(ctx,color){
  glow(ctx,282,130,220,cssColor(color),.22);
  ctx.strokeStyle=fishGradient(ctx,color);ctx.lineWidth=66;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(92,173);ctx.bezierCurveTo(145,56,224,208,292,90);ctx.bezierCurveTo(339,15,401,77,434,121);ctx.stroke();
  ctx.fillStyle=shade(color,.35);outline(ctx);
  for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(145+i*35,95);ctx.lineTo(164+i*35,48-(i%2)*16);ctx.lineTo(180+i*35,104);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.fillStyle=shade(color,.2);ctx.beginPath();ctx.ellipse(424,121,54,42,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff1b0';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(402+i*13,139);ctx.lineTo(408+i*13,157);ctx.lineTo(414+i*13,139);ctx.fill();}
  drawEye(ctx,439,107,15);
}
function kraken(ctx,color){
  glow(ctx,280,130,210,cssColor(color),.19);
  const g=ctx.createRadialGradient(290,95,20,290,120,100);g.addColorStop(0,shade(color,.55));g.addColorStop(.65,cssColor(color));g.addColorStop(1,shade(color,-.38));
  ctx.fillStyle=g;outline(ctx);ctx.beginPath();ctx.ellipse(290,106,84,66,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle=cssColor(color);ctx.lineWidth=28;ctx.lineCap='round';
  for(let i=0;i<7;i++){const a=(i-3)*.22;ctx.beginPath();ctx.moveTo(240+i*15,142);ctx.bezierCurveTo(210+i*18,178,166+i*34,186+Math.sin(i)*34,104+i*48,230-Math.cos(i)*25);ctx.stroke();}
  drawEye(ctx,260,96,14);drawEye(ctx,321,96,14);
}
function bossTexture(bossId,color){
  const key='boss:'+bossId+':'+color;
  if(fishTextureCache.has(key))return fishTextureCache.get(key);
  const [canvas,ctx]=canvas2d(640,320);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.scale(1.25,1.25);
  if(bossId==='magma')rayFish(ctx,color);
  else if(bossId==='void')eelFish(ctx,color);
  else if(bossId==='glacier')kraken(ctx,color);
  else if(bossId==='reactor')shark(ctx,color);
  else bossDragon(ctx,color);
  ctx.restore();
  const t=finishTexture(canvas);fishTextureCache.set(key,t);return t;
}
function fishTexture(speciesId,color,specialId=''){
  const key='fish:'+speciesId+':'+color+':'+specialId;
  if(fishTextureCache.has(key))return fishTextureCache.get(key);
  const [canvas,ctx]=canvas2d(512,256);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(speciesId==='puffer')puffer(ctx,color);
  else if(speciesId==='ray')rayFish(ctx,color);
  else if(speciesId==='eel'||speciesId==='frost')eelFish(ctx,color);
  else standardFish(ctx,color,speciesId);
  if(specialId){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='#fff2a8';ctx.lineWidth=8;ctx.globalAlpha=.75;
    ctx.strokeRect(10,10,492,236);ctx.restore();
  }
  const t=finishTexture(canvas);fishTextureCache.set(key,t);return t;
}
function labelTexture(text,color='#ffd34a',small=''){
  const key=text+'|'+color+'|'+small;
  if(labelTextureCache.has(key))return labelTextureCache.get(key);
  const [canvas,ctx]=canvas2d(512,128);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const g=ctx.createLinearGradient(0,0,512,0);g.addColorStop(0,'rgba(5,13,25,.05)');g.addColorStop(.2,'rgba(5,13,25,.88)');g.addColorStop(.8,'rgba(5,13,25,.88)');g.addColorStop(1,'rgba(5,13,25,.05)');
  ctx.fillStyle=g;ctx.fillRect(0,10,512,106);
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(80,12,352,102);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 52px system-ui';ctx.fillStyle='#ffffff';ctx.shadowBlur=16;ctx.shadowColor=color;ctx.fillText(text,256,55);
  if(small){ctx.shadowBlur=0;ctx.font='800 20px system-ui';ctx.fillStyle=color;ctx.fillText(small,256,91);}
  const t=finishTexture(canvas);labelTextureCache.set(key,t);return t;
}

export function createArcadeFishVisual({speciesId='dart',bossId=null,color=0x19dfff,specialId='',value=50,bossName=''}={}){
  const group=new THREE.Group();
  const boss=Boolean(bossId);
  const tex=boss?bossTexture(bossId,color):fishTexture(speciesId,color,specialId);
  const material=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:.04});
  const art=new THREE.Sprite(material);

  let w=1.9,h=.95;
  if(speciesId==='puffer'){w=1.45;h=1.2}
  if(speciesId==='ray'){w=2.25;h=1.2}
  if(speciesId==='eel'||speciesId==='frost'){w=2.55;h=.95}
  if(boss){w=bossId==='glacier'?5.4:6.2;h=bossId==='glacier'?3.1:2.7}

  art.scale.set(w,h,1);
  group.add(art);

  const glowMat=new THREE.SpriteMaterial({map:tex,color:specialId?0xffef9a:color,transparent:true,opacity:specialId?.22:(boss?.16:.07),depthWrite:false,blending:THREE.AdditiveBlending});
  const aura=new THREE.Sprite(glowMat);
  aura.scale.set(w*1.18,h*1.18,1);
  aura.position.z=-.02;
  group.add(aura);

  const mult=boss?Math.max(25,Math.round(value/100)):Math.max(2,Math.round(value/25));
  const badgeMat=new THREE.SpriteMaterial({map:labelTexture('×'+mult,boss?'#ffcf40':specialId?'#fff27a':'#79f8ff',boss?(bossName||'WORLD BOSS'):'TARGET VALUE'),transparent:true,depthWrite:false});
  const badge=new THREE.Sprite(badgeMat);
  badge.scale.set(boss?2.3:1.25,boss?.58:.32,1);
  badge.position.set(0,boss?1.85:.72,.03);
  group.add(badge);

  group.userData.artSprite=art;
  group.userData.auraSprite=aura;
  group.userData.badgeSprite=badge;
  return group;
}

export function flipArcadeFish(group,dir=1){
  const art=group?.userData?.artSprite;
  const aura=group?.userData?.auraSprite;
  if(!art||!aura)return;
  art.scale.x=Math.abs(art.scale.x)*(dir>=0?1:-1);
  aura.scale.x=Math.abs(aura.scale.x)*(dir>=0?1:-1);
}

export function makeHologramLabel(text,color='#79f8ff',small=''){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(text,color,small),transparent:true,depthWrite:false,depthTest:false}));
  s.scale.set(1.4,.35,1);
  return s;
}
