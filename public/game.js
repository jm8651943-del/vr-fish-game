import * as THREE from '/vendor/three.module.js';
const $=s=>document.querySelector(s),canvas=$('#c');canvas.tabIndex=0;const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.xr.enabled=true;renderer.xr.setFoveation?.(.65);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x021a2b,.035);const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,90);camera.position.set(0,1.55,3.5);scene.add(new THREE.HemisphereLight(0x7deaff,0x001018,1.8));const sun=new THREE.DirectionalLight(0xb5ffff,1.5);sun.position.set(2,7,3);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(55,55),new THREE.MeshLambertMaterial({color:0x073142}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.3;scene.add(floor);
const rockMat=new THREE.MeshLambertMaterial({color:0x123d45});for(let i=0;i<24;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+Math.random()*.8,0),rockMat);r.scale.y=.5+Math.random()*1.8;r.position.set((Math.random()-.5)*20,-2+Math.random()*.2,-3-Math.random()*30);r.rotation.set(Math.random(),Math.random(),Math.random());scene.add(r)}
let state=JSON.parse(localStorage.getItem('vrfg.player')||'null')||{score:0,xp:0,level:1,catches:0,shots:0,combo:0,bestCombo:0};let boss=null,bossClock=42,hitStreak=0,lastHit=0,playActive=false,immersiveVrSupported=false;
const telemetrySession=sessionStorage.getItem('vrfg.session')||crypto.randomUUID?.()||('fish-'+Date.now().toString(36)+Math.random().toString(36).slice(2));
try{sessionStorage.setItem('vrfg.session',telemetrySession)}catch{}
function telemetryEvent(eventType,detail=''){
  const payload={eventType,sessionId:telemetrySession,level:state.level,score:state.score,catches:state.catches,vr:renderer.xr.isPresenting,detail:String(detail||'').slice(0,500)};
  fetch('/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
}
telemetryEvent('session_start');
addEventListener('error',e=>telemetryEvent('client_error',e.message||'window error'));
addEventListener('unhandledrejection',e=>telemetryEvent('client_error',String(e.reason||'unhandled rejection')));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')telemetryEvent('session_background')});
const save=()=>localStorage.setItem('vrfg.player',JSON.stringify(state));function hud(){state.level=1+Math.floor(state.xp/500);$('#score').textContent=state.score.toLocaleString();$('#level').textContent=state.level;$('#catches').textContent=state.catches;$('#combo').textContent='x'+Math.max(1,state.combo);$('#xpbar').style.width=((state.xp%500)/5)+'%'}hud();
function toast(t,c='#79f8ff'){const e=$('#toast');e.textContent=t;e.style.color=c;e.style.opacity=1;e.style.transform='translate(-50%,-50%) scale(1.05)';clearTimeout(toast.t);toast.t=setTimeout(()=>{e.style.opacity=0;e.style.transform='translate(-50%,-50%) scale(.9)'},650)}
const colors=[0x19dfff,0xff48c8,0xffcf40,0x62ff83,0x906bff,0xff633f];const fishGeo=new THREE.SphereGeometry(.34,10,7),tailGeo=new THREE.ConeGeometry(.27,.52,3),fish=[];function spawn(spec={}){const g=new THREE.Group(),col=spec.color??colors[Math.floor(Math.random()*colors.length)],m=new THREE.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:.12});const b=new THREE.Mesh(fishGeo,m);b.scale.set(spec.boss?3.2:1.7,spec.boss?1.8:.8,spec.boss?1.4:.55);g.add(b);const t=new THREE.Mesh(tailGeo,m);t.rotation.z=Math.PI/2;t.position.x=spec.boss?-1.7:-.64;t.scale.setScalar(spec.boss?2.2:1);g.add(t);g.position.set((Math.random()-.5)*11,spec.boss?.5:-1+Math.random()*5,spec.boss?-13:-4-Math.random()*24);const dir=Math.random()>.5?1:-1;g.scale.x*=dir;g.userData={fish:1,boss:!!spec.boss,hp:spec.boss?35:1+Math.floor(Math.random()*4),maxhp:spec.boss?35:4,value:spec.boss?2500:20+Math.floor(Math.random()*9)*10,v:spec.boss?.2:.3+Math.random()*.7,dir};scene.add(g);fish.push(g);if(spec.boss)boss=g;return g}for(let i=0;i<30;i++)spawn();
const ray=new THREE.Raycaster(),bolts=[];function haptic(controller,p=.35,d=35){const a=controller?.userData?.source?.gamepad?.hapticActuators?.[0];a?.pulse?.(p,d).catch(()=>{})}function bolt(o,d){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,5,5),new THREE.MeshBasicMaterial({color:0x79ffff}));m.position.copy(o);m.userData={d:d.clone(),life:.35};scene.add(m);bolts.push(m)}
function kill(f){const mult=Math.min(8,1+Math.floor(state.combo/4));const award=f.userData.value*mult;state.score+=award;state.xp+=f.userData.boss?500:Math.min(80,f.userData.value);state.catches++;state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);toast(f.userData.boss?'ABYSS BOSS +'+award:'CATCH +'+award,f.userData.boss?'#ffcf40':'#79f8ff');if(f.userData.boss){boss=null;bossClock=55;$('#event').style.opacity=0}scene.remove(f);fish.splice(fish.indexOf(f),1);if(!f.userData.boss)setTimeout(()=>spawn(),180);save();hud();if(f.userData.boss||state.catches<=3||state.catches%5===0)telemetryEvent(f.userData.boss?'boss_caught':'fish_caught',String(award))}
function fire(o,d,controller){state.shots++;bolt(o,d);ray.set(o,d);const hit=ray.intersectObjects(fish,true)[0];if(!hit){if(performance.now()-lastHit>1800)state.combo=0;hud();return}let f=hit.object;while(f.parent&&!f.userData.fish)f=f.parent;if(!f.userData.fish)return;lastHit=performance.now();f.userData.hp--;f.scale.multiplyScalar(.97);haptic(controller,f.userData.boss?.7:.35,f.userData.boss?70:30);if(f.userData.hp<=0)kill(f)}
for(let i=0;i<2;i++){const c=renderer.xr.getController(i);scene.add(c);c.add(new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,.55,8),new THREE.MeshLambertMaterial({color:i?0xff44cc:0x25eaff,emissive:i?0x550033:0x004455})).rotateX(Math.PI/2).translateZ(-.28));c.addEventListener('connected',e=>c.userData.source=e.data);c.addEventListener('selectstart',()=>{const o=new THREE.Vector3(),q=new THREE.Quaternion(),d=new THREE.Vector3(0,0,-1);c.getWorldPosition(o);c.getWorldQuaternion(q);d.applyQuaternion(q);fire(o,d,c)})}
async function configureStartMode(){
  const button=$('#vr');
  try{immersiveVrSupported=Boolean(navigator.xr && await navigator.xr.isSessionSupported('immersive-vr'))}catch{immersiveVrSupported=false}
  if(immersiveVrSupported){
    button.textContent='ENTER VR';
    button.dataset.mode='vr';
    $('#hint').textContent='Quest: press ENTER VR, aim with controller and pull trigger · Desktop fallback also available';
  }else{
    button.textContent='START DESKTOP';
    button.dataset.mode='desktop';
    $('#hint').textContent='Laptop/Desktop: press START DESKTOP, click fish to shoot · WASD / arrow keys move';
  }
}
configureStartMode();

$('#vr').onclick=async()=>{
  const button=$('#vr');
  if(!immersiveVrSupported){
    playActive=true;
    document.body.classList.add('desktop-playing');
    button.textContent='DESKTOP ACTIVE';
    button.disabled=true;
    canvas.focus();
    telemetryEvent('desktop_start');
    toast('DESKTOP MODE STARTED','#79f8ff');
    setTimeout(()=>{button.style.opacity=.35;button.textContent='PLAYING ON DESKTOP'},900);
    return;
  }
  try{
    const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});
    await renderer.xr.setSession(s);
    playActive=true;
    telemetryEvent('vr_enter');
    button.textContent='VR ACTIVE';
    s.addEventListener('end',()=>{telemetryEvent('vr_exit');playActive=false;configureStartMode()},{once:true});
    if(s.supportedFrameRates?.length){
      const target=s.supportedFrameRates.includes(72)?72:s.supportedFrameRates[0];
      try{await s.updateTargetFrameRate(target)}catch{}
    }
  }catch(error){
    telemetryEvent('vr_error',error?.message||String(error));
    toast('VR START FAILED · USE QUEST BROWSER','#ff6b6b');
    button.textContent='ENTER VR';
  }
};
const mouse=new THREE.Vector2(),desktopKeys=new Set();addEventListener('keydown',e=>{desktopKeys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault()});addEventListener('keyup',e=>desktopKeys.delete(e.key.toLowerCase()));addEventListener('pointerdown',e=>{if(renderer.xr.isPresenting||e.target.id==='vr'||!playActive)return;mouse.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mouse,camera);fire(ray.ray.origin.clone(),ray.ray.direction.clone())});addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.04),t=performance.now()/1000;if(playActive){if(!renderer.xr.isPresenting){const speed=3.1*dt;if(desktopKeys.has('w')||desktopKeys.has('arrowup'))camera.position.z-=speed;if(desktopKeys.has('s')||desktopKeys.has('arrowdown'))camera.position.z+=speed;if(desktopKeys.has('a')||desktopKeys.has('arrowleft'))camera.position.x-=speed;if(desktopKeys.has('d')||desktopKeys.has('arrowright'))camera.position.x+=speed;camera.position.x=Math.max(-7,Math.min(7,camera.position.x));camera.position.z=Math.max(-2,Math.min(8,camera.position.z))}bossClock-=dt;if(bossClock<=0&&!boss){spawn({boss:true,color:0xff285d});$('#event').textContent='⚠ ABYSS BOSS IN THE ARENA ⚠';$('#event').style.opacity=1;toast('BOSS WAVE','#ffcf40')}fish.forEach((f,i)=>{f.position.x+=f.userData.dir*f.userData.v*dt;f.position.y+=Math.sin(t*(f.userData.boss?.7:1.2)+i)*.002;if(Math.abs(f.position.x)>8){f.userData.dir*=-1;f.scale.x*=-1}});for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.position.addScaledVector(b.userData.d,dt*28);b.userData.life-=dt;if(b.userData.life<=0){scene.remove(b);bolts.splice(i,1)}}}renderer.render(scene,camera)});