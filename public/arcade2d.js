
const c=document.getElementById('game'),x=c.getContext('2d');let W,H,dpr=Math.min(devicePixelRatio||1,2);function resize(){W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';x.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
let credits=1000,score=0,power=5,fish=[],shots=[],particles=[],target=null,auto=false,locked=false,bombs=2,freezes=2,freezeUntil=0,last=0,spawnClock=0,bossClock=0,ledger=[];const species=[['CLOWN',1,19,65],['TROPICAL',2,23,85],['PUFFER',4,26,125],['CRAB',6,27,160],['OCTO',10,36,245],['RAY',12,40,310],['SHARK',18,49,385],['TURTLE',13,35,250],['MARLIN',15,43,340],['ORCA',26,60,535],['ELECTRIC',8,28,175],['TREASURE',15,31,215]];
try{const save=JSON.parse(localStorage.getItem('fish-arena-demo-v1')||'null');if(save&&Number.isFinite(save.credits)&&Number.isFinite(save.score)&&Number.isFinite(save.power)){credits=Math.max(0,Math.min(1000000,save.credits));score=Math.max(0,save.score);power=Math.max(1,Math.min(50,save.power));bombs=Math.max(0,Math.min(99,save.bombs||0));freezes=Math.max(0,Math.min(99,save.freezes||0));}}catch(e){}
const $=id=>document.getElementById(id);function sync(){try{localStorage.setItem("fish-arena-demo-v1",JSON.stringify({credits,score,power,bombs,freezes}))}catch(e){}credits=Math.max(0,Math.round(credits*100)/100);$('credits').textContent=credits;$('score').textContent=Math.floor(score);$('power').textContent=power;$('bombs').textContent=bombs;$('freezes').textContent=freezes;$('ledger').textContent=ledger.slice(-12).reverse().map(e=>`${e.t} ${e.type} ${e.amount>0?'+':''}${e.amount}`).join('\n')}function log(type,amount){ledger.push({t:new Date().toLocaleTimeString(),type,amount});sync()}function msg(t){let n=$('notice');n.textContent=t;n.style.opacity=1;setTimeout(()=>n.style.opacity=0,900)}
function spawn(forceBoss=false){
 let s=species[Math.floor(Math.random()*species.length)];
 if(forceBoss)s=['LEVIATHAN',80,78,1500];
 const side=Math.floor(Math.random()*4),offset=s[2]+30,q=Math.random();
 let px=side===0?-offset:side===1?W+offset:50+q*Math.max(1,W-100);
 let py=side===2?-offset:side===3?H+offset:50+q*Math.max(1,H-100);
 const tx=W*(.15+Math.random()*.7),ty=H*(.2+Math.random()*.6);
 const dx=tx-px,dy=ty-py,len=Math.max(1,Math.hypot(dx,dy));
 const speed=(35+Math.random()*75)*(forceBoss?.56:1);
 const hp=s[3]*+$('hpScale').value*(forceBoss?1.7:1);
 fish.push({id:crypto.randomUUID(),e:s[0],mult:s[1],r:s[2],hp,max:hp,x:px,y:py,vx:speed*dx/len,vy:speed*dy/len,phase:Math.random()*6.28,boss:forceBoss,dead:false,age:0});
 if(forceBoss){msg('GOLDEN LEVIATHAN WAVE');$('boss').style.display='block'}
}
function fireAt(tx,ty){if(credits<power)return msg('LOW CREDITS');credits-=power;log('SHOT',-power);let a=Math.atan2(ty-(H-35),tx-W/2);shots.push({x:W/2,y:H-35,vx:Math.cos(a)*650,vy:Math.sin(a)*650,dmg:power*(8+Math.random()*5),life:1.5});}
function reward(f){let r=Math.max(1,Math.round(power*f.mult*+$('rewardScale').value));credits+=r;score+=r;log(f.boss?'BOSS':'CATCH',r);for(let i=0;i<18;i++)particles.push({x:f.x,y:f.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,l:1});if(f.e==='ELECTRIC'){fish.forEach(q=>q.hp-=35*power);msg('⚡ CHAIN STRIKE')}if(f.e==='TREASURE'){bombs++;freezes++;msg('💎 TREASURE DROP')}if(f.boss){$('boss').style.display='none';msg('BOSS CAPTURED +'+r)}}
function nearest(px,py){return fish.filter(f=>!f.dead).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py))[0]}
function update(dt){
 spawnClock+=dt*+$('spawn').value;bossClock+=dt;
 if(spawnClock>.48){spawnClock=0;if(fish.length<30)spawn()}
 if(bossClock>+$('bossFreq').value&&!fish.some(f=>f.boss)){bossClock=0;spawn(true)}
 const frozen=performance.now()<freezeUntil;
 fish.forEach(f=>{f.age+=dt;if(!frozen){f.x+=f.vx*dt;f.y+=f.vy*dt}
  if(f.age>5&&(f.x < -180||f.x>W+180||f.y < -180||f.y>H+180))f.dead=true});
 shots.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
  for(const f of fish)if(!f.dead&&Math.hypot(s.x-f.x,s.y-f.y)<f.r){f.hp-=s.dmg;s.life=0;if(f.hp<=0){f.dead=true;reward(f)}break}});
 fish=fish.filter(f=>!f.dead);shots=shots.filter(s=>s.life>0&&s.x>-40&&s.x<W+40&&s.y>-40&&s.y<H+40);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt});particles=particles.filter(p=>p.l>0);
 if((auto||locked)&&(!target||target.dead))target=nearest(W/2,H/2);
 if(auto&&target&&!target.dead&&credits>=power&&Math.random()<dt*7)fireAt(target.x,target.y);
 let b=fish.find(f=>f.boss);if(b)$('bossBar').style.width=Math.max(0,b.hp/b.max*100)+'%';
}
function draw(){
 const t=performance.now()/1000;
 drawReef2D(x,W,H,t);
 fish.forEach(f=>{
  drawFish2D(x,f,t);
  if(f.hp<f.max){x.fillStyle='#001128cc';x.fillRect(f.x-f.r,f.y-f.r-15,f.r*2,7);
   x.fillStyle=f.boss?'#ffbd39':'#65fdb8';x.fillRect(f.x-f.r,f.y-f.r-15,f.r*2*Math.max(0,f.hp/f.max),7)}
  if(target===f){x.save();x.strokeStyle='#ffeb81';x.lineWidth=2;x.setLineDash([9,5]);x.beginPath();x.arc(f.x,f.y,f.r+10,0,Math.PI*2);x.stroke();x.restore()}
  x.save();x.textAlign='center';x.font='900 '+Math.max(12,Math.min(17,f.r*.32))+'px Trebuchet MS,Arial';x.lineWidth=3;x.strokeStyle='#012945';x.strokeText(f.mult+'x',f.x,f.y+f.r+17);x.fillStyle='#ffe576';x.fillText(f.mult+'x',f.x,f.y+f.r+17);x.restore();
 });
 shots.forEach(s=>{x.save();x.shadowBlur=18;x.shadowColor='#ffac00';x.fillStyle='#ffe88d';x.beginPath();x.arc(s.x,s.y,4+power/12,0,Math.PI*2);x.fill();x.restore()});
 particles.forEach(p=>{x.globalAlpha=Math.max(0,p.l);x.fillStyle='#ffe46c';x.beginPath();x.arc(p.x,p.y,3,0,Math.PI*2);x.fill();x.globalAlpha=1});
 drawCannon2D(x,W/2,H-19,power,target,t);
}function loop(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);c.addEventListener('pointerdown',e=>{target=nearest(e.clientX,e.clientY);if(target)fireAt(target.x,target.y);else fireAt(e.clientX,e.clientY)});$('fire').onclick=()=>target?fireAt(target.x,target.y):fireAt(W/2,100);$('plus').onclick=()=>{power=Math.min(50,power+5);sync()};$('minus').onclick=()=>{power=Math.max(1,power-5);sync()};$('lock').onclick=()=>{locked=!locked;$('lock').classList.toggle('active',locked);if(locked)target=nearest(W/2,H/2)};$('auto').onclick=()=>{auto=!auto;$('auto').classList.toggle('active',auto);if(auto&&!target)target=nearest(W/2,H/2)};$('bomb').onclick=()=>{if(!bombs)return;bombs--;fish.forEach(f=>{f.hp-=power*18;if(f.hp<=0&&!f.dead){f.dead=true;reward(f)}});msg('💣 DEPTH BOMB');sync()};$('freeze').onclick=()=>{if(!freezes)return;freezes--;freezeUntil=performance.now()+3500;msg('❄ FREEZE FIELD');sync()};$('adminBtn').onclick=()=>$('admin').style.display='block';$('closeAdmin').onclick=()=>$('admin').style.display='none';sync();for(let i=0;i<14;i++)spawn();

const fireButton=$('fire');
let heldInterval=null;
function shootSelected(){if((!target||target.dead)&&fish.length)target=nearest(W/2,H/2);if(target&&!target.dead)fireAt(target.x,target.y);else fireAt(W/2,Math.max(75,H*.3))}
fireButton.onclick=null;
function stopFire(){if(heldInterval!==null){clearInterval(heldInterval);heldInterval=null}fireButton.classList.remove('active')}
fireButton.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();stopFire();fireButton.classList.add('active');fireButton.setPointerCapture?.(e.pointerId);shootSelected();heldInterval=setInterval(shootSelected,180)});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])fireButton.addEventListener(ev,stopFire);
fireButton.addEventListener('click',e=>{if(e.detail===0)shootSelected()});
window.addEventListener('blur',stopFire);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFire()});
$('resetDemo').addEventListener('click',()=>{credits=1000;score=0;power=5;bombs=2;freezes=2;ledger=[];sync();msg('DEMO RESTARTED');$('admin').style.display='none'});
