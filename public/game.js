import * as THREE from '/vendor/three.module.js';
import {WORLD_MAPS,SPECIES,BOSSES,SPECIALS,WEAPONS,UPGRADES,ACHIEVEMENTS} from './game-data.js';
import {ensureAudio,startTrapBeat,setTrapWorld,sfx} from './audio.js';
import {createArcadeFishVisual,flipArcadeFish,makeHologramLabel,updateArcadeFishHealth} from './fish-art.js';

const $=s=>document.querySelector(s);
const SUPPORT_PHONE_DISPLAY='210-439-5390';
const SUPPORT_PHONE_E164='+12104395390';
const canvas=$('#c');
canvas.tabIndex=0;

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.15));
renderer.xr.enabled=true;
renderer.xr.setFoveation?.(.75);
renderer.setSize(innerWidth,innerHeight);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,120);
camera.position.set(0,1.55,3.5);

const hemi=new THREE.HemisphereLight(0x8eefff,0x03101a,1.65);
const keyLight=new THREE.DirectionalLight(0xffffff,1.2);
keyLight.position.set(3,8,5);
scene.add(hemi,keyLight);

let state=JSON.parse(localStorage.getItem('vrfg.player')||'null')||{};
state={
  score:Number(state.score||0),
  best:Number(state.best||state.score||0),
  xp:Number(state.xp||0),
  level:Number(state.level||1),
  catches:Number(state.catches||0),
  shots:Number(state.shots||0),
  combo:Number(state.combo||0),
  bestCombo:Number(state.bestCombo||0),
  rare:Number(state.rare||0),
  mapIndex:Number.isFinite(Number(state.mapIndex))?Number(state.mapIndex)%WORLD_MAPS.length:0,
  mapCatches:Number(state.mapCatches||0),
  ammo:Number.isFinite(Number(state.ammo))?Number(state.ammo):12,
  cores:Number(state.cores||0),
  bossKills:Number(state.bossKills||0),
  weaponId:state.weaponId||'pulse',
  upgrades:{damage:0,magazine:0,score:0,luck:0,...(state.upgrades||{})},
  achievements:{...(state.achievements||{})},
  worldsVisited:Array.isArray(state.worldsVisited)?state.worldsVisited:[],
  totalWorldClears:Number(state.totalWorldClears||0),
  balanceCents:Number.isFinite(Number(state.balanceCents))?Number(state.balanceCents):2000,
  sessionStartCents:Number.isFinite(Number(state.sessionStartCents))?Number(state.sessionStartCents):2000,
  shotTierIndex:Number.isFinite(Number(state.shotTierIndex))?Math.max(0,Math.min(6,Number(state.shotTierIndex))):0,
  totalSpentCents:Number(state.totalSpentCents||0),
  totalWonCents:Number(state.totalWonCents||0),
  superCharge:Number(state.superCharge||0)
};

let playActive=false;
let immersiveVrSupported=false;
let boss=null;
let bossClock=36;
let lastHit=0;
let reloading=false;
let activePower=null;
let powerUntil=0;
let mapGroup=null;
let mapTransitioning=false;
let fish=[];
let bolts=[];
let particles=[];
let ambient=[];
let armoryOpen=false;
let supportOpen=false;
let economyOpen=false;
let playMode='gold';
let complianceState=null;
let lockOn=false;
const controllerShots=new WeakMap();
const xrButtonState=new WeakMap();
let weaponHologram=null;
let weaponHologramTimer=null;
let vrStatusPanel=null;
let vrStatusLast='';
let nextHudAt=0;
let musicStatus='OFF';
const vrTmpPos=new THREE.Vector3();
const vrTmpQuat=new THREE.Quaternion();
const vrTmpDir=new THREE.Vector3();
const vrTmpDown=new THREE.Vector3();

const telemetrySession=sessionStorage.getItem('vrfg.session')||crypto.randomUUID?.()||('fish-'+Date.now().toString(36)+Math.random().toString(36).slice(2));
try{sessionStorage.setItem('vrfg.session',telemetrySession)}catch{}

function currentMap(){return WORLD_MAPS[state.mapIndex]||WORLD_MAPS[0]}
function currentWeapon(){return WEAPONS.find(w=>w.id===state.weaponId)||WEAPONS[0]}
function maxAmmo(){return 12+(Number(state.upgrades.magazine||0)*3)}
function damageMultiplier(){return 1+(Number(state.upgrades.damage||0)*.15)}
function scoreUpgradeMultiplier(){return 1+(Number(state.upgrades.score||0)*.10)}
function rareChanceMultiplier(){return 1+(Number(state.upgrades.luck||0)*.15)}
const SHOT_TIERS=[5,10,25,50,100,250,500];
function shotCents(){return SHOT_TIERS[state.shotTierIndex]||5}
function money(cents){return String.fromCharCode(36)+(Number(cents||0)/100).toFixed(2)}
function comboMultiplier(){return Math.max(1,Math.min(12,1+Math.floor(state.combo/4)))}
function changeShotTier(step=1,controller=null){
  const next=Math.max(0,Math.min(SHOT_TIERS.length-1,state.shotTierIndex+step));
  if(next===state.shotTierIndex){haptic(controller,.12,25);return}
  state.shotTierIndex=next;
  haptic(controller,.2,30);
  toast('BULLET '+money(shotCents()),'#ffd34a',700);
  showStatusHologram('BULLET '+money(shotCents()),'#ffd34a','BALANCE '+money(state.balanceCents));
  telemetryEvent('shot_denomination',String(shotCents()));
  save();hud();
}

function save(){localStorage.setItem('vrfg.player',JSON.stringify(state))}
function telemetryEvent(eventType,detail=''){
  fetch('/api/telemetry',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      eventType,sessionId:telemetrySession,level:state.level,score:state.score,catches:state.catches,
      vr:renderer.xr.isPresenting,detail:String(detail||'').slice(0,500)
    }),
    keepalive:true
  }).catch(()=>{});
}
telemetryEvent('session_start');
addEventListener('error',e=>telemetryEvent('client_error',e.message||'window error'));
addEventListener('unhandledrejection',e=>telemetryEvent('client_error',String(e.reason||'unhandled rejection')));

function toast(text,color='#79f8ff',ms=760){
  const el=$('#toast');
  el.textContent=text;el.style.color=color;el.style.opacity=1;
  el.style.transform='translate(-50%,-50%) scale(1.05)';
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>{el.style.opacity=0;el.style.transform='translate(-50%,-50%) scale(.9)'},ms);
}
function setEvent(text,color='#ffcf40',visible=true){
  const el=$('#event');
  el.textContent=text;el.style.color=color;el.style.opacity=visible?1:0;
}
function haptic(controller,p=.35,d=35){
  const a=controller?.userData?.source?.gamepad?.hapticActuators?.[0];
  a?.pulse?.(p,d).catch(()=>{});
}
function updatePower(){
  if(activePower&&performance.now()>powerUntil){
    telemetryEvent('powerup_end',activePower.id);
    activePower=null;
  }
}
function scorePowerMultiplier(){return activePower?.id==='double'?2:1}

function ensureVisited(mapId){
  if(!state.worldsVisited.includes(mapId))state.worldsVisited.push(mapId);
}

function hud(){
  state.level=1+Math.floor(state.xp/500);
  state.best=Math.max(state.best,state.score);
  state.ammo=Math.min(state.ammo,maxAmmo());

  const map=currentMap();
  const weapon=currentWeapon();
  $('#balance').textContent=money(state.balanceCents);
  const pl=state.balanceCents-state.sessionStartCents;
  $('#sessionPL').textContent=(pl>=0?'+':'')+money(pl);
  $('#sessionPL').style.color=pl>=0?'#7dff9b':'#ff7272';
  $('#shotCost').textContent=money(shotCents());
  $('#score').textContent=state.score.toLocaleString();
  $('#best').textContent=state.best.toLocaleString();
  $('#level').textContent=state.level;
  $('#catches').textContent=state.catches;
  $('#combo').textContent='x'+comboMultiplier();
  $('#rare').textContent=state.rare;
  $('#cores').textContent=state.cores;
  $('#weapon').textContent=weapon.name;
  $('#ammo').textContent=(activePower?.id==='infinite'?'∞':state.ammo)+' / '+maxAmmo();
  $('#mapName').textContent=map.name;
  $('#mapSubtitle').textContent=map.subtitle||'';
  $('#mapBonus').textContent='x'+map.bonus.toFixed(1)+(lockOn?' · LOCK':'');
  if($('#cannonPower'))$('#cannonPower').textContent=state.level;
  if($('#superCharge'))$('#superCharge').textContent=Math.min(100,Math.round(state.superCharge))+'%';
  if($('#superText'))$('#superText').textContent=Math.min(100,Math.round(state.superCharge))+' / 100';
  if($('#superBar'))$('#superBar').style.width=Math.min(100,state.superCharge)+'%';
  $('#xpbar').style.width=((state.xp%500)/5)+'%';
  $('#xpText').textContent=(state.xp%500)+' / 500';
  $('#mapProgress').style.width=(Math.min(1,state.mapCatches/map.progress)*100)+'%';
  $('#mapProgressText').textContent=state.mapCatches+' / '+map.progress;

  const p=$('#powerup');
  if(activePower){
    p.textContent=activePower.label+' '+Math.max(0,Math.ceil((powerUntil-performance.now())/1000))+'s';
    p.classList.add('active');
  }else{
    p.textContent='NO POWER-UP';
    p.classList.remove('active');
  }

  if(boss){
    const pct=Math.max(0,boss.userData.hp/boss.userData.maxhp);
    $('#bossHud').classList.add('show');
    $('#bossName').textContent=boss.userData.bossName;
    $('#bossHpText').textContent=Math.ceil(pct*100)+'%';
    $('#bossHp').style.width=(pct*100)+'%';
  }else{
    $('#bossHud').classList.remove('show');
  }
}

function showAchievement(a){
  const box=$('#achievement');
  $('#achievementName').textContent=a.name;
  $('#achievementReward').textContent='+'+a.reward+' CORE'+(a.reward===1?'':'S');
  box.classList.add('show');
  sfx.achievement();
  clearTimeout(showAchievement.t);
  showAchievement.t=setTimeout(()=>box.classList.remove('show'),2200);
}
function achievementValue(a){
  if(a.type==='comboMultiplier')return comboMultiplier();
  if(a.type==='worldsVisited')return state.worldsVisited.length;
  return Number(state[a.type]||0);
}
function checkAchievements(){
  for(const a of ACHIEVEMENTS){
    if(state.achievements[a.id])continue;
    if(achievementValue(a)>=a.target){
      state.achievements[a.id]=Date.now();
      state.cores+=a.reward;
      showAchievement(a);
      telemetryEvent('achievement_unlock',a.id);
    }
  }
  save();
}

function renderArmory(){
  $('#armoryCores').textContent=state.cores;
  $('#armoryLevel').textContent=state.level;

  $('#weaponGrid').innerHTML=WEAPONS.map(w=>{
    const unlocked=state.level>=w.unlockLevel;
    const selected=state.weaponId===w.id;
    return '<article class="armory-card '+(selected?'selected ':'')+(!unlocked?'locked':'')+'">'+
      '<h4>'+w.name+'</h4>'+
      '<p>'+w.description+'</p>'+
      '<footer><span>'+(!unlocked?'LEVEL '+w.unlockLevel:'DMG '+w.damage+' · COST '+w.ammoCost)+'</span>'+
      '<button data-select-weapon="'+w.id+'" '+(!unlocked?'disabled':'')+'>'+(selected?'EQUIPPED':'EQUIP')+'</button></footer>'+
    '</article>';
  }).join('');

  $('#upgradeGrid').innerHTML=UPGRADES.map(u=>{
    const rank=Number(state.upgrades[u.id]||0);
    const maxed=rank>=u.max;
    const cost=u.baseCost*(rank+1);
    return '<article class="armory-card '+(maxed?'selected':'')+'">'+
      '<h4>'+u.name+' · '+rank+'/'+u.max+'</h4>'+
      '<p>'+u.description+'</p>'+
      '<footer><span>'+(maxed?'MAXED':'COST '+cost+' CORES')+'</span>'+
      '<button data-buy-upgrade="'+u.id+'" '+(maxed||state.cores<cost?'disabled':'')+'>'+(maxed?'MAX':'UPGRADE')+'</button></footer>'+
    '</article>';
  }).join('');

  $('#achievementGrid').innerHTML=ACHIEVEMENTS.map(a=>{
    const done=Boolean(state.achievements[a.id]);
    return '<article class="achievement-item '+(done?'done':'')+'"><b>'+(done?'✓ ':'')+a.name+'</b><span>'+a.description+' · +'+a.reward+' cores</span></article>';
  }).join('');
}
async function loadCompliance(){
  try{
    const res=await fetch('/api/compliance',{cache:'no-store'});
    if(!res.ok)throw new Error('compliance unavailable');
    complianceState=await res.json();
  }catch{
    complianceState={goldModeEnabled:true,sweepstakesEnabled:false,paymentsEnabled:false,redemptionEnabled:false,freeEntryEnabled:false,currentJurisdictionStatus:'NOT_CLEARED',notice:'Sweepstakes mode unavailable.'};
  }
  renderEconomyStatus();
}
function sweepsAvailable(){
  const s=complianceState||{};
  return Boolean(s.sweepstakesEnabled&&s.freeEntryEnabled&&s.currentJurisdictionStatus==='CLEARED');
}
function renderEconomyStatus(){
  const s=complianceState||{};
  const live=sweepsAvailable();
  $('#goldModeButton')?.classList.toggle('active',playMode==='gold');
  $('#sweepsModeButton')?.classList.toggle('sweeps-live',playMode==='sweeps'&&live);
  if($('#sweepsModeButton'))$('#sweepsModeButton').textContent=live?'SWEEPS':'SWEEPS 🔒';
  if($('#modeNotice'))$('#modeNotice').textContent=playMode==='gold'
    ?'Gold Mode · entertainment credits only · no cash value'
    :(live?'Sweepstakes Mode · promotional credits · jurisdiction rules apply':'Sweepstakes Mode locked · compliance clearance required');
  if($('#goldBalancePreview'))$('#goldBalancePreview').textContent='20,000';
  if($('#sweepsBalancePreview'))$('#sweepsBalancePreview').textContent='0.00';
  const set=(id,on,onText='ON',offText='OFF')=>{const el=$(id);if(!el)return;el.textContent=on?onText:offText;el.classList.toggle('on',Boolean(on));};
  set('#freeEntryStatus',s.freeEntryEnabled);
  set('#paymentsStatus',s.paymentsEnabled);
  set('#redemptionStatus',s.redemptionEnabled);
  if($('#ageGateStatus')){$('#ageGateStatus').textContent=(s.minAge||21)+'+';$('#ageGateStatus').classList.add('on');}
  if($('#geoStatus'))$('#geoStatus').textContent=s.geofenceRequired?'REQUIRED':'OFF';
  if($('#kycStatus'))$('#kycStatus').textContent=s.kycRequired?'REQUIRED':'OFF';
  if($('#economyNotice'))$('#economyNotice').textContent=s.notice||'Compliance-gated economy.';
}
function selectPlayMode(mode){
  if(mode==='gold'){
    playMode='gold';renderEconomyStatus();toast('GOLD MODE','#ffd34a',700);telemetryEvent('mode_select','gold');return;
  }
  if(!sweepsAvailable()){
    playMode='gold';renderEconomyStatus();openEconomy();toast('SWEEPSTAKES MODE LOCKED','#ff8f8f',1000);telemetryEvent('mode_blocked','sweeps');return;
  }
  playMode='sweeps';renderEconomyStatus();toast('SWEEPSTAKES MODE','#63ff9c',700);telemetryEvent('mode_select','sweeps');
}
function openEconomy(){economyOpen=true;renderEconomyStatus();$('#economyPanel').hidden=false;telemetryEvent('economy_open',playMode);}
function closeEconomy(){economyOpen=false;$('#economyPanel').hidden=true;}

function supportMessage(){
  return [
    'Hi, I need Fish Table Overdrive support.',
    'Session: '+telemetrySession,
    'Demo balance: '+money(state.balanceCents),
    'Bullet value: '+money(shotCents()),
    'Weapon: '+currentWeapon().name,
    'Level: '+state.level,
    'Map: '+currentMap().name
  ].join('\n');
}
function renderSupport(){
  const preview=$('#supportMessagePreview');
  if(preview)preview.textContent=supportMessage();
}
function openSupport(){
  supportOpen=true;
  renderSupport();
  $('#supportPanel').hidden=false;
  telemetryEvent('support_open',SUPPORT_PHONE_DISPLAY);
  if(renderer.xr.isPresenting){
    showStatusHologram('SUPPORT '+SUPPORT_PHONE_DISPLAY,'#78ff9b','EXIT VR TO TEXT / CALL');
  }
}
function closeSupport(){
  supportOpen=false;
  $('#supportPanel').hidden=true;
}
async function copySupportNumber(){
  try{
    await navigator.clipboard.writeText(SUPPORT_PHONE_DISPLAY);
    toast('SUPPORT NUMBER COPIED','#78ff9b',900);
  }catch{
    toast(SUPPORT_PHONE_DISPLAY,'#78ff9b',1400);
  }
  telemetryEvent('support_copy',SUPPORT_PHONE_DISPLAY);
}
function textSupport(){
  telemetryEvent('support_text',SUPPORT_PHONE_DISPLAY);
  window.location.href='sms:'+SUPPORT_PHONE_E164+'?body='+encodeURIComponent(supportMessage());
}
function callSupport(){
  telemetryEvent('support_call',SUPPORT_PHONE_DISPLAY);
  window.location.href='tel:'+SUPPORT_PHONE_E164;
}

function openArmory(){
  armoryOpen=true;
  renderArmory();
  $('#armory').hidden=false;
}
function closeArmory(){
  armoryOpen=false;
  $('#armory').hidden=true;
}
function buyUpgrade(id){
  const u=UPGRADES.find(x=>x.id===id);
  if(!u)return;
  const rank=Number(state.upgrades[id]||0);
  const cost=u.baseCost*(rank+1);
  if(rank>=u.max||state.cores<cost)return;
  state.cores-=cost;
  state.upgrades[id]=rank+1;
  state.ammo=Math.min(maxAmmo(),state.ammo+(id==='magazine'?3:0));
  sfx.purchase();
  toast(u.name+' '+(rank+1),'#ffd34a');
  telemetryEvent('upgrade_buy',id+':'+(rank+1));
  save();hud();renderArmory();
}
function selectWeapon(id){
  const w=WEAPONS.find(x=>x.id===id);
  if(!w||state.level<w.unlockLevel)return;
  state.weaponId=id;
  sfx.purchase();
  toast(w.name,'#ffd978');
  telemetryEvent('weapon_select',id);
  save();hud();renderArmory();
}
function showWeaponHologram(){
  if(weaponHologram){scene.remove(weaponHologram);weaponHologram=null}
  clearTimeout(weaponHologramTimer);
  const unlocked=WEAPONS.filter(w=>state.level>=w.unlockLevel);
  const group=new THREE.Group();
  const selected=currentWeapon();
  const cam=renderer.xr.isPresenting?renderer.xr.getCamera(camera):camera;
  const pos=new THREE.Vector3(),quat=new THREE.Quaternion(),dir=new THREE.Vector3(0,0,-1);
  cam.getWorldPosition(pos);cam.getWorldQuaternion(quat);dir.applyQuaternion(quat);
  group.position.copy(pos).addScaledVector(dir,1.45);
  group.quaternion.copy(quat);
  unlocked.forEach((w,i)=>{
    const active=w.id===selected.id;
    const label=makeHologramLabel((active?'▶ ':'')+w.name,active?'#ffd34a':'#79f8ff',active?'RIGHT GRIP: NEXT WEAPON':'LEVEL '+w.unlockLevel);
    label.position.set(0,(unlocked.length-1-i)*.28-(unlocked.length-1)*.14,0);
    label.scale.multiplyScalar(active?1.18:.86);
    group.add(label);
  });
  scene.add(group);
  weaponHologram=group;
  weaponHologramTimer=setTimeout(()=>{if(weaponHologram===group){scene.remove(group);weaponHologram=null}},1800);
}
function showStatusHologram(text,color='#79f8ff',small=''){
  const cam=renderer.xr.isPresenting?renderer.xr.getCamera(camera):camera;
  const pos=new THREE.Vector3(),quat=new THREE.Quaternion(),dir=new THREE.Vector3(0,0,-1);
  cam.getWorldPosition(pos);cam.getWorldQuaternion(quat);dir.applyQuaternion(quat);
  const label=makeHologramLabel(text,color,small);
  label.position.copy(pos).addScaledVector(dir,1.25);
  label.quaternion.copy(quat);
  label.scale.multiplyScalar(1.18);
  scene.add(label);
  setTimeout(()=>scene.remove(label),950);
}
function makeVRHudRow(text,color,small,y,scale=1){
  const row=makeHologramLabel(text,color,small);
  row.position.set(0,y,0);
  row.scale.set(2.35*scale,.38*scale,1);
  return row;
}
function rebuildVRStatus(){
  const pl=state.balanceCents-state.sessionStartCents;
  const mode=playMode==='sweeps'?'SWEEPS':'GOLD';
  const bossText=boss
    ? boss.userData.bossName+' '+Math.max(0,Math.ceil((boss.userData.hp/boss.userData.maxhp)*100))+'%'
    : 'NO BOSS';
  const signature=[
    state.balanceCents,pl,state.score,state.level,state.combo,state.ammo,shotCents(),state.weaponId,
    state.mapIndex,Math.round(state.superCharge),lockOn,mode,bossText,activePower?.id||'',musicStatus
  ].join('|');
  if(signature===vrStatusLast&&vrStatusPanel)return;
  vrStatusLast=signature;
  if(vrStatusPanel)scene.remove(vrStatusPanel);

  const group=new THREE.Group();
  group.add(makeVRHudRow(
    'BAL '+money(state.balanceCents)+'   P/L '+(pl>=0?'+':'')+money(pl),
    pl>=0?'#78ff9b':'#ff8585',
    mode+' MODE · MUSIC '+musicStatus,
    .48,1.05
  ));
  group.add(makeVRHudRow(
    'SCORE '+state.score.toLocaleString()+'   COMBO x'+comboMultiplier()+'   LV '+state.level,
    '#79f8ff',
    currentMap().name,
    .16,.94
  ));
  group.add(makeVRHudRow(
    'BULLET '+money(shotCents())+'   AMMO '+(activePower?.id==='infinite'?'∞':state.ammo)+'/'+maxAmmo(),
    '#ffd34a',
    currentWeapon().name,
    -.16,.98
  ));
  group.add(makeVRHudRow(
    'SUPER '+Math.round(state.superCharge)+'%   '+(lockOn?'LOCK ON':'FREE AIM'),
    state.superCharge>=100?'#d59bff':'#9bb3c4',
    bossText,
    -.48,.88
  ));
  scene.add(group);
  vrStatusPanel=group;
}
function updateVRStatus(){
  if(!renderer.xr.isPresenting){
    if(vrStatusPanel){scene.remove(vrStatusPanel);vrStatusPanel=null}
    vrStatusLast='';
    return;
  }
  rebuildVRStatus();

  const cam=renderer.xr.getCamera(camera);
  cam.getWorldPosition(vrTmpPos);
  cam.getWorldQuaternion(vrTmpQuat);
  vrTmpDir.set(0,0,-1).applyQuaternion(vrTmpQuat);
  vrTmpDown.set(0,-.66,0).applyQuaternion(vrTmpQuat);
  vrStatusPanel.position.copy(vrTmpPos).addScaledVector(vrTmpDir,1.75).add(vrTmpDown);
  vrStatusPanel.quaternion.copy(vrTmpQuat);
}
function cycleWeapon(step=1,controller=null){
  const unlocked=WEAPONS.filter(w=>state.level>=w.unlockLevel);
  const i=unlocked.findIndex(w=>w.id===state.weaponId);
  state.weaponId=unlocked[(i+step+unlocked.length)%unlocked.length].id;
  sfx.purchase();haptic(controller,.22,35);toast(currentWeapon().name,'#ffd978');showStatusHologram(currentWeapon().name,'#ffd978','BULLET '+money(shotCents()));save();hud();showWeaponHologram();
}
function toggleLockOn(controller=null){
  lockOn=!lockOn;
  haptic(controller,.3,45);
  toast(lockOn?'LOCK-ON ENABLED':'LOCK-ON OFF',lockOn?'#ffdf65':'#8da7b5',900);
  telemetryEvent('lock_on_toggle',lockOn?'on':'off');
  hud();
}

function disposeGroup(group){
  group?.traverse(o=>{
    o.geometry?.dispose?.();
    if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.()); else o.material?.dispose?.();
  });
}
function clearMapGroup(){
  if(mapGroup){scene.remove(mapGroup);disposeGroup(mapGroup)}
  mapGroup=new THREE.Group();
  scene.add(mapGroup);
  ambient=[];
}
function makeStarField(group,count=170,color=0xd6e7ff){
  const geo=new THREE.BufferGeometry(),pts=[];
  for(let i=0;i<count;i++)pts.push((Math.random()-.5)*65,Math.random()*28-6,-Math.random()*75);
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  group.add(new THREE.Points(geo,new THREE.PointsMaterial({color,size:.065,sizeAttenuation:true})));
}
function makeBubbleField(group,count=55,color=0x71ff6a){
  const geo=new THREE.BufferGeometry(),pts=[];
  for(let i=0;i<count;i++)pts.push((Math.random()-.5)*25,Math.random()*10-3,-Math.random()*55);
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const points=new THREE.Points(geo,new THREE.PointsMaterial({color,size:.10,transparent:true,opacity:.55,sizeAttenuation:true}));
  points.userData.floatField=true;
  group.add(points);ambient.push(points);
}
function buildMap(){
  clearMapGroup();
  const map=currentMap();
  ensureVisited(map.id);
  setTrapWorld(map.id);

  renderer.setClearColor(map.clear);
  scene.fog=new THREE.FogExp2(map.fog,map.fogDensity);
  hemi.color.setHex(map.id==='lava'?0xff6b3d:map.id==='space'?0x8aa8ff:map.id==='toxic'?0xb4ff3c:0x7deaff);
  hemi.groundColor.setHex(map.id==='lava'?0x220000:map.id==='space'?0x03030f:map.id==='toxic'?0x071000:0x001018);
  keyLight.color.setHex(map.id==='lava'?0xffba75:map.id==='space'?0xaac8ff:map.id==='toxic'?0xcaff77:0xb5ffff);

  const floor=new THREE.Mesh(
    new THREE.PlaneGeometry(60,88,3,3),
    new THREE.MeshLambertMaterial({color:map.floor,emissive:map.id==='lava'?0x220300:map.id==='toxic'?0x071800:0x000000,emissiveIntensity:.35})
  );
  floor.rotation.x=-Math.PI/2;
  floor.position.set(0,-2.3,-25);
  mapGroup.add(floor);

  for(let i=0;i<22;i++){
    const geo=map.id==='space'?new THREE.IcosahedronGeometry(.3+Math.random()*.65,0):new THREE.DodecahedronGeometry(.3+Math.random()*.75,0);
    const r=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:map.rock,emissive:map.id==='lava'?0x180300:map.id==='toxic'?0x071600:0x000000,emissiveIntensity:.28}));
    r.scale.y=.5+Math.random()*1.7;
    r.position.set((Math.random()-.5)*22,-2+Math.random()*.25,-3-Math.random()*44);
    r.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);
    mapGroup.add(r);
  }

  if(map.id==='reef'){
    const colors=[0xff48c8,0x19dfff,0x62ff83,0xffcf40];
    for(let i=0;i<14;i++){
      const coral=new THREE.Group();
      const mat=new THREE.MeshLambertMaterial({color:colors[i%4],emissive:colors[i%4],emissiveIntensity:.14});
      for(let b=0;b<3;b++){
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.08,.65+Math.random()*.55,5),mat);
        stem.position.set((b-1)*.12,.4+Math.random()*.2,0);
        stem.rotation.z=(Math.random()-.5)*.35;
        coral.add(stem);
      }
      coral.position.set((Math.random()-.5)*18,-2.25,-3-Math.random()*34);
      mapGroup.add(coral);
    }
  }else if(map.id==='lava'){
    for(let i=0;i<12;i++){
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.18,.9,6),new THREE.MeshLambertMaterial({color:0x401005,emissive:0xff2600,emissiveIntensity:.7}));
      cone.position.set((Math.random()-.5)*16,-1.9,-4-Math.random()*35);
      mapGroup.add(cone);
    }
  }else if(map.id==='space'){
    makeStarField(mapGroup,210);
    for(let i=0;i<6;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.8+Math.random()*1.2,.035,5,24),new THREE.MeshBasicMaterial({color:[0x8a55ff,0x00e5ff,0xff48c8][i%3]}));
      ring.position.set((Math.random()-.5)*15,Math.random()*7-1,-8-Math.random()*34);
      ring.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
      ring.userData.spin=.15+Math.random()*.25;
      mapGroup.add(ring);ambient.push(ring);
    }
  }else if(map.id==='ice'){
    makeStarField(mapGroup,90,0xbcefff);
    for(let i=0;i<16;i++){
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.25+Math.random()*.5,0),new THREE.MeshLambertMaterial({color:0xa9efff,emissive:0x16455c,emissiveIntensity:.5}));
      crystal.scale.y=1.8+Math.random()*2.5;
      crystal.position.set((Math.random()-.5)*18,-1.8,-4-Math.random()*38);
      crystal.rotation.z=(Math.random()-.5)*.35;
      mapGroup.add(crystal);
    }
  }else if(map.id==='toxic'){
    makeBubbleField(mapGroup,70,0xb4ff3c);
    for(let i=0;i<11;i++){
      const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,2.3+Math.random()*2,8),new THREE.MeshLambertMaterial({color:0x29401a,emissive:0x0b2004,emissiveIntensity:.45}));
      pipe.position.set((Math.random()-.5)*18,-.5,-4-Math.random()*38);
      pipe.rotation.z=Math.PI/2;
      mapGroup.add(pipe);
    }
  }

  sfx.map();
  telemetryEvent('map_enter',map.id);
  checkAchievements();
}
function changeMap(index=null,manual=false){
  mapTransitioning=false;
  state.mapIndex=index==null?(state.mapIndex+1)%WORLD_MAPS.length:index%WORLD_MAPS.length;
  state.mapCatches=0;
  buildMap();

  fish.slice().forEach(f=>scene.remove(f));
  fish=[];
  boss=null;
  bossClock=30;
  spawnPopulation();
  save();hud();

  const map=currentMap();
  toast(map.name+' · BONUS x'+map.bonus.toFixed(1),map.id==='lava'?'#ff7a38':map.id==='space'?'#b68cff':map.id==='toxic'?'#b4ff3c':'#79f8ff',1100);
  if(manual)telemetryEvent('map_manual_change',map.id);
}

const geo={
  body:new THREE.SphereGeometry(.33,12,8),
  bodyRound:new THREE.SphereGeometry(.38,12,9),
  tail:new THREE.ConeGeometry(.26,.52,4),
  fin:new THREE.ConeGeometry(.12,.28,3),
  eye:new THREE.SphereGeometry(.038,6,5),
  ray:new THREE.OctahedronGeometry(.42,0),
  eel:new THREE.SphereGeometry(.22,10,7),
  lure:new THREE.SphereGeometry(.055,6,5),
  bossBody:new THREE.SphereGeometry(.55,14,10)
};

function specialRoll(){
  const x=Math.random()/rareChanceMultiplier();
  let acc=0;
  for(const s of SPECIALS){acc+=s.chance;if(x<acc)return s}
  return null;
}
function materialFor(color,special,bossFish=false){
  return new THREE.MeshLambertMaterial({
    color,
    emissive:special?color:(bossFish?0x260000:0x000000),
    emissiveIntensity:special?.18:(bossFish?.20:.04)
  });
}
function addEyes(group,bossFish=false){
  const white=new THREE.MeshBasicMaterial({color:bossFish?0xffef70:0xffffff});
  const black=new THREE.MeshBasicMaterial({color:0x030305});
  for(const z of [-1,1]){
    const eye=new THREE.Mesh(geo.eye,white);
    eye.position.set(bossFish?.72:.29,bossFish?.28:.13,z*(bossFish?.46:.21));
    eye.scale.setScalar(bossFish?2.2:1);
    group.add(eye);
    const pupil=new THREE.Mesh(geo.eye,black);
    pupil.scale.setScalar(bossFish?.85:.45);
    pupil.position.set(eye.position.x+.026,eye.position.y,eye.position.z);
    group.add(pupil);
  }
}
function addStandardFish(group,mat,scale=1){
  const body=new THREE.Mesh(geo.body,mat);
  body.scale.set(1.7*scale,.82*scale,.58*scale);
  group.add(body);

  const tail=new THREE.Mesh(geo.tail,mat);
  tail.rotation.z=Math.PI/2;
  tail.position.x=-.64*scale;
  tail.scale.setScalar(scale);
  group.add(tail);

  const finMat=mat.clone();finMat.color.offsetHSL(.04,.08,.08);
  for(const side of [-1,1]){
    const fin=new THREE.Mesh(geo.fin,finMat);
    fin.rotation.z=side*Math.PI/2;
    fin.position.set(.02,side*.22*scale,0);
    fin.scale.setScalar(scale);
    group.add(fin);
  }
  addEyes(group,false);
}
function addSpeciesModel(group,species,mat){
  if(species.shape==='round'){
    const body=new THREE.Mesh(geo.bodyRound,mat);body.scale.set(1.25,1.05,.9);group.add(body);
    const tail=new THREE.Mesh(geo.tail,mat);tail.rotation.z=Math.PI/2;tail.position.x=-.48;tail.scale.setScalar(.85);group.add(tail);
    for(let i=0;i<8;i++){
      const spike=new THREE.Mesh(new THREE.ConeGeometry(.025,.14,3),mat);
      const a=i/8*Math.PI*2;spike.position.set(Math.cos(a)*.25,Math.sin(a)*.25,0);spike.rotation.z=-a+Math.PI/2;group.add(spike);
    }
    addEyes(group,false);
    return;
  }

  if(species.shape==='ray'){
    const body=new THREE.Mesh(geo.ray,mat);body.scale.set(1.5,.25,1.05);group.add(body);
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.02,.035,.9,5),mat);tail.rotation.z=Math.PI/2;tail.position.x=-.72;group.add(tail);
    addEyes(group,false);
    return;
  }

  if(species.shape==='eel'){
    for(let i=0;i<4;i++){
      const seg=new THREE.Mesh(geo.eel,mat);
      seg.scale.set(1.1-i*.09,.65,.62);
      seg.position.x=-i*.31;
      group.add(seg);
    }
    const tail=new THREE.Mesh(geo.tail,mat);tail.rotation.z=Math.PI/2;tail.position.x=-1.12;tail.scale.setScalar(.65);group.add(tail);
    addEyes(group,false);
    return;
  }

  addStandardFish(group,mat,1);
  if(species.shape==='angler'){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.38,4),mat);
    stem.rotation.z=-.65;stem.position.set(.18,.28,0);group.add(stem);
    const lure=new THREE.Mesh(geo.lure,new THREE.MeshBasicMaterial({color:0xffffb0}));
    lure.position.set(.33,.42,0);group.add(lure);
  }
}
function addBossModel(group,bossDef,mat){
  if(bossDef.shape==='ray'){
    const b=new THREE.Mesh(new THREE.OctahedronGeometry(.9,0),mat);b.scale.set(2.6,.5,1.8);group.add(b);
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.045,.08,2.2,6),mat);tail.rotation.z=Math.PI/2;tail.position.x=-1.8;group.add(tail);
  }else if(bossDef.shape==='eel'){
    for(let i=0;i<7;i++){
      const seg=new THREE.Mesh(geo.bossBody,mat);seg.scale.set(1.15-i*.04,.72,.7);seg.position.x=-i*.58;group.add(seg);
    }
  }else if(bossDef.shape==='shark'){
    addStandardFish(group,mat,2.7);
    const dorsal=new THREE.Mesh(new THREE.ConeGeometry(.32,.9,3),mat);dorsal.position.set(-.1,.95,0);group.add(dorsal);
  }else{
    addStandardFish(group,mat,3.0);
  }
  addEyes(group,true);
}
function spawnFish(spec={}){
  const map=currentMap();
  const bossDef=spec.boss?(spec.bossDef||BOSSES[map.boss]):null;
  const species=bossDef?null:(spec.species||SPECIES[map.species[Math.floor(Math.random()*map.species.length)]]);
  const special=bossDef?null:(spec.special||specialRoll());
  const color=spec.color??special?.color??bossDef?.color??map.palette[Math.floor(Math.random()*map.palette.length)];
  const value=bossDef?.value??special?.value??species.value;
  const multiplier=bossDef?.multiplier??special?.multiplier??species.multiplier??2;

  const g=createArcadeFishVisual({
    speciesId:species?.id||'dart',
    bossId:bossDef?.id||null,
    color,
    specialId:special?.id||'',
    value,
    multiplier,
    size:bossDef?1:(species?.size||1),
    hp:bossDef?.hp??species?.hp??1,
    bossName:bossDef?.name||''
  });

  const dir=Math.random()>.5?1:-1;
  g.position.set((Math.random()-.5)*12,bossDef?.4:-1+Math.random()*5.6,bossDef?-15:-4-Math.random()*30);
  flipArcadeFish(g,dir);

  const hp=bossDef?bossDef.hp:Math.max(1,Math.round(species.hp*(1+Math.max(0,state.level-1)*.035)));
  g.userData={
    ...g.userData,
    fish:1,boss:Boolean(bossDef),bossId:bossDef?.id||null,bossName:bossDef?.name||null,bossMotion:bossDef?.motion||null,
    special:special?.id||null,specialData:special||null,speciesId:species?.id||null,speciesName:species?.name||null,
    motion:species?.motion||'glide',hp,maxhp:hp,value,points:bossDef?.value??species?.points??value,multiplier,coreReward:bossDef?.coreReward??special?.coreReward??0,
    wagerCents:0,lastShotCents:shotCents(),damageByStake:Object.create(null),
    v:bossDef?.26:(.32*species.speed+Math.random()*.36),dir,phase:Math.random()*Math.PI*2,charge:0
  };

  scene.add(g);fish.push(g);
  if(bossDef){boss=g;sfx.boss();telemetryEvent('boss_spawn',bossDef.id)}
  return g;
}
function spawnPopulation(){
  const count=renderer.xr.isPresenting?14:21;
  for(let i=0;i<count;i++)spawnFish();
}

const ray=new THREE.Raycaster();

function spark(position,color,count=7){
  for(let i=0;i<count;i++){
    const p=new THREE.Mesh(new THREE.SphereGeometry(.023+Math.random()*.025,4,4),new THREE.MeshBasicMaterial({color}));
    p.position.copy(position);
    p.userData={vel:new THREE.Vector3((Math.random()-.5)*1.45,(Math.random()-.5)*1.45,(Math.random()-.5)*1.45),life:.32+Math.random()*.25};
    scene.add(p);particles.push(p);if(particles.length>70){const old=particles.shift();scene.remove(old);}
  }
}
function bolt(origin,direction,color=currentWeapon().color,size=.04){
  const m=new THREE.Mesh(new THREE.SphereGeometry(size,5,4),new THREE.MeshBasicMaterial({color}));
  m.position.copy(origin);m.userData={d:direction.clone(),life:.42};
  scene.add(m);bolts.push(m);
}
function activatePower(id){
  const powers={
    double:{id:'double',label:'DOUBLE SCORE',duration:12000,color:'#ffd447'},
    infinite:{id:'infinite',label:'INFINITE AMMO',duration:10000,color:'#7fffff'},
    rapid:{id:'rapid',label:'RAPID FIRE',duration:9000,color:'#ff57d8'},
    slow:{id:'slow',label:'TIME WARP',duration:9000,color:'#8bff8e'}
  };
  const p=powers[id];if(!p)return;
  activePower=p;powerUntil=performance.now()+p.duration;
  sfx.power();toast(p.label+'!',p.color,1000);telemetryEvent('powerup_start',id);hud();
}
function reload(){
  if(reloading||state.ammo>=maxAmmo()||activePower?.id==='infinite')return;
  reloading=true;$('#reloadButton').textContent='RELOADING…';sfx.reload();
  setTimeout(()=>{
    state.ammo=maxAmmo();reloading=false;$('#reloadButton').textContent='RELOAD';
    save();hud();telemetryEvent('reload');
  },620);
}

function findFishGroup(obj){
  let f=obj;
  while(f?.parent&&!f.userData?.fish)f=f.parent;
  return f?.userData?.fish?f:null;
}
function removeFish(f){
  scene.remove(f);
  const idx=fish.indexOf(f);
  if(idx>=0)fish.splice(idx,1);
}
function registerCatch(f){
  const map=currentMap();
  const stakeEntries=Object.entries(f.userData.damageByStake||{}).map(([stake,damage])=>({stake:Number(stake),damage:Number(damage)})).filter(x=>x.stake>0&&x.damage>0);
  const totalDamage=stakeEntries.reduce((sum,x)=>sum+x.damage,0)||1;
  const weightedShotCents=Math.max(1,Math.round(stakeEntries.reduce((sum,x)=>sum+(x.stake*x.damage),0)/totalDamage)||f.userData.lastShotCents||shotCents());
  const payoutBase=Math.round(weightedShotCents*Number(f.userData.multiplier||2));
  const payoutCents=Math.max(0,Math.round(payoutBase*map.bonus*scorePowerMultiplier()*scoreUpgradeMultiplier()));
  const basePoints=Math.max(1,Number(f.userData.points||f.userData.value||10));
  const award=Math.round(basePoints*comboMultiplier()*map.bonus);

  state.balanceCents+=payoutCents;
  state.totalWonCents+=payoutCents;
  showStatusHologram('WIN '+money(payoutCents),'#ffd34a','×'+Number(f.userData.multiplier||2)+' · BAL '+money(state.balanceCents));
  state.score+=award;
  state.xp+=f.userData.boss?600:f.userData.special?150:Math.min(100,Math.round(f.userData.value*.75));
  state.catches++;
  state.combo++;
  state.bestCombo=Math.max(state.bestCombo,state.combo);
  state.mapCatches++;
  state.cores+=Number(f.userData.coreReward||0);

  if(f.userData.special){
    state.rare++;
    sfx.rare();
    toast(f.userData.specialData.label+' +'+money(payoutCents),'#ffdf65',1000);
    activatePower(f.userData.specialData.power);
    telemetryEvent('rare_fish',f.userData.special);
  }else if(f.userData.boss){
    state.bossKills++;
    sfx.bossDown();
    toast(f.userData.bossName+' DOWN +'+money(payoutCents),'#ffcf40',1200);
    telemetryEvent('boss_caught',f.userData.bossId+':'+award);
  }else{
    sfx.catchFish();
    toast((f.userData.speciesName||'CATCH')+' +'+money(payoutCents),'#79f8ff');
    if(state.catches<=3||state.catches%5===0)telemetryEvent('fish_caught',String(award));
  }

  if(f.userData.boss){
    boss=null;bossClock=44;setEvent('',undefined,false);
  }

  spark(f.position.clone(),f.userData.specialData?.color||currentMap().accent,f.userData.boss?25:10);
  removeFish(f);
  if(!f.userData.boss)setTimeout(()=>spawnFish(),180);

  if(state.mapCatches>=map.progress&&!mapTransitioning){
    mapTransitioning=true;
    state.totalWorldClears++;
    const next=(state.mapIndex+1)%WORLD_MAPS.length;
    toast('WORLD CLEARED!','#ffffff',900);
    setTimeout(()=>changeMap(next),550);
  }

  save();hud();checkAchievements();
}

function applyHit(f,point,damage,controller,stake=shotCents()){
  if(!f||f.userData.hp<=0)return false;
  const actualDamage=damage*damageMultiplier();
  f.userData.hp-=actualDamage;
  updateArcadeFishHealth(f,Math.max(0,f.userData.hp/f.userData.maxhp));
  f.userData.wagerCents=(f.userData.wagerCents||0)+stake;
  f.userData.lastShotCents=stake;
  f.userData.damageByStake=f.userData.damageByStake||Object.create(null);
  f.userData.damageByStake[stake]=(f.userData.damageByStake[stake]||0)+actualDamage;
  if(stake>0)state.superCharge=Math.min(100,state.superCharge+(f.userData.boss?4:1.5));
  spark(point||f.position,currentWeapon().color,f.userData.boss?7:3);
  sfx.hit();
  haptic(controller,f.userData.boss?.7:.3,f.userData.boss?65:26);
  if(f.userData.hp<=0){registerCatch(f);return true}
  hud();return false;
}
function randomSpread(direction,spread){
  if(!spread)return direction.clone();
  const d=direction.clone();
  d.x+=(Math.random()-.5)*spread;
  d.y+=(Math.random()-.5)*spread;
  d.z+=(Math.random()-.5)*spread*.35;
  return d.normalize();
}
function nearestFish(origin,exclude,radius=3.4){
  let best=null,bestD=radius;
  for(const f of fish){
    if(f===exclude||f.userData.hp<=0)continue;
    const d=f.position.distanceTo(origin);
    if(d<bestD){best=f;bestD=d}
  }
  return best;
}
function assistedDirection(origin,direction){
  if(!lockOn)return direction;
  let best=null,bestScore=.82;
  const n=direction.clone().normalize();
  for(const f of fish){
    if(f.userData.hp<=0)continue;
    const to=f.position.clone().sub(origin);
    const dist=to.length();
    if(dist>34)continue;
    to.normalize();
    const dot=n.dot(to);
    const score=dot-(dist*.0025);
    if(score>bestScore){bestScore=score;best=to}
  }
  return best||direction;
}

function firePellet(origin,direction,weapon,controller,stake){
  const d=randomSpread(assistedDirection(origin,direction),weapon.spread);
  bolt(origin,d,weapon.color,weapon.id==='rail'?.055:.038);
  ray.set(origin,d);
  const hits=ray.intersectObjects(fish,true);
  const seen=new Set();
  let pierced=0;

  for(const hit of hits){
    const f=findFishGroup(hit.object);
    if(!f||seen.has(f))continue;
    seen.add(f);
    applyHit(f,hit.point,weapon.damage*(activePower?.id==='rapid'?1.35:1),controller,stake);
    pierced++;
    if(weapon.chain){
      let src=f;
      for(let i=0;i<weapon.chain;i++){
        const next=nearestFish(src.position,src,3.2);
        if(!next)break;
        spark(next.position,0x8bff8e,6);
        applyHit(next,next.position,weapon.damage*.7,controller,stake);
        src=next;
      }
    }
    if(!weapon.pierce||pierced>=weapon.pierce)break;
  }
  return seen.size>0;
}
function fire(origin,direction,controller){
  if(!playActive||armoryOpen||supportOpen||economyOpen)return;
  updatePower();

  const weapon=currentWeapon();
  const now=performance.now();
  const cooldown=activePower?.id==='rapid'?Math.max(70,weapon.cooldown*.48):weapon.cooldown;
  const last=controllerShots.get(controller||canvas)||0;
  if(now-last<cooldown)return;
  controllerShots.set(controller||canvas,now);

  const stake=shotCents();
  if(state.balanceCents<stake){
    sfx.empty();toast('OUT OF DEMO CREDITS','#ff7b7b',1100);
    showStatusHologram('OUT OF CREDITS','#ff7b7b','RESET $20 DEMO IN ARMORY');
    haptic(controller,.6,60);return;
  }

  if(activePower?.id!=='infinite'){
    if(state.ammo<weapon.ammoCost){
      sfx.empty();toast('EMPTY · RELOAD','#ff7b7b');haptic(controller,.45,42);reload();return;
    }
    state.ammo-=weapon.ammoCost;
  }

  state.balanceCents-=stake;
  state.totalSpentCents+=stake;
  state.shots++;
  sfx.shot(weapon.id);

  let anyHit=false;
  for(let i=0;i<weapon.pellets;i++){
    anyHit=firePellet(origin,direction,weapon,controller,stake)||anyHit;
  }

  if(!anyHit&&now-lastHit>1600)state.combo=0;
  if(anyHit)lastHit=now;
  telemetryEvent('shot_fired',JSON.stringify({stakeCents:stake,weapon:weapon.id,balanceCents:state.balanceCents,hit:anyHit}));
  save();hud();checkAchievements();
}

const controllers=[];
for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i);
  controllers.push(c);scene.add(c);

  const gun=new THREE.Group();
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,.58,7),new THREE.MeshLambertMaterial({color:i?0xff44cc:0x25eaff,emissive:i?0x440022:0x003c44,emissiveIntensity:.65}));
  barrel.rotateX(Math.PI/2);barrel.translateZ(-.29);gun.add(barrel);
  const sight=new THREE.Mesh(new THREE.TorusGeometry(.05,.012,5,10),new THREE.MeshBasicMaterial({color:0xeaffff}));
  sight.position.set(0,.07,-.52);gun.add(sight);
  c.add(gun);

  c.addEventListener('connected',e=>{
    c.userData.source=e.data;
    const gp=e.data?.gamepad;
    telemetryEvent('xr_controller_connected',JSON.stringify({hand:e.data?.handedness,profiles:e.data?.profiles,mapping:gp?.mapping,buttons:gp?.buttons?.length,axes:gp?.axes?.length}));
  });
  c.addEventListener('selectstart',()=>{
    ensureAudio();
    c.userData.autoFire=true;
    const o=new THREE.Vector3(),q=new THREE.Quaternion(),d=new THREE.Vector3(0,0,-1);
    c.getWorldPosition(o);c.getWorldQuaternion(q);d.applyQuaternion(q);fire(o,d,c);
  });
  c.addEventListener('selectend',()=>{c.userData.autoFire=false});
  c.addEventListener('squeezestart',()=>{ensureAudio();if(i===0)reload();else cycleWeapon(1,c)});
}

function activateSuper(controller=null){
  if(state.superCharge<100){
    showStatusHologram('ARC STORM '+Math.round(state.superCharge)+'%','#9b5cff','CHARGE WITH HITS');
    haptic(controller,.15,25);
    return;
  }
  state.superCharge=0;
  activePower={id:'slow',label:'ARC STORM · TIME WARP',color:'#9b5cff'};
  powerUntil=performance.now()+9000;
  sfx.power();haptic(controller,.85,120);
  toast('ARC STORM · TIME WARP','#c59bff',1200);
  showStatusHologram('ARC STORM','#c59bff','TIME WARP 9s');
  telemetryEvent('super_activate','arc_storm');
  save();hud();
}
function resetDemoBankroll(){
  state.balanceCents=2000;
  state.sessionStartCents=2000;
  state.shotTierIndex=0;
  state.totalSpentCents=0;
  state.totalWonCents=0;
  state.ammo=maxAmmo();
  state.superCharge=0;
  save();hud();renderArmory();
  toast('DEMO BANKROLL RESET · $20.00','#78ff9b',1100);
  showStatusHologram('DEMO $20.00','#78ff9b','BULLET '+money(shotCents()));
  telemetryEvent('demo_bankroll_reset','2000');
}
function buttonPressed(gp,index){return Boolean(gp?.buttons?.[index]?.pressed)}
function buttonEdge(controller,index){
  const src=controller?.userData?.source;
  const gp=src?.gamepad;
  if(!gp)return false;
  let state=xrButtonState.get(controller);
  if(!state){state={buttons:[]};xrButtonState.set(controller,state)}
  const now=buttonPressed(gp,index);
  const prev=Boolean(state.buttons[index]);
  state.buttons[index]=now;
  return now&&!prev;
}
function pollXRControls(){
  for(const c of controllers){
    const src=c.userData.source;
    const gp=src?.gamepad;
    if(!gp)continue;
    const hand=src.handedness||'none';

    if(buttonEdge(c,3)){
      if(hand==='left')toggleLockOn(c);
      else activateSuper(c);
      telemetryEvent('xr_button','thumbstick:'+hand);
    }
    if(buttonEdge(c,4)){
      if(hand==='left')changeShotTier(-1,c);
      else cycleWeapon(1,c);
      telemetryEvent('xr_button','primary-face:'+hand);
    }
    if(buttonEdge(c,5)){
      if(hand==='left')changeShotTier(1,c);
      else cycleWeapon(-1,c);
      telemetryEvent('xr_button','secondary-face:'+hand);
    }
  }
}

async function configureStartMode(){
  const button=$('#vr');
  try{immersiveVrSupported=Boolean(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr'))}catch{immersiveVrSupported=false}

  if(immersiveVrSupported){
    button.textContent='ENTER VR';button.dataset.mode='vr';
    $('#hint').textContent='Quest: HOLD trigger fire · L grip reload · R grip weapon · X/Y shot $ −/+ · A/B weapon ± · L-stick lock · R-stick ARC STORM';
  }else{
    button.textContent='START DESKTOP';button.dataset.mode='desktop';
    $('#hint').textContent='Desktop: click/hold fire · R reload · Q weapon · [/] bullet value · L lock · E super · A armory · H support';
  }
}
configureStartMode();

async function startGameAudio(){
  const audio=await ensureAudio();
  setTrapWorld(currentMap().id);
  await startTrapBeat(currentMap().id);
  musicStatus=audio?.state==='running'?'ON':'BLOCKED';
  vrStatusLast='';
  telemetryEvent('music_start','trap-142bpm:'+musicStatus);
}
$('#vr').onclick=async()=>{
  const button=$('#vr');
  await startGameAudio();

  if(!immersiveVrSupported){
    playActive=true;document.body.classList.add('desktop-playing');button.textContent='DESKTOP ACTIVE';button.disabled=true;canvas.focus();
    telemetryEvent('desktop_start');toast(currentMap().name+' START','#79f8ff');return;
  }

  try{
    const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});
    await renderer.xr.setSession(s);
    await ensureAudio();
    await startTrapBeat(currentMap().id);
    playActive=true;document.body.classList.add('xr-active');
    setTimeout(()=>showWeaponHologram(),450);
    telemetryEvent('vr_enter');button.textContent='VR ACTIVE';toast(currentMap().name+' START','#79f8ff');

    s.addEventListener('end',()=>{
      telemetryEvent('vr_exit');playActive=false;document.body.classList.remove('xr-active');configureStartMode();
    },{once:true});

    if(s.supportedFrameRates?.length){
      const target=s.supportedFrameRates.includes(72)?72:s.supportedFrameRates[0];
      try{await s.updateTargetFrameRate(target)}catch{}
    }
  }catch(error){
    telemetryEvent('vr_error',error?.message||String(error));toast('VR START FAILED','#ff6b6b');button.textContent='ENTER VR';
  }
};

$('#reloadButton').onclick=()=>reload();
$('#mapButton').onclick=()=>changeMap(null,true);
$('#weaponButton').onclick=()=>cycleWeapon();
$('#stakeDownButton').onclick=()=>changeShotTier(-1);
$('#stakeUpButton').onclick=()=>changeShotTier(1);
$('#armoryButton').onclick=()=>openArmory();
$('#supportButton').onclick=()=>openSupport();
$('#economyButton').onclick=()=>openEconomy();
$('#closeEconomy').onclick=()=>closeEconomy();
$('#goldModeButton').onclick=()=>selectPlayMode('gold');
$('#sweepsModeButton').onclick=()=>selectPlayMode('sweeps');
$('#closeSupport').onclick=()=>closeSupport();
$('#textSupport').onclick=()=>textSupport();
$('#callSupport').onclick=()=>callSupport();
$('#copySupport').onclick=()=>copySupportNumber();
$('#closeArmory').onclick=()=>closeArmory();
$('#resetDemo').onclick=()=>resetDemoBankroll();
$('#armory').addEventListener('click',e=>{if(e.target===$('#armory'))closeArmory()});
$('#supportPanel').addEventListener('click',e=>{if(e.target===$('#supportPanel'))closeSupport()});
$('#economyPanel').addEventListener('click',e=>{if(e.target===$('#economyPanel'))closeEconomy()});
document.addEventListener('click',e=>{
  const weapon=e.target.closest?.('[data-select-weapon]');
  if(weapon){selectWeapon(weapon.dataset.selectWeapon);return}
  const upgrade=e.target.closest?.('[data-buy-upgrade]');
  if(upgrade)buyUpgrade(upgrade.dataset.buyUpgrade);
});

const mouse=new THREE.Vector2(),desktopKeys=new Set();
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  desktopKeys.add(k);
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='r')reload();
  if(k==='m')changeMap(null,true);
  if(k==='q')cycleWeapon();
  if(k==='[')changeShotTier(-1);
  if(k===']')changeShotTier(1);
  if(k==='a')armoryOpen?closeArmory():openArmory();
  if(k==='h')supportOpen?closeSupport():openSupport();
  if(k==='o')economyOpen?closeEconomy():openEconomy();
  if(k==='l')toggleLockOn();
  if(k==='e')activateSuper();
  if(k==='escape'&&armoryOpen)closeArmory();
  if(k==='escape'&&supportOpen)closeSupport();
  if(k==='escape'&&economyOpen)closeEconomy();
});
addEventListener('keyup',e=>desktopKeys.delete(e.key.toLowerCase()));

addEventListener('pointerdown',e=>{
  if(renderer.xr.isPresenting||e.target.closest?.('#controls')||e.target.closest?.('.floating-action')||e.target.closest?.('.panel')||!playActive||armoryOpen||supportOpen||economyOpen)return;
  mouse.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  ray.setFromCamera(mouse,camera);
  fire(ray.ray.origin.clone(),ray.ray.direction.clone());
});
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
});

function updateFishAI(f,dt,t,index){
  const slow=(activePower?.id==='slow') ? 0.52 : 1;
  const motion=f.userData.boss?f.userData.bossMotion:f.userData.motion;
  const speed=f.userData.v*slow;

  if(f.userData.boss){
    if(motion==='charge'){
      f.userData.charge+=dt;
      const burst=(Math.sin(f.userData.charge*2.2)>0.75?2.2:1);
      f.position.x+=f.userData.dir*speed*burst*dt;
      f.position.y+=Math.sin(t*.8+f.userData.phase)*.004;
    }else if(motion==='warp'){
      f.position.x+=f.userData.dir*speed*dt;
      f.position.y=Math.sin(t*1.3+f.userData.phase)*1.6+.7;
      if(Math.floor(t*2)%7===0)f.rotation.z=Math.sin(t*5)*.18;
    }else if(motion==='orbit'){
      f.position.x=Math.sin(t*.35+f.userData.phase)*5.5;
      f.position.y=1+Math.sin(t*.8)*1.5;
      f.position.z=-12+Math.cos(t*.35+f.userData.phase)*2.5;
    }else{
      f.position.x+=f.userData.dir*speed*dt;
      f.position.y+=Math.sin(t*1.05+f.userData.phase)*.004;
    }
  }else{
    if(motion==='fast'){
      f.position.x+=f.userData.dir*speed*1.35*dt;
      f.position.y+=Math.sin(t*2.2+f.userData.phase)*.003;
    }else if(motion==='bob'){
      f.position.x+=f.userData.dir*speed*.7*dt;
      f.position.y+=Math.sin(t*3+f.userData.phase)*.008;
    }else if(motion==='zigzag'){
      f.position.x+=f.userData.dir*speed*dt;
      f.position.y+=Math.sin(t*3.2+f.userData.phase)*.012;
      f.position.z+=Math.cos(t*2.1+f.userData.phase)*.006;
    }else if(motion==='wave'){
      f.position.x+=f.userData.dir*speed*dt;
      f.rotation.z=Math.sin(t*3+f.userData.phase)*.22;
      f.position.y+=Math.sin(t*2+f.userData.phase)*.006;
    }else{
      f.position.x+=f.userData.dir*speed*.8*dt;
      f.position.y+=Math.sin(t*1.35+f.userData.phase+index*.05)*.004;
    }
  }

  f.rotation.y=Math.sin(t*.7+f.userData.phase)*.08;
  if(f.userData.halo)f.userData.halo.rotation.x+=dt*1.8;

  if(Math.abs(f.position.x)>8.5&&motion!=='orbit'){
    f.userData.dir*=-1;flipArcadeFish(f,f.userData.dir);
  }
}

loadCompliance();
buildMap();
spawnPopulation();
hud();
renderArmory();
checkAchievements();

const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),.04),t=performance.now()/1000;
  updatePower();
  const nowMs=performance.now();
  if(nowMs>=nextHudAt){hud();nextHudAt=nowMs+100;}

  if(playActive&&!armoryOpen&&!supportOpen&&!economyOpen){
    if(!renderer.xr.isPresenting){
      const speed=3.25*dt;
      if(desktopKeys.has('w')||desktopKeys.has('arrowup'))camera.position.z-=speed;
      if(desktopKeys.has('s')||desktopKeys.has('arrowdown'))camera.position.z+=speed;
      if(desktopKeys.has('a')||desktopKeys.has('arrowleft'))camera.position.x-=speed;
      if(desktopKeys.has('d')||desktopKeys.has('arrowright'))camera.position.x+=speed;
      camera.position.x=Math.max(-7.5,Math.min(7.5,camera.position.x));
      camera.position.z=Math.max(-3,Math.min(9,camera.position.z));
    }

    bossClock-=dt;
    if(bossClock<=0&&!boss){
      const bossDef=BOSSES[currentMap().boss];
      spawnFish({boss:true,bossDef});
      setEvent('⚠ '+bossDef.name+' INBOUND ⚠',currentMap().accent?('#'+currentMap().accent.toString(16).padStart(6,'0')):'#ffcf40',true);
      toast('BOSS WAVE','#ffcf40',1000);
    }

    pollXRControls();
    for(const c of controllers){
      if(c.userData.autoFire){
        const o=new THREE.Vector3(),q=new THREE.Quaternion(),d=new THREE.Vector3(0,0,-1);
        c.getWorldPosition(o);c.getWorldQuaternion(q);d.applyQuaternion(q);fire(o,d,c);
      }
    }
    fish.forEach((f,i)=>updateFishAI(f,dt,t,i));

    for(let i=bolts.length-1;i>=0;i--){
      const b=bolts[i];b.position.addScaledVector(b.userData.d,dt*32);b.userData.life-=dt;
      if(b.userData.life<=0){scene.remove(b);bolts.splice(i,1)}
    }
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.position.addScaledVector(p.userData.vel,dt);p.userData.vel.multiplyScalar(.96);p.userData.life-=dt;p.scale.multiplyScalar(.97);
      if(p.userData.life<=0){scene.remove(p);particles.splice(i,1)}
    }
    for(const a of ambient){
      if(a.userData.spin){a.rotation.x+=dt*a.userData.spin;a.rotation.y+=dt*a.userData.spin*.7}
      if(a.userData.floatField)a.rotation.y+=dt*.01;
    }
  }

  updateVRStatus();
  renderer.render(scene,camera);
});
