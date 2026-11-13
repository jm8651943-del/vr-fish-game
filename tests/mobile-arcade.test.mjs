import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>readFileSync(path.join(root,name),'utf8');

test('mobile adapter has valid JavaScript syntax',()=>{
  const checked=spawnSync(process.execPath,['--check',path.join(root,'public/mobile-arcade.js')],{encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr||checked.stdout);
});

test('mobile layout loads alongside the existing VR engine',()=>{
  const html=read('public/index.html');
  for(const id of ['mobileArcade','mobileMoveZone','mobileMoveThumb','mobileFire','mobileReload','mobileSuper']){
    assert.ok(html.includes('id="'+id+'"'),'Missing mobile control: '+id);
  }
  for(const asset of ['/game.js','/mobile-arcade.js','/styles.css','/mobile-arcade.css']){
    assert.ok(html.includes(asset),'Missing asset: '+asset);
  }
  assert.ok(html.includes('id="vr"'),'VR launch button must remain present');
  assert.ok(html.includes('id="goldModeButton"'),'Existing Gold mode must remain present');
  assert.ok(html.includes('id="sweepsModeButton"'),'Existing Sweeps toggle must remain present');
});

test('mobile adapter uses existing game input and frees input on focus loss',()=>{
  const js=read('public/mobile-arcade.js');
  assert.ok(js.includes("key(k,'keydown')"));
  assert.ok(js.includes("key(k,'keyup')"));
  assert.ok(js.includes("canvas.dispatchEvent(new PointerEvent('pointerdown'"));
  assert.ok(js.includes("window.addEventListener('blur',resetAll)"));
  assert.ok(js.includes("window.addEventListener('pagehide',resetAll)"));
  assert.ok(js.includes("document.hidden)resetAll()"));
  assert.ok(js.includes("stickPointer!==null"));
  assert.ok(js.includes("e.stopPropagation();moveStick(e)"));
  assert.ok(js.includes("document.body.classList.contains('xr-active')"));
});

test('mobile layout is isolated from XR display',()=>{
  const css=read('public/mobile-arcade.css');
  assert.ok(css.includes('body.xr-active .mobile-arcade{display:none!important}'));
  assert.ok(css.includes('.mobile-arcade[hidden]{display:none!important}'));
  assert.ok(css.includes('touch-action:none'));
});
