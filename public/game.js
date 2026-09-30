import * as THREE from '/vendor/three.module.js';

const $=s=>document.querySelector(s);
const canvas=$('#c');
canvas.tabIndex=0;

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
renderer.xr.enabled=true;
renderer.xr.setFoveation?.(.7);
renderer.setSize(innerWidth,innerHeight);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,110);
camera.position.set(0,1.55,3.5);

const hemi=new THREE.HemisphereLight(0x8eefff,0x03101a,1.7);
const keyLight=new THREE.DirectionalLight(0xffffff,1.45);
keyLight.position.set(3,8,5);
scene.add(hemi,keyLight);

const WORLD_MAPS=[
  {id:'reef',name:'NEON REEF',fog:0x021a2b,clear:0x001019,fogDensity:.032,floor:0x083847,rock:0x12434c,accent:0x19dfff,bonus:1,progress:12,fish:[0x19dfff,0xff48c8,0xffcf40,0x62ff83,0x906bff,0xff633f]},
  {id:'lava',name:'MOLTEN TRENCH',fog:0x2d0702,clear:0x100000,fogDensity:.038,floor:0x2b0805,rock:0x32100c,accent:0xff5a1f,bonus:1.5,progress:14,fish:[0xff5a1f,0xffb000,0xff3333,0xffe26b,0xd92dff,0xff7a45]},
  {id:'space',name:'COSMIC VOID',fog:0x030316,clear:0x000006,fogDensity:.021,floor:0x080824,rock:0x151545,accent:0x9d6cff,bonus:2,progress:16,fish:[0x8efcff,0xa96cff,0xff57d8,0x6bffda,0xffe36b,0x7a8cff]}
];

let state=JSON.parse(localStorage.getItem('vrfg.player')||'null')||{};
state={
  score:Number(state.score||0),best:Number(state.best||state.score||0),xp:Number(state.xp||0),level:Number(state.level||1),
  catches:Number(state.catches||0),shots:Number(state.shots||0),combo:Number(state.combo||0),bestCombo:Number(state.bestCombo||0),
  rare:Number(state.rare||0),mapIndex:Number.isFinite(Number(state.mapIndex))?Number(state.mapIndex)%WORLD_MAPS.length:0,
  mapCatches:Number(state.mapCatches||0),ammo:Number.isFinite(Number(state.ammo))?Number(state.ammo):12
};

const AMMO_MAX=12;
let playActive=false,immersiveVrSupported=false,boss=null,bossClock=38,lastHit=0,reloading=false,activePower=null,powerUntil=0,mapGroup=null,mapTransitioning=false;
let fish=[],bolts=[],particles=[];
const controllerShots=new WeakMap();

const telemetrySession=sessionStorage.getItem('vrfg.session')||crypto.randomUUID?.()||('fish-'+Date.now().toString(36)+Math.random().toString(36).slice(2));
try{sessionStorage.setItem('vrfg.session',telemetrySession)}catch{}

function currentMap(){return WORLD_MAPS[state.mapIndex]||WORLD_MAPS[0]}
function save(){localStorage.setItem('vrfg.player',JSON.stringify(state))}
function telemetryEvent(eventType,detail=''){
  fetch('/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    eventType,sessionId:telemetrySession,level:state.level,score:state.score,catches:state.catches,vr:renderer.xr.isPresenting,
    detail:String(detail||'').slice(0,500)
  }),keepalive:true}).catch(()=>{});
}
telemetryEvent('session_start');
addEventListener('error',e=>telemetryEvent('client_error',e.message||'window error'));
addEventListener('unhandledrejection',e=>telemetryEvent('client_error',String(e.reason||'unhandled rejection')));

function toast(text,color='#79f8ff',ms=720){
  const el=$('#toast');el.textContent=text;el.style.color=color;el.style.opacity=1;
  el.style.transform='translate(-50%,-50%) scale(1.05)';clearTimeout(toast.t);
  toast.t=setTimeout(()=>{el.style.opacity=0;el.style.transform='translate(-50%,-50%) scale(.9)'},ms);
}
function setEvent(text,color='#ffcf40',visible=true){
  const el=$('#event');el.textContent=text;el.style.color=color;el.style.opacity=visible?1:0;
}
function updatePower(){
  if(activePower&&performance.now()>powerUntil){telemetryEvent('powerup_end',activePower.id);activePower=null}
}
function powerMultiplier(){return activePower?.id==='double'?2:1}
function hud(){
  state.level=1+Math.floor(state.xp/500);state.best=Math.max(state.best,state.score);
  const map=currentMap();
  $('#score').textContent=state.score.toLocaleString();$('#best').textContent=state.best.toLocaleString();$('#level').textContent=state.level;
  $('#catches').textContent=state.catches;$('#combo').textContent='x'+Math.max(1,Math.min(12,1+Math.floor(state.combo/4)));
  $('#rare').textContent=state.rare;$('#ammo').textContent=(activePower?.id==='infinite'?'∞':state.ammo)+' / '+AMMO_MAX;
  $('#mapName').textContent=map.name;$('#mapBonus').textContent='x'+map.bonus.toFixed(1);
  $('#xpbar').style.width=((state.xp%500)/5)+'%';$('#xpText').textContent=(state.xp%500)+' / 500';
  $('#mapProgress').style.width=(Math.min(1,state.mapCatches/map.progress)*100)+'%';$('#mapProgressText').textContent=state.mapCatches+' / '+map.progress;
  const p=$('#powerup');
  if(activePower){p.textContent=activePower.label+' '+Math.max(0,Math.ceil((powerUntil-performance.now())/1000))+'s';p.classList.add('active')}
  else{p.textContent='NO POWER-UP';p.classList.remove('active')}
}

function disposeGroup(group){
  group?.traverse(o=>{
    o.geometry?.dispose?.();
    if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.()); else o.material?.dispose?.();
  });
}
function clearMapGroup(){
  if(mapGroup){scene.remove(mapGroup);disposeGroup(mapGroup)}
  mapGroup=new THREE.Group();scene.add(mapGroup);
}
function makeStarField(group,count=180){
  const geo=new THREE.BufferGeometry(),pts=[];
  for(let i=0;i<count;i++)pts.push((Math.random()-.5)*65,Math.random()*28-6,-Math.random()*75);
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  group.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xd6e7ff,size:.07,sizeAttenuation:true})));
}
function buildMap(){
  clearMapGroup();const map=currentMap();
  renderer.setClearColor(map.clear);scene.fog=new THREE.FogExp2(map.fog,map.fogDensity);
  hemi.color.setHex(map.id==='lava'?0xff6b3d:map.id==='space'?0x8aa8ff:0x7deaff);
  hemi.groundColor.setHex(map.id==='lava'?0x220000:map.id==='space'?0x03030f:0x001018);
  keyLight.color.setHex(map.id==='lava'?0xffba75:map.id==='space'?0xaac8ff:0xb5ffff);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,85,4,4),new THREE.MeshLambertMaterial({
    color:map.floor,emissive:map.id==='lava'?0x220300:0x000000,emissiveIntensity:.4
  }));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,-2.3,-24);mapGroup.add(floor);

  for(let i=0;i<26;i++){
    const geo=map.id==='space'?new THREE.IcosahedronGeometry(.35+Math.random()*.7,0):new THREE.DodecahedronGeometry(.35+Math.random()*.85,0);
    const r=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:map.rock,emissive:map.id==='lava'?0x250500:map.id==='space'?0x07071c:0x000000,emissiveIntensity:.35}));
    r.scale.y=.5+Math.random()*1.8;r.position.set((Math.random()-.5)*22,-2+Math.random()*.25,-3-Math.random()*42);
    r.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);mapGroup.add(r);
  }

  if(map.id==='reef'){
    const coralColors=[0xff48c8,0x19dfff,0x62ff83,0xffcf40];
    for(let i=0;i<18;i++){
      const coral=new THREE.Group(),mat=new THREE.MeshLambertMaterial({color:coralColors[i%4],emissive:coralColors[i%4],emissiveIntensity:.18});
      for(let b=0;b<3+Math.floor(Math.random()*3);b++){
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.08,.7+Math.random()*.7,6),mat);
        stem.position.set((b-1)*.12,.45+Math.random()*.25,0);stem.rotation.z=(Math.random()-.5)*.35;coral.add(stem);
      }
      coral.position.set((Math.random()-.5)*18,-2.25,-3-Math.random()*32);mapGroup.add(coral);
    }
  }
  if(map.id==='lava'){
    for(let i=0;i<13;i++){
      const vent=new THREE.PointLight(0xff3b00,1.3,4);vent.position.set((Math.random()-.5)*16,-1.6,-4-Math.random()*35);mapGroup.add(vent);
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.2,.9,7),new THREE.MeshLambertMaterial({color:0x401005,emissive:0xff2600,emissiveIntensity:.35}));
      cone.position.copy(vent.position);cone.position.y=-1.9;mapGroup.add(cone);
    }
  }
  if(map.id==='space'){
    makeStarField(mapGroup,220);
    for(let i=0;i<7;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.8+Math.random()*1.3,.035,6,28),new THREE.MeshBasicMaterial({color:[0x8a55ff,0x00e5ff,0xff48c8][i%3]}));
      ring.position.set((Math.random()-.5)*15,Math.random()*7-1,-8-Math.random()*34);ring.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
      mapGroup.add(ring);
    }
  }
  telemetryEvent('map_enter',map.id);
}
function changeMap(index=null,manual=false){
  mapTransitioning=false;state.mapIndex=index==null?(state.mapIndex+1)%WORLD_MAPS.length:index%WORLD_MAPS.length;state.mapCatches=0;buildMap();
  fish.slice().forEach(f=>scene.remove(f));fish=[];boss=null;bossClock=30;for(let i=0;i<28;i++)spawnFish();save();hud();
  const map=currentMap();toast(map.name+' · BONUS x'+map.bonus.toFixed(1),map.id==='lava'?'#ff7a38':map.id==='space'?'#b68cff':'#79f8ff',1100);
  if(manual)telemetryEvent('map_manual_change',map.id);
}

const bodyGeo=new THREE.SphereGeometry(.33,14,10),tailGeo=new THREE.ConeGeometry(.26,.52,4),finGeo=new THREE.ConeGeometry(.12,.28,3),eyeGeo=new THREE.SphereGeometry(.038,7,5);
const SPECIALS=[
  {id:'gold',label:'GOLDEN FISH',chance:.045,color:0xffd447,value:600,power:'double'},
  {id:'crystal',label:'CRYSTAL FISH',chance:.035,color:0x7fffff,value:500,power:'infinite'},
  {id:'nova',label:'NOVA FISH',chance:.025,color:0xff57d8,value:900,power:'rapid'}
];
function specialRoll(){
  const x=Math.random();let acc=0;
  for(const s of SPECIALS){acc+=s.chance;if(x<acc)return s}
  return null;
}
function detailFish(group,color,special,bossFish){
  const mat=new THREE.MeshLambertMaterial({color,emissive:special?color:(bossFish?0x330000:0x000000),emissiveIntensity:special?.18:(bossFish?.25:.05)});
  const body=new THREE.Mesh(bodyGeo,mat);body.scale.set(bossFish?3.4:1.72,bossFish?1.9:.82,bossFish?1.45:.58);group.add(body);
  const tail=new THREE.Mesh(tailGeo,mat);tail.rotation.z=Math.PI/2;tail.position.x=bossFish?-1.78:-.65;tail.scale.setScalar(bossFish?2.4:1);group.add(tail);

  const finMat=mat.clone();finMat.color.offsetHSL(.05,.08,.08);
  for(const side of [-1,1]){
    const fin=new THREE.Mesh(finGeo,finMat);fin.rotation.z=side*Math.PI/2;fin.rotation.x=side*.35;fin.position.set(.05,side*(bossFish?.55:.25),0);fin.scale.setScalar(bossFish?1.8:1);group.add(fin);
  }

  const eyeMat=new THREE.MeshBasicMaterial({color:bossFish?0xffee00:0xffffff}),pupilMat=new THREE.MeshBasicMaterial({color:0x050508});
  for(const z of [-1,1]){
    const eye=new THREE.Mesh(eyeGeo,eyeMat);eye.position.set(bossFish?.75:.31,bossFish?.32:.13,z*(bossFish?.55:.23));eye.scale.setScalar(bossFish?2.1:1);group.add(eye);
    const pupil=new THREE.Mesh(eyeGeo,pupilMat);pupil.scale.setScalar(bossFish?.8:.45);pupil.position.set(eye.position.x+.028,eye.position.y,eye.position.z);group.add(pupil);
  }

  const stripeMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:special?.55:.18});
  for(let i=0;i<(bossFish?5:3);i++){
    const stripe=new THREE.Mesh(new THREE.TorusGeometry((bossFish?.24:.085)+(i*.008),bossFish?.025:.012,5,14),stripeMat);
    stripe.rotation.y=Math.PI/2;stripe.position.x=(bossFish?-1.0:-.34)+i*(bossFish?.43:.18);stripe.scale.set(1,bossFish?2.1:1.35,bossFish?1.7:1.1);group.add(stripe);
  }

  if(special){
    const halo=new THREE.Mesh(new THREE.TorusGeometry(bossFish?1.2:.58,.035,7,28),new THREE.MeshBasicMaterial({color:special.color,transparent:true,opacity:.75}));
    halo.rotation.y=Math.PI/2;group.add(halo);group.userData.halo=halo;
  }
}
function spawnFish(spec={}){
  const map=currentMap(),special=spec.boss?null:(spec.special||specialRoll()),bossFish=!!spec.boss;
  const color=spec.color??special?.color??map.fish[Math.floor(Math.random()*map.fish.length)],g=new THREE.Group();
  detailFish(g,color,special,bossFish);
  g.position.set((Math.random()-.5)*12,bossFish?.4:-1+Math.random()*5.6,bossFish?-15:-4-Math.random()*28);
  const dir=Math.random()>.5?1:-1;g.scale.x*=dir;
  const baseHp=bossFish?42:1+Math.floor(Math.random()*3)+(state.level>5?1:0);
  g.userData={fish:1,boss:bossFish,special:special?.id||null,specialData:special||null,hp:baseHp,maxhp:baseHp,
    value:bossFish?3000:(special?.value||20+Math.floor(Math.random()*9)*10),v:bossFish?.22:.32+Math.random()*.72+(state.mapIndex*.06),dir,phase:Math.random()*Math.PI*2,halo:g.userData.halo||null};
  scene.add(g);fish.push(g);if(bossFish)boss=g;return g;
}
function spawnPopulation(){for(let i=0;i<28;i++)spawnFish()}

const ray=new THREE.Raycaster();
function haptic(controller,p=.35,d=35){const a=controller?.userData?.source?.gamepad?.hapticActuators?.[0];a?.pulse?.(p,d).catch(()=>{})}
function spark(position,color,count=8){
  for(let i=0;i<count;i++){
    const p=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.03,4,4),new THREE.MeshBasicMaterial({color}));
    p.position.copy(position);p.userData={vel:new THREE.Vector3((Math.random()-.5)*1.5,(Math.random()-.5)*1.5,(Math.random()-.5)*1.5),life:.35+Math.random()*.3};
    scene.add(p);particles.push(p);
  }
}
function bolt(origin,direction){
  const color=activePower?.id==='rapid'?0xfff06b:currentMap().accent;
  const m=new THREE.Mesh(new THREE.SphereGeometry(.04,6,5),new THREE.MeshBasicMaterial({color}));
  m.position.copy(origin);m.userData={d:direction.clone(),life:.42};scene.add(m);bolts.push(m);
}
function activatePower(id){
  const powers={
    double:{id:'double',label:'DOUBLE SCORE',duration:12000,color:'#ffd447'},
    infinite:{id:'infinite',label:'INFINITE AMMO',duration:10000,color:'#7fffff'},
    rapid:{id:'rapid',label:'RAPID FIRE',duration:9000,color:'#ff57d8'}
  };
  const p=powers[id];if(!p)return;activePower=p;powerUntil=performance.now()+p.duration;toast(p.label+'!',p.color,1000);telemetryEvent('powerup_start',id);hud();
}
function reload(){
  if(reloading||state.ammo>=AMMO_MAX||activePower?.id==='infinite')return;
  reloading=true;$('#reloadButton').textContent='RELOADING…';
  setTimeout(()=>{state.ammo=AMMO_MAX;reloading=false;$('#reloadButton').textContent='RELOAD';save();hud();telemetryEvent('reload')},700);
}
function registerCatch(f){
  const map=currentMap(),comboMult=Math.max(1,Math.min(12,1+Math.floor(state.combo/4)));
  const award=Math.round(f.userData.value*comboMult*map.bonus*powerMultiplier());
  state.score+=award;state.xp+=f.userData.boss?500:f.userData.special?130:Math.min(90,f.userData.value);state.catches++;state.combo++;
  state.bestCombo=Math.max(state.bestCombo,state.combo);state.mapCatches++;

  if(f.userData.special){
    state.rare++;toast(f.userData.specialData.label+' +'+award,'#ffdf65',1000);activatePower(f.userData.specialData.power);telemetryEvent('rare_fish',f.userData.special);
  }else if(f.userData.boss){
    toast('BOSS DOWN +'+award,'#ffcf40',1100);telemetryEvent('boss_caught',String(award));
  }else{
    toast('CATCH +'+award,'#79f8ff');if(state.catches<=3||state.catches%5===0)telemetryEvent('fish_caught',String(award));
  }

  if(f.userData.boss){boss=null;bossClock=48;setEvent('',undefined,false)}
  spark(f.position.clone(),f.userData.specialData?.color||currentMap().accent,f.userData.boss?30:12);
  scene.remove(f);fish.splice(fish.indexOf(f),1);if(!f.userData.boss)setTimeout(()=>spawnFish(),180);

  if(state.mapCatches>=map.progress&&!mapTransitioning){mapTransitioning=true;const next=(state.mapIndex+1)%WORLD_MAPS.length;toast('WORLD CLEARED!','#ffffff',900);setTimeout(()=>changeMap(next),500)}
  save();hud();
}
function fire(origin,direction,controller){
  if(!playActive)return;updatePower();
  const now=performance.now(),minGap=activePower?.id==='rapid'?90:180,last=controllerShots.get(controller||canvas)||0;
  if(now-last<minGap)return;controllerShots.set(controller||canvas,now);

  if(activePower?.id!=='infinite'){
    if(state.ammo<=0){toast('EMPTY · RELOAD','#ff7b7b');haptic(controller,.5,45);reload();return}
    state.ammo--;
  }

  state.shots++;bolt(origin,direction);ray.set(origin,direction);
  const hit=ray.intersectObjects(fish,true)[0];
  if(!hit){if(now-lastHit>1800)state.combo=0;hud();save();return}

  let f=hit.object;while(f.parent&&!f.userData.fish)f=f.parent;if(!f.userData.fish)return;
  lastHit=now;f.userData.hp-=activePower?.id==='rapid'?2:1;f.scale.multiplyScalar(.985);
  spark(hit.point,currentMap().accent,f.userData.boss?8:4);haptic(controller,f.userData.boss?.75:.35,f.userData.boss?70:30);
  if(f.userData.hp<=0)registerCatch(f);hud();save();
}

for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i);scene.add(c);
  const gun=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,.58,8),new THREE.MeshLambertMaterial({color:i?0xff44cc:0x25eaff,emissive:i?0x550033:0x004455}));
  gun.rotateX(Math.PI/2);gun.translateZ(-.29);c.add(gun);c.addEventListener('connected',e=>c.userData.source=e.data);
  c.addEventListener('selectstart',()=>{
    const o=new THREE.Vector3(),q=new THREE.Quaternion(),d=new THREE.Vector3(0,0,-1);c.getWorldPosition(o);c.getWorldQuaternion(q);d.applyQuaternion(q);fire(o,d,c);
  });
  c.addEventListener('squeezestart',()=>{if(i===0)reload();else changeMap(null,true)});
}

async function configureStartMode(){
  const button=$('#vr');
  try{immersiveVrSupported=Boolean(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr'))}catch{immersiveVrSupported=false}
  if(immersiveVrSupported){
    button.textContent='ENTER VR';button.dataset.mode='vr';$('#hint').textContent='Quest: trigger shoots · left grip reloads · right grip changes world · special fish unlock power-ups';
  }else{
    button.textContent='START DESKTOP';button.dataset.mode='desktop';$('#hint').textContent='Desktop: click fish · WASD/arrows move · R reload · M change map';
  }
}
configureStartMode();

$('#vr').onclick=async()=>{
  const button=$('#vr');
  if(!immersiveVrSupported){
    playActive=true;document.body.classList.add('desktop-playing');button.textContent='DESKTOP ACTIVE';button.disabled=true;canvas.focus();
    telemetryEvent('desktop_start');toast(currentMap().name+' START','#79f8ff');return;
  }
  try{
    const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});await renderer.xr.setSession(s);playActive=true;
    telemetryEvent('vr_enter');button.textContent='VR ACTIVE';toast(currentMap().name+' START','#79f8ff');
    s.addEventListener('end',()=>{telemetryEvent('vr_exit');playActive=false;configureStartMode()},{once:true});
    if(s.supportedFrameRates?.length){const target=s.supportedFrameRates.includes(72)?72:s.supportedFrameRates[0];try{await s.updateTargetFrameRate(target)}catch{}}
  }catch(error){telemetryEvent('vr_error',error?.message||String(error));toast('VR START FAILED','#ff6b6b');button.textContent='ENTER VR'}
};

$('#reloadButton').onclick=()=>reload();
$('#mapButton').onclick=()=>changeMap(null,true);

const mouse=new THREE.Vector2(),desktopKeys=new Set();
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();desktopKeys.add(k);if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='r')reload();if(k==='m')changeMap(null,true);
});
addEventListener('keyup',e=>desktopKeys.delete(e.key.toLowerCase()));
addEventListener('pointerdown',e=>{
  if(renderer.xr.isPresenting||e.target.closest?.('#controls')||!playActive)return;
  mouse.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mouse,camera);fire(ray.ray.origin.clone(),ray.ray.direction.clone());
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

buildMap();spawnPopulation();hud();

const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),.04),t=performance.now()/1000;updatePower();hud();

  if(playActive){
    if(!renderer.xr.isPresenting){
      const speed=3.2*dt;
      if(desktopKeys.has('w')||desktopKeys.has('arrowup'))camera.position.z-=speed;
      if(desktopKeys.has('s')||desktopKeys.has('arrowdown'))camera.position.z+=speed;
      if(desktopKeys.has('a')||desktopKeys.has('arrowleft'))camera.position.x-=speed;
      if(desktopKeys.has('d')||desktopKeys.has('arrowright'))camera.position.x+=speed;
      camera.position.x=Math.max(-7.5,Math.min(7.5,camera.position.x));camera.position.z=Math.max(-3,Math.min(9,camera.position.z));
    }

    bossClock-=dt;
    if(bossClock<=0&&!boss){
      spawnFish({boss:true,color:currentMap().id==='lava'?0xff3100:currentMap().id==='space'?0xa657ff:0xff285d});
      setEvent('⚠ '+currentMap().name+' BOSS INBOUND ⚠',currentMap().id==='lava'?'#ff6b32':'#ffcf40',true);
      toast('BOSS WAVE','#ffcf40',1000);telemetryEvent('boss_spawn',currentMap().id);
    }

    fish.forEach((f,i)=>{
      f.position.x+=f.userData.dir*f.userData.v*dt;f.position.y+=Math.sin(t*(f.userData.boss?1.1:1.45)+f.userData.phase+i*.07)*.003;
      f.rotation.y=Math.sin(t*.7+f.userData.phase)*.08;if(f.userData.halo)f.userData.halo.rotation.x+=dt*1.8;
      if(Math.abs(f.position.x)>8.5){f.userData.dir*=-1;f.scale.x*=-1}
    });

    for(let i=bolts.length-1;i>=0;i--){
      const b=bolts[i];b.position.addScaledVector(b.userData.d,dt*30);b.userData.life-=dt;
      if(b.userData.life<=0){scene.remove(b);bolts.splice(i,1)}
    }
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.position.addScaledVector(p.userData.vel,dt);p.userData.vel.multiplyScalar(.96);p.userData.life-=dt;p.scale.multiplyScalar(.97);
      if(p.userData.life<=0){scene.remove(p);particles.splice(i,1)}
    }
  }

  renderer.render(scene,camera);
});
