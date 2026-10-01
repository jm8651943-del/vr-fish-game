import * as THREE from '/vendor/three.module.js';

const fishTextureCache=new Map();
const labelTextureCache=new Map();

function canvas2d(w=768,h=384){
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  return [c,ctx];
}
function css(hex){return '#'+Number(hex||0xffffff).toString(16).padStart(6,'0')}
function shade(hex,n){
  const c=new THREE.Color(hex);
  c.lerp(new THREE.Color(n>=0?0xffffff:0x000000),Math.min(1,Math.abs(n)));
  return '#'+c.getHexString();
}
function texture(canvas){
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;
  t.minFilter=THREE.LinearFilter;
  t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=false;
  return t;
}
function metallicGradient(ctx,color,x0,y0,x1,y1){
  const g=ctx.createLinearGradient(x0,y0,x1,y1);
  g.addColorStop(0,shade(color,.72));
  g.addColorStop(.18,shade(color,.32));
  g.addColorStop(.48,css(color));
  g.addColorStop(.73,shade(color,-.20));
  g.addColorStop(1,shade(color,-.52));
  return g;
}
function rim(ctx,color,blur=18){
  ctx.shadowColor=css(color);ctx.shadowBlur=blur;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.strokeStyle='rgba(2,8,16,.94)';ctx.lineWidth=11;
}
function resetShadow(ctx){ctx.shadowBlur=0;ctx.shadowColor='transparent'}
function glow(ctx,x,y,r,color,a=.22){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(.5,color);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function eye(ctx,x,y,r=20,angry=false){
  ctx.save();
  ctx.fillStyle='#f8ffff';ctx.shadowBlur=12;ctx.shadowColor='#ffffffaa';
  ctx.beginPath();ctx.ellipse(x,y,r,r*.82,0,0,Math.PI*2);ctx.fill();
  resetShadow(ctx);
  ctx.fillStyle='#08111d';ctx.beginPath();ctx.arc(x+r*.22,y,r*.48,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+r*.38,y-r*.22,r*.13,0,Math.PI*2);ctx.fill();
  if(angry){ctx.strokeStyle='#06101a';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-r,y-r*.8);ctx.lineTo(x+r*.75,y-r*.35);ctx.stroke();}
  ctx.restore();
}
function scalePattern(ctx,x,y,w,h,color,alpha=.28){
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=shade(color,.7);ctx.lineWidth=2;
  for(let yy=y;yy<y+h;yy+=22){
    for(let xx=x+(Math.floor((yy-y)/22)%2?11:0);xx<x+w;xx+=22){
      ctx.beginPath();ctx.arc(xx,yy,11,0,Math.PI);ctx.stroke();
    }
  }
  ctx.restore();
}
function fin(ctx,points,color){
  ctx.save();rim(ctx,color,10);ctx.fillStyle=metallicGradient(ctx,color,points[0][0],points[0][1],points[2][0],points[2][1]);
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
  ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);
  ctx.restore();
}
function tail(ctx,x,y,color,s=1){
  ctx.save();rim(ctx,color,12);ctx.fillStyle=metallicGradient(ctx,color,x-130*s,y-90*s,x,y+70*s);
  ctx.beginPath();ctx.moveTo(x,y);
  ctx.bezierCurveTo(x-45*s,y-25*s,x-100*s,y-85*s,x-138*s,y-96*s);
  ctx.bezierCurveTo(x-120*s,y-30*s,x-118*s,y+30*s,x-140*s,y+94*s);
  ctx.bezierCurveTo(x-92*s,y+78*s,x-42*s,y+25*s,x,y);
  ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);ctx.restore();
}
function basicBody(ctx,color,{x=380,y=190,rx=235,ry=102,nose=620}={}){
  ctx.save();rim(ctx,color,20);ctx.fillStyle=metallicGradient(ctx,color,180,80,650,300);
  ctx.beginPath();ctx.moveTo(170,y);
  ctx.bezierCurveTo(250,y-ry,470,y-ry-18,nose,y-18);
  ctx.bezierCurveTo(nose+30,y,nose+12,y+35,nose-18,y+50);
  ctx.bezierCurveTo(485,y+ry+20,260,y+ry,170,y);
  ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);ctx.restore();
}

function clownfish(ctx){
  const orange=0xff7a18;
  glow(ctx,390,190,250,'#ff7a18',.20);
  tail(ctx,190,194,orange,.96);
  basicBody(ctx,orange,{x:390,y:194,rx:230,ry:100,nose:625});
  fin(ctx,[[355,105],[390,54],[425,112]],orange);
  fin(ctx,[[355,258],[396,318],[432,247]],orange);
  // iconic white bands with black borders
  const bands=[[285,142,36,118],[405,118,42,156],[520,128,34,132]];
  ctx.save();
  for(const [x,y,w,h] of bands){
    ctx.strokeStyle='#101419';ctx.lineWidth=13;ctx.fillStyle='#f7f3dc';
    ctx.beginPath();ctx.roundRect(x,y,w,h,18);ctx.fill();ctx.stroke();
  }
  ctx.restore();
  scalePattern(ctx,215,120,330,142,orange,.18);
  eye(ctx,570,165,18);
  ctx.strokeStyle='#15191d';ctx.lineWidth=6;ctx.beginPath();ctx.arc(610,204,28,.2,1.8);ctx.stroke();
}
function puffer(ctx,color=0xe8b84b){
  glow(ctx,390,190,250,css(color),.23);
  tail(ctx,245,194,color,.68);
  ctx.save();rim(ctx,color,18);
  const g=ctx.createRadialGradient(410,145,35,405,195,155);g.addColorStop(0,'#fff2a8');g.addColorStop(.48,css(color));g.addColorStop(1,shade(color,-.42));
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(410,194,155,132,0,0,Math.PI*2);ctx.fill();ctx.stroke();resetShadow(ctx);
  for(let i=0;i<30;i++){
    const a=i/30*Math.PI*2;
    const x=410+Math.cos(a)*154,y=194+Math.sin(a)*128;
    ctx.fillStyle=shade(color,.18);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*38,y+Math.sin(a)*38);ctx.lineTo(x+Math.cos(a+.11)*12,y+Math.sin(a+.11)*12);ctx.closePath();ctx.fill();
  }
  for(let i=0;i<26;i++){const a=i*2.399;const rr=35+(i%6)*15;ctx.fillStyle=i%2?'#4b3320':'#fff0a8';ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(410+Math.cos(a)*rr,194+Math.sin(a)*rr*.8,4+(i%3),0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;eye(ctx,495,156,20);ctx.restore();
}
function stingray(ctx,color=0x4aa3bd){
  glow(ctx,390,190,275,css(color),.18);
  ctx.save();rim(ctx,color,18);ctx.fillStyle=metallicGradient(ctx,color,170,80,620,300);
  ctx.beginPath();ctx.moveTo(85,194);ctx.bezierCurveTo(190,150,235,72,390,88);ctx.bezierCurveTo(535,72,600,145,690,194);
  ctx.bezierCurveTo(580,235,520,310,390,292);ctx.bezierCurveTo(245,310,175,245,85,194);ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);
  // wing ribs
  ctx.globalAlpha=.30;ctx.strokeStyle='#e8ffff';ctx.lineWidth=4;
  for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(270+i*40,120);ctx.quadraticCurveTo(300+i*30,194,260+i*45,265);ctx.stroke();}
  ctx.globalAlpha=1;
  // sting tail
  ctx.strokeStyle=shade(color,.15);ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(390,286);ctx.bezierCurveTo(410,330,350,350,250,372);ctx.stroke();
  ctx.fillStyle='#0c1218';ctx.beginPath();ctx.moveTo(270,362);ctx.lineTo(234,380);ctx.lineTo(267,348);ctx.fill();
  eye(ctx,445,145,15);eye(ctx,405,145,15);ctx.restore();
}
function marlin(ctx,color=0x1686d9){
  glow(ctx,405,190,280,'#38aaff',.16);
  tail(ctx,180,196,color,1.0);
  ctx.save();rim(ctx,color,17);ctx.fillStyle=metallicGradient(ctx,color,170,85,630,285);
  ctx.beginPath();ctx.moveTo(170,196);ctx.bezierCurveTo(260,105,470,112,610,165);ctx.lineTo(742,177);ctx.lineTo(610,190);
  ctx.bezierCurveTo(500,280,280,270,170,196);ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);
  // tall dorsal sail
  fin(ctx,[[300,128],[350,36],[385,126],[430,55],[470,142]],color);
  fin(ctx,[[390,260],[435,326],[475,250]],color);
  ctx.strokeStyle='#e8f8ff';ctx.globalAlpha=.45;ctx.lineWidth=4;
  for(let x=300;x<560;x+=36){ctx.beginPath();ctx.moveTo(x,138);ctx.lineTo(x+25,245);ctx.stroke();}
  ctx.globalAlpha=1;eye(ctx,570,153,17,true);ctx.restore();
}
function shark(ctx,color=0x758b99){
  glow(ctx,390,190,285,'#8fc7d8',.12);
  tail(ctx,180,195,color,1.18);
  ctx.save();rim(ctx,color,17);ctx.fillStyle=metallicGradient(ctx,color,170,80,650,300);
  ctx.beginPath();ctx.moveTo(170,195);ctx.bezierCurveTo(265,110,505,100,665,175);ctx.bezierCurveTo(690,190,676,218,645,232);ctx.bezierCurveTo(505,290,280,285,170,195);ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);
  fin(ctx,[[355,120],[410,35],[445,135]],color);
  fin(ctx,[[380,250],[430,320],[475,238]],color);
  // white belly
  ctx.fillStyle='#d9e4e8';ctx.globalAlpha=.78;ctx.beginPath();ctx.moveTo(235,226);ctx.bezierCurveTo(385,282,540,264,650,222);ctx.bezierCurveTo(510,300,330,310,235,226);ctx.fill();ctx.globalAlpha=1;
  // gills
  ctx.strokeStyle='#263640';ctx.lineWidth=6;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(520+i*15,165);ctx.lineTo(512+i*15,218);ctx.stroke();}
  eye(ctx,605,157,16,true);
  // teeth
  ctx.fillStyle='#fff';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(620+i*10,222);ctx.lineTo(625+i*10,238);ctx.lineTo(630+i*10,222);ctx.fill();}
  ctx.restore();
}
function orca(ctx){
  const black=0x111820;
  glow(ctx,390,190,300,'#4ab7ff',.12);
  tail(ctx,175,198,black,1.20);
  ctx.save();rim(ctx,0x4ab7ff,15);ctx.fillStyle=metallicGradient(ctx,black,160,70,670,300);
  ctx.beginPath();ctx.moveTo(170,198);ctx.bezierCurveTo(250,95,500,90,670,172);ctx.bezierCurveTo(705,190,684,225,650,240);ctx.bezierCurveTo(500,292,270,292,170,198);ctx.closePath();ctx.fill();ctx.stroke();resetShadow(ctx);
  fin(ctx,[[360,116],[420,25],[452,130]],black);
  fin(ctx,[[380,247],[455,325],[500,235]],black);
  // white eye patch and belly
  ctx.fillStyle='#f7fbff';ctx.beginPath();ctx.ellipse(570,148,47,22,-.18,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(270,230);ctx.bezierCurveTo(390,285,555,270,645,230);ctx.bezierCurveTo(525,315,350,320,270,230);ctx.fill();
  eye(ctx,630,164,12);ctx.restore();
}
function turtle(ctx,color=0x3a9b64){
  glow(ctx,390,190,260,'#63d98f',.16);
  ctx.save();rim(ctx,color,15);
  const shell=ctx.createRadialGradient(385,155,30,385,190,145);shell.addColorStop(0,'#d3b354');shell.addColorStop(.42,'#5f9b45');shell.addColorStop(1,'#1f5b3d');
  ctx.fillStyle=shell;ctx.beginPath();ctx.ellipse(382,194,155,112,-.05,0,Math.PI*2);ctx.fill();ctx.stroke();resetShadow(ctx);
  // shell plates
  ctx.strokeStyle='#254e32';ctx.lineWidth=6;ctx.globalAlpha=.72;
  for(let a=0;a<Math.PI*2;a+=Math.PI/3){ctx.beginPath();ctx.moveTo(382,194);ctx.lineTo(382+Math.cos(a)*145,194+Math.sin(a)*100);ctx.stroke();}
  ctx.beginPath();ctx.ellipse(382,194,80,57,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  // head
  ctx.fillStyle=metallicGradient(ctx,0x78a85b,500,140,640,230);ctx.beginPath();ctx.ellipse(558,180,72,52,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  // flippers
  fin(ctx,[[285,150],[170,70],[250,190]],0x6e9c54);
  fin(ctx,[[305,245],[180,312],[280,215]],0x6e9c54);
  fin(ctx,[[450,148],[530,80],[470,190]],0x6e9c54);
  fin(ctx,[[458,242],[540,305],[470,214]],0x6e9c54);
  eye(ctx,590,166,14);ctx.restore();
}
function eel(ctx,color=0x37c7d5){
  glow(ctx,395,190,260,css(color),.14);
  ctx.save();ctx.strokeStyle=metallicGradient(ctx,color,100,60,650,300);ctx.lineWidth=82;ctx.lineCap='round';ctx.shadowBlur=18;ctx.shadowColor=css(color);
  ctx.beginPath();ctx.moveTo(105,250);ctx.bezierCurveTo(190,80,285,300,390,145);ctx.bezierCurveTo(475,35,565,115,650,178);ctx.stroke();resetShadow(ctx);
  ctx.strokeStyle=shade(color,.65);ctx.lineWidth=5;ctx.globalAlpha=.45;
  for(let x=180;x<560;x+=45){ctx.beginPath();ctx.moveTo(x,128);ctx.lineTo(x+18,230);ctx.stroke();}
  ctx.globalAlpha=1;eye(ctx,625,163,15);ctx.restore();
}
function angler(ctx,color=0x6b65d8){
  basicBody(ctx,color,{y:200,ry:110,nose:620});tail(ctx,180,200,color,.9);
  ctx.strokeStyle=shade(color,.55);ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(480,120);ctx.quadraticCurveTo(545,30,625,72);ctx.stroke();
  glow(ctx,630,70,34,'#fff27a',.95);ctx.fillStyle='#fff6a0';ctx.beginPath();ctx.arc(630,70,13,0,Math.PI*2);ctx.fill();
  eye(ctx,560,160,19,true);
  ctx.fillStyle='#fff';for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(575+i*11,220);ctx.lineTo(580+i*11,238);ctx.lineTo(586+i*11,220);ctx.fill();}
}
function generic(ctx,color,variant='dart'){
  tail(ctx,185,195,color,.9);basicBody(ctx,color,{y:195,ry:94,nose:625});
  scalePattern(ctx,250,125,280,135,color,.22);
  fin(ctx,[[340,122],[390,65],[430,130]],color);
  fin(ctx,[[350,250],[405,310],[445,240]],color);
  eye(ctx,570,160,18,variant==='ember');
}

function fishTexture(speciesId,color,specialId=''){
  const key=['fish',speciesId,color,specialId].join(':');
  if(fishTextureCache.has(key))return fishTextureCache.get(key);
  const [canvas,ctx]=canvas2d(768,384);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(speciesId==='clownfish')clownfish(ctx);
  else if(speciesId==='puffer')puffer(ctx,color);
  else if(speciesId==='stingray'||speciesId==='ray')stingray(ctx,color);
  else if(speciesId==='marlin')marlin(ctx,color);
  else if(speciesId==='reefshark')shark(ctx,color);
  else if(speciesId==='orca')orca(ctx);
  else if(speciesId==='seaturtle')turtle(ctx,color);
  else if(speciesId==='eel'||speciesId==='frost')eel(ctx,color);
  else if(speciesId==='angler')angler(ctx,color);
  else generic(ctx,color,speciesId);

  if(specialId){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='#fff3a0';ctx.lineWidth=10;ctx.shadowBlur=28;ctx.shadowColor='#fff3a0';ctx.strokeRect(14,14,740,356);ctx.restore();
  }
  const t=texture(canvas);fishTextureCache.set(key,t);return t;
}
function bossTexture(bossId,color){
  const key='boss:'+bossId+':'+color;
  if(fishTextureCache.has(key))return fishTextureCache.get(key);
  const [canvas,ctx]=canvas2d(1024,512);
  ctx.save();ctx.scale(1024/768,512/384);
  if(bossId==='magma')stingray(ctx,color);
  else if(bossId==='void')eel(ctx,color);
  else if(bossId==='reactor')shark(ctx,color);
  else if(bossId==='glacier')turtle(ctx,0x8fe7ff);
  else orca(ctx);
  ctx.restore();
  const t=texture(canvas);fishTextureCache.set(key,t);return t;
}
function labelTexture(text,color='#ffd34a',small=''){
  const key=text+'|'+color+'|'+small;
  if(labelTextureCache.has(key))return labelTextureCache.get(key);
  const [canvas,ctx]=canvas2d(768,150);
  const g=ctx.createLinearGradient(0,0,768,0);g.addColorStop(0,'rgba(2,9,18,0)');g.addColorStop(.18,'rgba(2,9,18,.92)');g.addColorStop(.82,'rgba(2,9,18,.92)');g.addColorStop(1,'rgba(2,9,18,0)');
  ctx.fillStyle=g;ctx.fillRect(0,8,768,134);
  ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(120,10,528,130);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 68px system-ui';ctx.fillStyle='#fff';ctx.shadowBlur=18;ctx.shadowColor=color;ctx.fillText(text,384,61);
  resetShadow(ctx);
  if(small){ctx.font='800 24px system-ui';ctx.fillStyle=color;ctx.fillText(small,384,111);}
  const t=texture(canvas);labelTextureCache.set(key,t);return t;
}
function healthSprite(){
  const [canvas,ctx]=canvas2d(512,48);
  ctx.fillStyle='rgba(0,0,0,.8)';ctx.roundRect(4,4,504,40,18);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=3;ctx.stroke();
  return new THREE.Sprite(new THREE.SpriteMaterial({map:texture(canvas),transparent:true,depthWrite:false}));
}
function healthFillSprite(){
  const [canvas,ctx]=canvas2d(512,48);
  const g=ctx.createLinearGradient(0,0,512,0);g.addColorStop(0,'#67ff9a');g.addColorStop(.65,'#ffd54a');g.addColorStop(1,'#ff5e5e');
  ctx.fillStyle=g;ctx.roundRect(6,8,500,32,14);ctx.fill();
  return new THREE.Sprite(new THREE.SpriteMaterial({map:texture(canvas),transparent:true,depthWrite:false}));
}

export function createArcadeFishVisual({speciesId='dart',bossId=null,color=0x19dfff,specialId='',value=50,multiplier=2,bossName='',size=1,hp=1}={}){
  const group=new THREE.Group();
  const boss=Boolean(bossId);
  const tex=boss?bossTexture(bossId,color):fishTexture(speciesId,color,specialId);
  const art=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:.03}));
  let w=2.35*size,h=1.18*size;
  if(speciesId==='puffer'){w=1.65*size;h=1.5*size}
  if(speciesId==='stingray'||speciesId==='ray'){w=2.75*size;h=1.48*size}
  if(speciesId==='marlin'){w=3.05*size;h=1.25*size}
  if(speciesId==='reefshark'){w=2.95*size;h=1.35*size}
  if(speciesId==='orca'){w=3.25*size;h=1.45*size}
  if(speciesId==='seaturtle'){w=2.55*size;h=1.55*size}
  if(speciesId==='eel'||speciesId==='frost'){w=3.0*size;h=1.25*size}
  if(boss){w=6.8;h=3.25}
  art.scale.set(w,h,1);group.add(art);

  const aura=new THREE.Sprite(new THREE.SpriteMaterial({
    map:tex,color:specialId?0xffef9a:color,transparent:true,
    opacity:specialId?.22:(boss?.15:.045),depthWrite:false,blending:THREE.AdditiveBlending
  }));
  aura.scale.set(w*1.16,h*1.16,1);aura.position.z=-.02;group.add(aura);

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

  group.userData.artSprite=art;
  group.userData.auraSprite=aura;
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
