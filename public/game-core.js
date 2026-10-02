// Engine-independent rules: storage is untrusted; movement uses elapsed seconds.
const integer=(v,fallback=0,max=1e12)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):fallback;
export function normalizePlayer(raw,worlds,weapons,upgrades){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const state={};
  for(const key of ['score','best','xp','catches','shots','bestCombo','rare','mapCatches','cores','bossKills','totalWorldClears','totalSpentCents','totalWonCents'])state[key]=integer(source[key]);
  state.level=1+Math.floor(state.xp/500);
  state.best=Math.max(state.best,state.score);
  state.combo=0; // streaks do not survive a new session
  state.mapIndex=integer(source.mapIndex,0)%worlds.length;
  state.upgrades=Object.fromEntries(upgrades.map(u=>[u.id,integer(source.upgrades?.[u.id],0,u.max)]));
  state.ammo=integer(source.ammo,12,12+state.upgrades.magazine*3);
  state.weaponId=weapons.find(w=>w.id===source.weaponId&&w.unlockLevel<=state.level)?.id||weapons[0].id;
  state.achievements=source.achievements&&typeof source.achievements==='object'?{...source.achievements}:{};
  state.worldsVisited=[...new Set((Array.isArray(source.worldsVisited)?source.worldsVisited:[]).filter(id=>worlds.some(w=>w.id===id)))];
  state.balanceCents=integer(source.balanceCents,2000);
  state.sessionStartCents=state.balanceCents;
  state.shotTierIndex=integer(source.shotTierIndex,0,6);
  state.superCharge=integer(source.superCharge,0,100);
  return state;
}
export function readPlayer(storage,worlds,weapons,upgrades){
  let raw={};
  try{raw=JSON.parse(storage.getItem('vrfg.player')||'null')}catch{}
  return normalizePlayer(raw,worlds,weapons,upgrades);
}
export function boundedMotion(base,time,phase,frequency,amplitude,min,max){
  return Math.max(min,Math.min(max,base+Math.sin(time*frequency+phase)*amplitude));
}
export function effectiveDamage(hp,damage){return Math.max(0,Math.min(hp,Number.isFinite(damage)?damage:0))}
export function closestTarget(targets,origin,excluded,radius){
  let best=null,distance=radius;
  for(const f of targets){
    if(excluded.has(f)||f.userData.hp<=0)continue;
    const d=f.position.distanceTo(origin);
    if(d<distance){distance=d;best=f}
  }
  return best;
}
