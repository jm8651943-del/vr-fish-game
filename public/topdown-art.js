
/* Top-down 2D canvas art: sea-floor viewed from directly overhead, with dorsal-view fish. */
function drawReef2D(ctx,w,h,t){
 const ocean=ctx.createLinearGradient(0,0,w,h);
 ocean.addColorStop(0,'#075c92');ocean.addColorStop(.5,'#0986a2');ocean.addColorStop(1,'#064369');
 ctx.fillStyle=ocean;ctx.fillRect(0,0,w,h);
 function glow(nx,ny,rgb,r){const x=w*nx,y=h*ny;
  const grad=ctx.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,rgb);grad.addColorStop(1,'#fff0');
  ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
 }
 const span=Math.max(100,Math.min(w,h)*.45);
 glow(.17,.19,'#64dcb140',span);glow(.79,.72,'#f0d99c4a',span*1.2);glow(.49,.52,'#47cbc33b',span*.8);
 ctx.lineWidth=1.5;ctx.strokeStyle='#bdf3de20';
 for(let j=0;j<15;j++){ctx.beginPath();for(let px=0;px<=w;px+=23){const py=(j+.4)*h/15+Math.sin(px/46+j*1.5+t*.15)*7;
  if(px===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.stroke()}
 const colors=['#ff9d99','#ed89d7','#ffd17d','#5adaaf'];
 for(let i=0;i<17;i++){const xx=((i*149+67)%1013)/1013*w,yy=((i*169+41)%967)/967*h;
  ctx.save();ctx.translate(xx,yy);ctx.rotate(i);
  const s=.65+(i%4)*.12;ctx.scale(s,s);ctx.shadowBlur=9;ctx.shadowColor=colors[i%4];ctx.fillStyle=colors[i%4];
  for(let k=0;k<8;k++){const a=k*Math.PI/4;
   ctx.beginPath();ctx.ellipse(Math.cos(a)*13,Math.sin(a)*13,10,5,a,0,7);ctx.fill()}
  ctx.shadowBlur=0;ctx.fillStyle='#ffecc5';ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();ctx.restore()}
 for(let i=0;i<23;i++){const xx=((i*211+33)%991)/991*w,yy=((i*131+71)%883)/883*h;
  ctx.save();ctx.translate(xx,yy);ctx.rotate(i*2.4);
  ctx.fillStyle='#274f63a0';ctx.beginPath();ctx.ellipse(0,0,6+i%9,3+i%4,0,0,7);ctx.fill();
  ctx.strokeStyle='#74d9a77a';ctx.lineWidth=2;
  for(let k=0;k<4;k++){let a=k*Math.PI/2;ctx.beginPath();ctx.moveTo(0,0);
    ctx.quadraticCurveTo(Math.cos(a)*12,Math.sin(a)*7,Math.cos(a)*17,Math.sin(a)*14);ctx.stroke()}
  ctx.restore()}
 for(let i=0;i<30;i++){const xx=(i*181+t*(5+i%3))%(w+30)-15,yy=(i*123+t*(7+i%2))%(h+40)-20;
   ctx.strokeStyle='#d1fcff55';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(xx,yy,2+i%3,0,7);ctx.stroke()}
}
function drawFish2D(ctx,f,t){
 const r=f.r,k=f.e;ctx.save();ctx.translate(f.x,f.y);
 ctx.rotate(Math.atan2(f.vy||0,f.vx||1)+Math.PI/2);
 ctx.shadowBlur=f.boss?18:5;ctx.shadowColor=f.boss?'#ffdf6c':'#6ef7ff';
 const oval=(px,py,rx,ry,fill,outline)=>{
  ctx.beginPath();ctx.ellipse(px,py,rx,ry,0,0,7);ctx.fillStyle=fill;ctx.fill();
  if(outline){ctx.strokeStyle=outline;ctx.lineWidth=2;ctx.stroke()}
 };
 const shape=(pts,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();ctx.fill()};
 let base='#f7ba48',rim='#f17934',light='#fff7bd';
 if(k==='CLOWN'){base='#f69a36';rim='#e36925'}
 if(k==='TROPICAL'){base='#63eac5';rim='#137cb8'}
 if(k==='PUFFER'){base='#e7ea5e';rim='#a6b342'}
 if(k==='SHARK'){base='#9fcfe7';rim='#4484a2'}
 if(k==='MARLIN'){base='#46c4ff';rim='#116ea8'}
 if(k==='ORCA'){base='#173b59';rim='#071d36'}
 if(k==='LEVIATHAN'){base='#ffe27d';rim='#c88630'}
 if(k==='ELECTRIC'){base='#95efff';rim='#3582c8'}
 if(k==='TREASURE'){base='#dbb2ff';rim='#6435ac'}
 if(k==='RAY'){
  shape([-r*1.65,0,-r*.3,-r*.82,r*.3,-r*.82,r*1.65,0,r*.5,r*.7,-r*.5,r*.7],'#977edc');
  ctx.strokeStyle='#d2bbff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,r*.3);ctx.lineTo(0,r*1.95);ctx.stroke();
  oval(0,-r*.30,r*.2,r*.23,'#d9ccff');oval(-r*.21,-r*.3,3,3,'#143453');oval(r*.21,-r*.3,3,3,'#143453');
 }else if(k==='TURTLE'){
  for(const sx of [-1,1])for(const sy of [-1,1])oval(sx*r*.75,sy*r*.5,r*.38,r*.21,'#69c896');
  oval(0,-r*.97,r*.3,r*.41,'#a2edb5');
  oval(0,0,r*.83,r*.86,'#368a6b','#d9edb9');
  oval(0,0,r*.61,r*.65,'#75bb8e','#d2e5b0');
  ctx.strokeStyle='#2e8669';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r*.55,0);ctx.lineTo(r*.55,0);ctx.moveTo(0,-r*.55);ctx.lineTo(0,r*.55);ctx.stroke();
 }else if(k==='OCTO'){
  ctx.lineCap='round';ctx.strokeStyle='#eb9cdd';ctx.lineWidth=r*.17;
  for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*r*.17,r*.15);
   ctx.quadraticCurveTo(i*r*.35+Math.sin(t*4+i)*3,r*.9,i*r*.35,r*1.4);ctx.stroke()}
  oval(0,-r*.23,r*.76,r*.78,'#db79ce','#a552a2');
  oval(-r*.23,-r*.49,3.5,3.5,'#fff');oval(r*.23,-r*.49,3.5,3.5,'#fff');
 }else if(k==='CRAB'){
  for(const sx of [-1,1]){for(let i=-1;i<=1;i++){
    ctx.strokeStyle='#ff9b69';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx*r*.5,i*r*.21);ctx.lineTo(sx*r*1.3,i*r*.39);ctx.stroke()}
   oval(sx*r*1.03,-r*.47,r*.31,r*.25,'#ffb17c')}
  oval(0,0,r*.8,r*.68,'#ef7961','#ad4652');
  oval(-r*.22,-r*.33,4,4,'#fff');oval(r*.22,-r*.33,4,4,'#fff');
 }else if(k==='TREASURE'){
  shape([-r*.57,-r*.60,r*.57,-r*.60,r*.72,r*.47,-r*.72,r*.47],'#b978f1');
  oval(0,-r*.37,r*.5,r*.26,'#fff3ac','#b97bff');shape([0,-r*.95,r*.25,-r*.3,0,r*.1,-r*.25,-r*.3],'#e6faff');
 }else{
  const bend=Math.sin(t*7+f.phase)*r*.18;
  shape([-r*.18,r*.66,-r*.63,r*1.54+bend,0,r*1.13,r*.63,r*1.54-bend,r*.18,r*.66],rim);
  shape([-r*.4,-r*.17,-r*1.06,r*.27,-r*.35,r*.38],rim);
  shape([r*.4,-r*.17,r*1.06,r*.27,r*.35,r*.38],rim);
  const g=ctx.createLinearGradient(-r,0,r,0);g.addColorStop(0,rim);g.addColorStop(.3,base);g.addColorStop(.67,light);g.addColorStop(1,rim);
  oval(0,0,r*.7,r*1.13,g,'#124c6a');
  if(k==='PUFFER')for(let i=0;i<12;i++){const a=i*Math.PI/6;
    shape([Math.cos(a)*r*.62,Math.sin(a)*r,Math.cos(a)*r*.84,Math.sin(a)*r*1.3,Math.cos(a+.2)*r*.63,Math.sin(a+.2)*r],'#f5e880')}
  if(k==='CLOWN')for(const y of [-r*.62,-r*.08,r*.55])oval(0,y,r*.55,r*.13,'#fffdf4');
  if(k==='ORCA')oval(0,r*.18,r*.37,r*.53,'#f1f6fa');
  if(k==='SHARK'||k==='MARLIN')shape([-r*.19,-r*.03,0,-r*.55,r*.22,.15*r],'#73b7d5');
  if(k==='MARLIN'){ctx.strokeStyle='#d0f4ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(0,-r*1.85);ctx.stroke()}
  if(k==='ELECTRIC'){ctx.strokeStyle='#fff78f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.22,-r*.54);ctx.lineTo(r*.13,-r*.13);ctx.lineTo(-r*.1,r*.17);ctx.lineTo(r*.17,r*.5);ctx.stroke()}
  for(const sx of [-1,1]){oval(sx*r*.29,-r*.67,Math.max(3,r*.115),Math.max(3,r*.1),'#fff');oval(sx*r*.3,-r*.7,Math.max(1.5,r*.055),Math.max(1.5,r*.055),'#07304c')}
 }
 ctx.restore();
}
