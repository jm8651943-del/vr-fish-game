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

// One analytic body test per fish; labels, glows, fins and model triangles are excluded.
export function rayEllipsoidDistance(origin,direction,radii,maxDistance=Infinity){
  let a=0,b=0,c=-1;
  for(const axis of ['x','y','z']){
    const radius=radii[axis];if(!(radius>0))return null;
    const o=origin[axis]/radius,d=direction[axis]/radius;
    a+=d*d;b+=2*o*d;c+=o*o;
  }
  if(a<1e-12)return null;
  const disc=b*b-4*a*c;if(disc<0)return null;
  const root=Math.sqrt(disc),near=(-b-root)/(2*a),far=(-b+root)/(2*a);
  const distance=near>=0?near:far>=0?far:null;
  return distance!==null&&distance<=maxDistance?distance:null;
}
export function wheelIndex(x,y,count=4,deadzone=.35){
  if(Math.hypot(x,y)<deadzone)return null;
  // Index zero is at the top; subsequent slots advance clockwise.
  const angle=(Math.atan2(x,-y)+Math.PI*2)%(Math.PI*2);
  return Math.round(angle/(Math.PI*2/count))%count;
}
