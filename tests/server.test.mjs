import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
const app=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'3197'},stdio:['ignore','pipe','pipe']});
await once(app.stdout,'data');
const origin='http://127.0.0.1:3197';
test.after(()=>app.kill());
test('health, vendor module and security headers',async()=>{
  const health=await fetch(origin+'/health');assert.equal(health.status,200);assert.match((await health.json()).build,/0\.9\.1/);assert.equal(health.headers.get('x-content-type-options'),'nosniff');
  const vendor=await fetch(origin+'/vendor/three.module.js');assert.equal(vendor.status,200);assert.match(vendor.headers.get('content-type'),/javascript/);
  assert.equal((await fetch(origin+'/vendor/not-three.js')).status,404);
});
test('new modules and entrypoint are served; HEAD has no body',async()=>{
  for(const file of ['game-core.js','fish-models.js','environment.js','index.html'])assert.equal((await fetch(origin+'/'+file)).status,200);
  const head=await fetch(origin+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('path traversal and malformed encodings are rejected',async()=>{
  for(const [path,status] of [['/%2e%2e%2fpackage.json',403],['/%GG',400]]){
    const code=await new Promise((resolve,reject)=>{http.get(origin+path,res=>{res.resume();resolve(res.statusCode)}).on('error',reject)});assert.equal(code,status);
  }
});
test('telemetry rejects malformed, non-object and oversized JSON with usable responses',async()=>{
  for(const [body,status] of [['{',400],['null',400],['[]',400],[JSON.stringify({eventType:'x',detail:'a'.repeat(40000)}),413]]){
    const res=await fetch(origin+'/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body});assert.equal(res.status,status);
  }
});
test('telemetry records accepted events with bounded cardinality',async()=>{
  for(let i=0;i<80;i++){const res=await fetch(origin+'/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventType:'test_'+i})});assert.equal(res.status,202)}
  const stats=await(await fetch(origin+'/api/stats')).json();assert.equal(stats.totalEvents,80);assert.ok(Object.keys(stats.events).length<=65);assert.equal(stats.events.other,16);
});
