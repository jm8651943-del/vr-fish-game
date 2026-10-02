// Optional visual/integration check: npm install --no-save playwright first.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().includes('favicon'))errors.push(msg.text())});
 const source=await fs.readFile(path.join(__dirname,'../public/game.js'),'utf8');
 // Test-only exposure in the browser response, never shipped with the application.
 await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:source+`\nglobalThis.__arena={
  audioState:async()=>{const a=await ensureAudio();return {context:a?.state,music:musicStatus}},
  snapshot:()=>({state:structuredClone(state),fish:fish.length,epoch:worldEpoch,scheduled:scheduled.length,camera:camera.position.toArray(),memory:{...renderer.info.memory},calls:renderer.info.render.calls}),
  stop:()=>renderer.setAnimationLoop(null),map:changeMap,catchFish:()=>registerCatch(fish.find(f=>!f.userData.boss)),
  target:()=>{const f=fish.find(f=>!f.userData.boss);f.position.set(0,1.55,-5);scene.updateMatrixWorld(true);return f.userData.hp},
  fire:()=>fire(new THREE.Vector3(0,1.55,3.5),new THREE.Vector3(0,0,-1)),
  setAmmo:v=>state.ammo=v,reload,hitDuringReload:()=>fire(new THREE.Vector3(0,1.55,3.5),new THREE.Vector3(0,0,-1)),
  label:()=>showStatusHologram('TEST '+Math.random(),'#79f8ff'),
  render:()=>renderer.render(scene,camera),pending:()=>scheduled.map(task=>task.epoch),
  flush:()=>{gameTimeMs+=1000;const due=scheduled;scheduled=[];for(const task of due)if(task.epoch===worldEpoch)task.run()},
  power:activatePower,pauseTime:()=>({time:gameTimeMs,until:powerUntil}),
  stress:()=>{const start=performance.now();for(let i=0;i<3000;i++){bodyHits(new THREE.Vector3(0,1.55,3.5),new THREE.Vector3(0,0,-1));spark(new THREE.Vector3(),0x79ffff,12);bolt(new THREE.Vector3(),new THREE.Vector3(0,0,-1));}updateEffects(.016);renderer.render(scene,camera);return {ms:performance.now()-start,particles:particlePool.length,bolts:boltPool.length,memory:{...renderer.info.memory}}},
  fireHidden:()=>{const original=renderer.xr.getSession;renderer.xr.getSession=()=>({visibilityState:'visible-blurred'});fire(new THREE.Vector3(0,1.55,3.5),new THREE.Vector3(0,0,-1));renderer.xr.getSession=original;},
  models:()=>fish.every(f=>!!f.userData.model3d),
 };` }));
 const origin=process.env.GAME_ORIGIN||'http://127.0.0.1:3000';
 await page.goto(origin);await page.waitForFunction(()=>!!globalThis.__arena);
 assert.equal(await page.evaluate(()=>__arena.models()),true);
 await page.click('#vr');await page.waitForFunction(()=>document.body.classList.contains('desktop-playing'));
 await page.waitForTimeout(350);
 await page.keyboard.down('a');await page.waitForTimeout(150);await page.keyboard.up('a');
 assert.equal(await page.locator('#armory').getAttribute('hidden'),'');
 await page.keyboard.press('f');assert.equal(await page.locator('#armory').getAttribute('hidden'),null);
 await page.keyboard.press('f');
 await page.keyboard.press('q');assert.equal(await page.locator('#weaponWheel').getAttribute('hidden'),null);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#weaponWheel').getAttribute('hidden'),'');
 assert.equal((await page.evaluate(()=>__arena.snapshot())).state.weaponId,'pulse');
 await page.click('#qualityButton');assert.match(await page.locator('#qualityButton').innerText(),/HIGH/);
 const heldBefore=await page.evaluate(()=>__arena.snapshot().state.shots);
 await page.mouse.move(1000,650);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();
 assert.ok((await page.evaluate(()=>__arena.snapshot().state.shots))>=heldBefore+2,'holding desktop fire must repeat shots');
 await page.waitForTimeout(200); // let the real weapon cooldown finish after held fire
 const before=await page.evaluate(()=>{__arena.stop();return __arena.snapshot()});
 await page.evaluate(()=>{__arena.target();__arena.fire()});
 const shot=await page.evaluate(()=>__arena.snapshot());assert.equal(shot.state.shots,before.state.shots+1);assert.equal(shot.state.ammo,before.state.ammo-1);
 await page.waitForTimeout(200);
 await page.evaluate(()=>__arena.fireHidden());assert.equal((await page.evaluate(()=>__arena.snapshot())).state.shots,shot.state.shots,'blurred XR sessions must not spend credits');
 await page.evaluate(()=>{__arena.setAmmo(6);__arena.reload();__arena.hitDuringReload()});
 assert.equal((await page.evaluate(()=>__arena.snapshot())).state.shots,shot.state.shots);
 await page.evaluate(()=>{__arena.catchFish();__arena.map(1,true);__arena.flush();__arena.render()});
 assert.equal((await page.evaluate(()=>__arena.snapshot())).fish,18,'old-world respawn must not add an extra fish');
 const names=['NEON REEF','MOLTEN TRENCH','COSMIC VOID','FROZEN ABYSS','TOXIC RUINS'];
 for(let i=0;i<names.length;i++){
   await page.evaluate(i=>{__arena.map(i,true);__arena.render()},i);
   assert.equal(await page.locator('#mapName').innerText(),names[i]);
 }
 await page.evaluate(()=>{for(let i=0;i<20;i++){__arena.map(i%5,true);__arena.render()}__arena.map(0,true);__arena.render()});
 const memory=await page.evaluate(()=>__arena.snapshot());assert.ok(memory.memory.geometries<250,JSON.stringify(memory.memory));assert.ok(memory.memory.textures<100,JSON.stringify(memory.memory));
 const stressed=await page.evaluate(()=>__arena.stress());assert.equal(stressed.particles,48);assert.equal(stressed.bolts,16);assert.ok(stressed.memory.geometries<=memory.memory.geometries+2,'firing must not allocate new GPU geometries');
 const textureBefore=memory.memory.textures;
 await page.evaluate(()=>{for(let i=0;i<12;i++)__arena.label();__arena.render()});
 await page.waitForTimeout(1100);await page.evaluate(()=>__arena.render());
 assert.equal((await page.evaluate(()=>__arena.snapshot())).memory.textures,textureBefore,'dynamic holograms must release textures');
 const screenshot=process.env.GAME_SCREENSHOT||'/tmp/abyss-arena-desktop.png';
 await page.screenshot({path:screenshot});
 // Corrupt existing data must not abort startup.
 await page.evaluate(()=>localStorage.setItem('vrfg.player','{broken'));await page.reload();await page.waitForFunction(()=>!!globalThis.__arena);assert.equal((await page.evaluate(()=>__arena.snapshot())).state.balanceCents,2000);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.ok(await page.locator('#vr').isVisible());
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 await page.click('#musicButton');await page.waitForTimeout(100);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await page.waitForTimeout(100);
 const audioPaused=await page.evaluate(()=>__arena.audioState());assert.equal(audioPaused.context,'suspended');assert.equal(audioPaused.music,'PAUSED');
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>__arena.audioState())).context,'suspended');
 await page.click('#musicButton');await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>__arena.audioState())).context,'running');
 await page.click('#musicButton');await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>__arena.audioState())).context,'suspended');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',maps:5,checks:'3D boot, optional wheel, body hitboxes, firing pool stress, reload guard, world isolation, resource cleanup, saves, mobile, audio page-exit/mute lifecycle',memory:memory.memory,drawCalls:memory.calls,stressMs:stressed.ms,screenshot},null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
