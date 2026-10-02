import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
let contexts=[],intervals=new Map(),created=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
class FakeNode{
 constructor(){created++;this.gain=param();this.frequency=param();this.connected=false;}
 connect(){this.connected=true}disconnect(){this.connected=false}start(){}stop(){}
}
class FakeContext{
 constructor(){this.state='suspended';this.currentTime=1;this.sampleRate=100;this.nodes=[];contexts.push(this)}
 node(){const n=new FakeNode();this.nodes.push(n);return n}
 createGain(){return this.node()}createOscillator(){return this.node()}createBufferSource(){return this.node()}createBiquadFilter(){return this.node()}createWaveShaper(){return this.node()}
 createBuffer(channels,frames){return {getChannelData:()=>new Float32Array(frames)}}
 async resume(){this.state='running'}async suspend(){this.state='suspended'}
}
globalThis.window={AudioContext:FakeContext};
const realSet=globalThis.setInterval,realClear=globalThis.clearInterval;
globalThis.setInterval=callback=>{const id=intervals.size+1;intervals.set(id,callback);return id};
globalThis.clearInterval=id=>intervals.delete(id);
test.after(()=>{globalThis.setInterval=realSet;globalThis.clearInterval=realClear;delete globalThis.window});
const source=await readFile(new URL('../public/audio.js',import.meta.url),'utf8');
const audio=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('background audio stops timers and voices, and cannot resume without explicit action',async()=>{
 audio.sfx.map();assert.equal(contexts.length,0,'map load must not create an audio context');
 await audio.resumeGameAudio();await audio.startTrapBeat('reef');audio.sfx.catchFish();
 assert.equal(contexts[0].state,'running');assert.equal(intervals.size,1);
 const context=contexts[0],before=created;audio.pauseGameAudio();
 assert.equal(context.state,'suspended');assert.equal(intervals.size,0);
 assert.ok(context.nodes.slice(2).every(n=>!n.connected),'scheduled notes and voices must disconnect');
 audio.sfx.catchFish();await audio.ensureAudio();await audio.startTrapBeat('reef');
 assert.equal(created,before);assert.equal(context.state,'suspended');assert.equal(intervals.size,0);
 await audio.resumeGameAudio();await audio.startTrapBeat('reef');assert.equal(contexts.length,1);assert.equal(context.state,'running');assert.equal(intervals.size,1);
 audio.pauseGameAudio();assert.equal(intervals.size,0);
});
