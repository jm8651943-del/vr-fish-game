// Fish Arena Neon Reef: independent hand-drawn 2D canvas art, no VR/WebGL.
function drawReef2D(ctx,w,h,t){
 const sea=ctx.createLinearGradient(0,0,0,h);sea.addColorStop(0,'#0769a4');sea.addColorStop(.48,'#045b8d');sea.addColorStop(1,'#04243e');ctx.fillStyle=sea;ctx.fillRect(0,0,w,h);
 ctx.save();for(let i=0;i<8;i++){const bx=(i+.35)*w/8+Math.sin(t*.22+i)*16;const g=ctx.createLinearGradient(bx-60,0,bx+180,h);g.addColorStop(0,'#a2f6ff1c');g.addColorStop(1,'#a2f6ff00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(bx,0);ctx.lineTo(bx+130,0);ctx.lineTo(bx+245,h);ctx.lineTo(bx+18,h);ctx.fill()}ctx.restore();
 ctx.fillStyle='#64dfed0c';for(let i=0;i<34;i++){let px=(i*191+t*(5+i%3)*4)%(w+50)-20;let py=(i*131+t*(11+i%4)*3)%(h+60)-30;ctx.beginPath();ctx.arc(px,py,2+i%4,0,7);ctx.fill()}
 const floor=ctx.createLinearGradient(0,h*.76,0,h);floor.addColorStop(0,'#126f70');floor.addColorStop(1,'#073940');ctx.fillStyle=floor;ctx.beginPath();ctx.moveTo(0,h*.89);for(let x=0;x<=w+24;x+=24){ctx.lineTo(x,h*(.87+.015*Math.sin(x/95)))}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
 function coral(px,py,s,c){ctx.save();ctx.translate(px,py);ctx.scale(s,s);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=c;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-45);ctx.lineTo(-19,-68);ctx.moveTo(0,-26);ctx.lineTo(26,-52);ctx.lineTo(35,-81);ctx.moveTo(26,-52);ctx.lineTo(48,-58);ctx.moveTo(-19,-68);ctx.lineTo(-27,-88);ctx.stroke();ctx.strokeStyle='#ffffff21';ctx.lineWidth=3;ctx.stroke();ctx.restore()}
 coral(w*.04,h*.99,Math.max(.6,w/1250),'#f88b72');coral(w*.94,h*.97,Math.max(.7,w/1100),'#c65dce');coral(w*.14,h*.99,.75,'#f4ba6c');coral(w*.81,h*.99,.58,'#f384bd');
 ctx.strokeStyle='#27b68c';ctx.lineWidth=5;for(let i=0;i<13;i++){let xx=w*(i+.4)/13;ctx.beginPath();ctx.moveTo(xx,h*.96);ctx.quadraticCurveTo(xx-7+Math.sin(t+i)*8,h*.85,xx+Math.sin(t*.6+i)*15,h*.79);ctx.stroke()}
 for(let i=0;i<17;i++){let xx=(i*143)%Math.max(w,1),yy=(i*79+t*18)%Math.max(h,1);ctx.strokeStyle='#c6ffff50';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(xx,yy,2+i%3,0,7);ctx.stroke()}
}
function drawFish2D(ctx,f,t){
 const r=f.r,k=f.e,tail=Math.sin(t*7+f.phase)*.23;ctx.save();ctx.translate(f.x,f.y);if(f.vx<0)ctx.scale(-1,1);
 ctx.shadowBlur=f.boss?24:7;ctx.shadowColor=f.boss?'#ffe05e':'#43d4ff';
 function ell(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
 function path(points,fill){ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#003759aa';ctx.lineWidth=2;ctx.stroke()}
 let main='#ffd65a',edge='#ff8b32',detail='#fff4c8';
 if(k==='CLOWN'){main='#ff9d34';edge='#f76622'}if(k==='TROPICAL'){main='#4affcf';edge='#2094db'}if(k==='PUFFER'){main='#e2f04b';edge='#b49e23'}if(k==='MARLIN'){main='#61bcff';edge='#125eac'}if(k==='SHARK'){main='#b3d2ec';edge='#5086a8'}if(k==='ORCA'){main='#1b3f5a';edge='#071e36'}if(k==='LEVIATHAN'){main='#ffe678';edge='#cc7230'}if(k==='ELECTRIC'){main='#b4f8ff';edge='#257df2'}if(k==='TREASURE'){main='#e5b3ff';edge='#7e33c9'}
 if(k==='RAY'){ctx.save();ctx.rotate(Math.sin(t*3+f.phase)*.1);path([-r*1.55,0,-r*.5,-r*.5,r*.7,-r*.9,r*1.3,0,r*.65,r*.8,-r*.6,r*.55],'#8a71e8');ctx.strokeStyle='#d5bdff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-r*.95,0);ctx.quadraticCurveTo(-r*1.45,r*.9,-r*1.7,r*1.8);ctx.stroke();ell(r*.45,-r*.12,4,4,'#fff');ell(r*.48,-r*.1,2,2,'#15213e');ctx.restore()}
 else if(k==='TURTLE'){ell(-r*.65,r*.38,r*.55,r*.27,'#72c38c');ell(-r*.6,-r*.48,r*.5,r*.25,'#62c79a');ell(r*.92,-r*.05,r*.39,r*.31,'#a0e8a7');ell(0,0,r*1.12,r*.7,'#3ca980','#1d6f54');ell(0,0,r*.85,r*.58,'#65c69b','#e4e89b');ctx.strokeStyle='#2f866b';ctx.lineWidth=2;ctx.strokeRect(-r*.22,-r*.32,r*.43,r*.62);ell(r*1.04,-r*.1,3,3,'#132a42')}
 else if(k==='OCTO'){for(let i=-3;i<=3;i++){ctx.strokeStyle='#e678cc';ctx.lineWidth=Math.max(5,r*.18);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(i*r*.23,r*.2);ctx.quadraticCurveTo(i*r*.36,r*1.15+Math.sin(t*5+i)*5,i*r*.28,r*1.35);ctx.stroke()}ell(0,-r*.13,r*.83,r*.85,'#e978ca','#8c3a97');ell(-r*.28,-r*.22,3.5,5,'#fff');ell(r*.28,-r*.22,3.5,5,'#fff');ell(-r*.26,-r*.21,1.8,2.5,'#142b51');ell(r*.29,-r*.21,1.8,2.5,'#142b51')}
 else if(k==='CRAB'){for(let i=-2;i<=2;i++){ctx.strokeStyle='#f88c58';ctx.lineWidth=Math.max(3,r*.15);ctx.beginPath();ctx.moveTo(i*r*.3,r*.25);ctx.lineTo(i*r*.43,r*.9);ctx.stroke()}ell(0,0,r*.9,r*.52,'#fa765c','#a74441');ell(-r*.4,-r*.47,r*.25,r*.25,'#fff');ell(r*.4,-r*.47,r*.25,r*.25,'#fff');ell(-r*.36,-r*.48,3,3,'#292b48');ell(r*.44,-r*.48,3,3,'#292b48');ell(-r*1.06,-r*.21,r*.34,r*.24,'#ffba78');ell(r*1.06,-r*.21,r*.34,r*.24,'#ffba78')}
 else if(k==='TREASURE'){path([-r*.9,-r*.25,r*.9,-r*.25,r*.72,r*.7,-r*.7,r*.7],'#ce82ff');ell(0,-r*.18,r*.8,r*.33,'#fff0a7','#9b6cc8');path([-r*.5,-r*.48,0,-r*1.2,r*.5,-r*.48],'#ccf9ff');ell(0,-r*.2,r*.19,r*.19,'#ffcc3b')}
 else {
 ctx.save();ctx.translate(-r*1.2,0);ctx.rotate(tail);path([-r*.1,0,-r*.88,-r*.65,-r*.81,r*.68],edge);ctx.restore();
 if(k==='SHARK'||k==='MARLIN'){path([-r*.42,-r*.2,-r*.12,-r*1.13,r*.32,-r*.3],edge)}
 else {path([-r*.65,-r*.3,-r*.2,-r*.87,r*.35,-r*.4],edge)}
 if(k==='PUFFER'){for(let i=0;i<12;i++){let a=i*Math.PI/6;path([Math.cos(a)*r*.9,Math.sin(a)*r*.72,Math.cos(a)*r*1.16,Math.sin(a)*r*.99,Math.cos(a+.23)*r*.94,Math.sin(a+.23)*r*.72],'#e7e475')}}
 const grad=ctx.createLinearGradient(0,-r,0,r);grad.addColorStop(0,detail);grad.addColorStop(.35,main);grad.addColorStop(1,edge);ell(0,0,r*1.19,r*.68,grad,'#003c6a');
 if(k==='ORCA'){ell(.05*r,r*.24,r*.6,r*.22,'#f1f8ff');ell(.2*r,-r*.17,r*.24,r*.15,'#f1f8ff')}
 if(k==='CLOWN'){for(let a of [-.65,0,.62]){ctx.beginPath();ctx.ellipse(a*r,0,r*.14,r*.62,0,0,7);ctx.fillStyle='#fffdf5';ctx.fill();ctx.strokeStyle='#783220';ctx.lineWidth=2;ctx.stroke()}}
 if(k==='SHARK'){path([r*.69,-r*.05,r*1.3,0,r*.6,r*.33],'#d0e4f2')}
 if(k==='MARLIN'){ctx.strokeStyle='#b2f3ff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(r*.7,-r*.2);ctx.lineTo(r*1.85,-r*.37);ctx.stroke()}
 if(k==='ELECTRIC'){ctx.strokeStyle='#f7fd63';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.4,-r*.5);ctx.lineTo(-r*.1,0);ctx.lineTo(r*.2,-r*.2);ctx.lineTo(r*.5,r*.25);ctx.stroke()}
 ell(r*.72,-r*.19,Math.max(4,r*.13),Math.max(4,r*.13),'#f8ffff','#5680ad');ell(r*.75,-r*.19,Math.max(2,r*.058),Math.max(2,r*.058),'#072440');
 }
 ctx.restore();
}
function drawCannon2D(ctx,px,py,power,target,t){
 const angle=target&&!target.dead?Math.atan2(target.y-py,target.x-px)+Math.PI/2:Math.sin(t*.7)*.18;
 ctx.save();ctx.translate(px,py);ctx.rotate(angle);
 const barrel=ctx.createLinearGradient(-14,0,14,0);barrel.addColorStop(0,'#095b7c');barrel.addColorStop(.5,'#baf6ff');barrel.addColorStop(1,'#117cb4');
 ctx.fillStyle=barrel;ctx.strokeStyle='#083650';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-12,-54,24,54,6);ctx.fill();ctx.stroke();
 ctx.restore();
 ctx.save();ctx.translate(px,py);ctx.shadowBlur=14;ctx.shadowColor='#20e7ff';let base=ctx.createRadialGradient(0,-6,3,0,0,34);base.addColorStop(0,'#bfffff');base.addColorStop(.45,'#19c9eb');base.addColorStop(1,'#045079');ctx.fillStyle=base;ctx.strokeStyle='#d2feff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,30,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#ffe57c';ctx.font='900 15px Arial';ctx.textAlign='center';ctx.fillText(String(power)+'×',0,5);ctx.restore();
}
