import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async file=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL(file,import.meta.url),'utf8')).toString('base64'));
const {normalizePlayer,readPlayer,boundedMotion,effectiveDamage,closestTarget}=await load('../public/game-core.js');
const {WORLD_MAPS,SPECIES,BOSSES,WEAPONS,UPGRADES}=await load('../public/game-data.js');
const normalize=raw=>normalizePlayer(raw,WORLD_MAPS,WEAPONS,UPGRADES);
test('corrupt and inaccessible storage boot into a playable default',()=>{
  for(const storage of [{getItem:()=>'{broken'},{getItem:()=>{throw Error('blocked')}},{getItem:()=>null}]){
    const p=readPlayer(storage,WORLD_MAPS,WEAPONS,UPGRADES);
    assert.equal(p.balanceCents,2000);assert.equal(p.weaponId,'pulse');assert.equal(p.ammo,12);
  }
});
test('save migration bounds upgrades, counters, map, locked weapons and live session',()=>{
  const p=normalize({xp:500,score:1234,combo:90,weaponId:'arc',mapIndex:-1,shotTierIndex:2.5,ammo:999,superCharge:123,upgrades:{damage:900,magazine:2,score:-9,luck:'invalid'},balanceCents:888,sessionStartCents:1,worldsVisited:['reef','reef','fake']});
  assert.equal(p.level,2);assert.equal(p.weaponId,'pulse');assert.equal(p.mapIndex,0);assert.equal(p.combo,0);assert.equal(p.ammo,18);assert.equal(p.upgrades.damage,5);assert.equal(p.upgrades.score,0);assert.equal(p.upgrades.luck,0);assert.equal(p.shotTierIndex,2);assert.equal(p.sessionStartCents,888);assert.equal(p.best,1234);assert.deepEqual(p.worldsVisited,['reef']);
  assert.equal(normalize({balanceCents:-20}).balanceCents,0);
});
test('valid earned progression survives migration',()=>{
  const p=normalize({xp:5000,weaponId:'arc',cores:9,achievements:{boss_1:true},upgrades:{luck:3}});
  assert.equal(p.level,11);assert.equal(p.weaponId,'arc');assert.equal(p.cores,9);assert.equal(p.achievements.boss_1,true);assert.equal(p.upgrades.luck,3);
});
test('motion is bounded and identical at 60, 72 and 120Hz',()=>{
  const paths=[60,72,120].map(hz=>Array.from({length:hz*10+1},(_,i)=>boundedMotion(1,i/hz,.4,2.2,.4,-1.55,4.8)));
  for(const path of paths){assert.ok(path.every(y=>y>=.6&&y<=1.4));assert.ok(Math.abs(path.at(-1)-paths[0].at(-1))<1e-12)}
  assert.equal(boundedMotion(5,0,1,1,2,-1,4),4);
});
test('overkill cannot inflate stake-weighted damage evidence',()=>{
  assert.equal(effectiveDamage(.5,12),.5);assert.equal(effectiveDamage(4,2),2);assert.equal(effectiveDamage(4,-5),0);assert.equal(effectiveDamage(0,8),0);
});
test('chain targeting excludes every previously hit fish',()=>{
  const target=(x,hp=8)=>({position:{distanceTo:o=>Math.abs(x-o.x)},userData:{hp}});
  const a=target(0),b=target(1),c=target(2),dead=target(.1,0),excluded=new Set([a]);
  assert.equal(closestTarget([a,b,c,dead],{x:0},excluded,3.2),b);
  excluded.add(b);assert.equal(closestTarget([a,b,c,dead],{x:1},excluded,3.2),c);
  excluded.add(c);assert.equal(closestTarget([a,b,c,dead],{x:2},excluded,3.2),null);
});
test('every world references an existing playable species and boss',()=>{
  for(const world of WORLD_MAPS){assert.ok(BOSSES[world.boss]);assert.ok(world.progress>0);for(const id of world.species){assert.ok(SPECIES[id]);assert.ok(SPECIES[id].hp>0)}}
});
const {rayEllipsoidDistance,wheelIndex}=await load('../public/game-core.js');
test('body hitboxes reject label and glow area, honor range and order hits',()=>{
  const radii={x:1,y:.35,z:.3},direction={x:0,y:0,z:-1};
  assert.ok(Math.abs(rayEllipsoidDistance({x:0,y:0,z:5},direction,radii)-4.7)<1e-10);
  assert.equal(rayEllipsoidDistance({x:0,y:.7,z:5},direction,radii),null);
  assert.equal(rayEllipsoidDistance({x:1.2,y:0,z:5},direction,radii),null);
  assert.equal(rayEllipsoidDistance({x:0,y:0,z:5},direction,radii,4),null);
  assert.equal(rayEllipsoidDistance({x:0,y:0,z:0},direction,radii),.3);
  assert.equal(rayEllipsoidDistance({x:0,y:0,z:5},{x:0,y:0,z:1},radii),null);
});
test('optional wheel deadzone keeps the current weapon; four directions select four slots',()=>{
  assert.equal(wheelIndex(0,0),null);assert.equal(wheelIndex(.1,.1),null);
  assert.equal(wheelIndex(0,-1),0);assert.equal(wheelIndex(1,0),1);assert.equal(wheelIndex(0,1),2);assert.equal(wheelIndex(-1,0),3);
});
