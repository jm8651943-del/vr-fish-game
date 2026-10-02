let ctx=null;
let audioActive=false;
const voices=new Map();
function trackVoice(source,...nodes){
  voices.set(source,nodes);source.onended=()=>{voices.delete(source);for(const node of nodes){try{node.disconnect()}catch{}}};
}
let master=null;
let musicBus=null;
let musicTimer=null;
let nextStepTime=0;
let step=0;
let currentWorld="reef";
let musicOn=false;
let sharedNoiseBuffer=null;

const BPM=142;
const STEP=60/BPM/4;

function audioContext(){
  if(ctx)return ctx;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return null;
  ctx=new C();

  master=ctx.createGain();
  master.gain.value=.55;

  musicBus=ctx.createGain();
  musicBus.gain.value=.58;
  musicBus.connect(master);
  master.connect(ctx.destination);
  return ctx;
}

export async function ensureAudio(){
  if(!audioActive)return ctx;
  const c=audioContext();
  if(c?.state==="suspended"){
    try{await c.resume()}catch{}
  }
  return c;
}

function osc({freq=440,endFreq=freq,duration=.08,type="sine",gain=.12,delay=0,bus=master}={}){
  if(!audioActive)return;
  const c=audioContext();
  if(!c||!bus)return;
  const t=c.currentTime+delay;
  const o=c.createOscillator();
  const g=c.createGain();
  o.type=type;
  o.frequency.setValueAtTime(Math.max(20,freq),t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.006);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(bus);
  trackVoice(o,o,g);
  o.start(t);o.stop(t+duration+.03);
}

function noiseAt(time,{duration=.07,gain=.04,highpass=900,bus=master}={}){
  if(!audioActive)return;
  const c=audioContext();
  if(!c||!bus)return;
  if(!sharedNoiseBuffer){
    const frames=Math.floor(c.sampleRate*.5);
    sharedNoiseBuffer=c.createBuffer(1,frames,c.sampleRate);
    const data=sharedNoiseBuffer.getChannelData(0);
    for(let i=0;i<frames;i++)data[i]=Math.random()*2-1;
  }
  const src=c.createBufferSource();
  const filter=c.createBiquadFilter();
  const g=c.createGain();
  filter.type="highpass";
  filter.frequency.value=highpass;
  g.gain.setValueAtTime(gain,time);
  g.gain.exponentialRampToValueAtTime(.0001,time+duration);
  src.buffer=sharedNoiseBuffer;
  src.connect(filter);filter.connect(g);g.connect(bus);
  trackVoice(src,src,filter,g);
  src.start(time);src.stop(time+duration+.02);
}

function toneAt(time,{freq=440,endFreq=freq,duration=.08,type="sine",gain=.12,bus=musicBus}={}){
  if(!audioActive)return;
  const c=audioContext();
  if(!c||!bus)return;
  const o=c.createOscillator();
  const g=c.createGain();
  o.type=type;
  o.frequency.setValueAtTime(Math.max(20,freq),time);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),time+duration);
  g.gain.setValueAtTime(.0001,time);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),time+.005);
  g.gain.exponentialRampToValueAtTime(.0001,time+duration);
  o.connect(g);g.connect(bus);
  trackVoice(o,o,g);
  o.start(time);o.stop(time+duration+.03);
}

const WORLD_MUSIC={
  reef:{
    root:46.25,
    bass:[0,null,0,null,7,null,5,null,0,null,10,null,7,null,5,null],
    melody:[12,null,15,null,19,null,17,null,12,null,22,null,19,null,15,null],
    hatRoll:[14,15]
  },
  lava:{
    root:43.65,
    bass:[0,null,0,1,6,null,5,null,0,null,8,null,6,5,1,null],
    melody:[12,null,13,null,18,null,17,null,12,null,20,null,18,17,13,null],
    hatRoll:[6,7,14,15]
  },
  space:{
    root:38.89,
    bass:[0,null,7,null,10,null,5,null,0,null,12,null,10,null,7,null],
    melody:[19,null,22,null,24,null,29,null,19,null,27,null,24,null,22,null],
    hatRoll:[11,12,13,14,15]
  },
  ice:{
    root:41.2,
    bass:[0,null,5,null,7,null,3,null,0,null,10,null,7,null,5,null],
    melody:[12,null,19,null,17,null,15,null,12,null,22,null,19,null,17,null],
    hatRoll:[7,15]
  },
  toxic:{
    root:36.71,
    bass:[0,null,1,null,6,null,8,null,0,null,11,null,8,6,1,null],
    melody:[12,null,13,null,18,null,20,null,19,null,23,null,20,18,13,null],
    hatRoll:[5,6,7,13,14,15]
  }
};

function semitone(base,n){
  return base*Math.pow(2,n/12);
}

function kickAt(time,accent=1){
  if(!audioActive)return;
  const c=audioContext();
  if(!c||!musicBus)return;
  const o=c.createOscillator();
  const g=c.createGain();
  o.type="sine";
  o.frequency.setValueAtTime(155,time);
  o.frequency.exponentialRampToValueAtTime(45,time+.13);
  g.gain.setValueAtTime(.0001,time);
  g.gain.exponentialRampToValueAtTime(.34*accent,time+.004);
  g.gain.exponentialRampToValueAtTime(.0001,time+.19);
  o.connect(g);g.connect(musicBus);
  trackVoice(o,o,g);
  o.start(time);o.stop(time+.2);
}

function clapAt(time){
  if(!audioActive)return;
  noiseAt(time,{duration:.085,gain:.14,highpass:1200,bus:musicBus});
  noiseAt(time+.014,{duration:.07,gain:.08,highpass:1800,bus:musicBus});
}

function hatAt(time,open=false,gain=.052){
  if(!audioActive)return;
  noiseAt(time,{duration:open?.11:.025,gain,highpass:5200,bus:musicBus});
}

function bass808At(time,freq,duration=.28,slide=null){
  if(!audioActive)return;
  const c=audioContext();
  if(!c||!musicBus)return;
  const o=c.createOscillator();
  const g=c.createGain();
  const shaper=c.createWaveShaper();

  const curve=new Float32Array(512);
  for(let i=0;i<curve.length;i++){
    const x=i*2/(curve.length-1)-1;
    curve[i]=Math.tanh(x*2.2);
  }
  shaper.curve=curve;

  o.type="sine";
  o.frequency.setValueAtTime(freq,time);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,time+duration*.7);

  g.gain.setValueAtTime(.0001,time);
  g.gain.exponentialRampToValueAtTime(.25,time+.012);
  g.gain.exponentialRampToValueAtTime(.0001,time+duration);

  o.connect(shaper);shaper.connect(g);g.connect(musicBus);
  trackVoice(o,o,shaper,g);
  o.start(time);o.stop(time+duration+.03);
}

function melodyAt(time,freq,world){
  if(!audioActive)return;
  const type=world==="lava"?"sawtooth":world==="toxic"?"square":"triangle";
  toneAt(time,{freq,endFreq:freq,duration:.11,type,gain:.026,bus:musicBus});
  toneAt(time+.01,{freq:freq*2,endFreq:freq*2,duration:.07,type:"sine",gain:.012,bus:musicBus});
}

function scheduleStep(index,time){
  const pattern=WORLD_MUSIC[currentWorld]||WORLD_MUSIC.reef;
  const bar=index%16;

  if([0,3,8,10].includes(bar))kickAt(time,bar===0?1.15:1);
  if(bar===4||bar===12)clapAt(time);

  hatAt(time,false,bar%4===0?.048:.036);
  if(pattern.hatRoll.includes(bar)){
    hatAt(time+STEP/2,false,.028);
    if(bar>=13)hatAt(time+STEP*.75,false,.02);
  }
  if(bar===7||bar===15)hatAt(time,true,.028);

  const bassNote=pattern.bass[bar];
  if(bassNote!=null){
    const next=pattern.bass[(bar+1)%16];
    const base=pattern.root;
    bass808At(time,semitone(base,bassNote),bar===15?.38:.27,next!=null&&bar===15?semitone(base,next):null);
  }

  const melodyNote=pattern.melody[bar];
  if(melodyNote!=null && (bar%2===0 || currentWorld==="space")){
    melodyAt(time,semitone(pattern.root,melodyNote+12),currentWorld);
  }
}

function scheduler(){
  const c=audioContext();
  if(!c||!musicOn)return;
  if(nextStepTime<c.currentTime-.2)nextStepTime=c.currentTime+.02;
  let guard=0;
  while(nextStepTime<c.currentTime+.12&&guard<8){
    try{scheduleStep(step,nextStepTime)}catch{}
    nextStepTime+=STEP;
    step=(step+1)%16;
    guard++;
  }
}

export async function startTrapBeat(world="reef"){
  if(!audioActive)return;
  const c=await ensureAudio();
  if(!c)return;
  currentWorld=WORLD_MUSIC[world]?world:"reef";
  if(musicOn)return;
  musicOn=true;
  step=0;
  nextStepTime=c.currentTime+.05;
  musicTimer=setInterval(scheduler,25);
  scheduler();
}

export function setTrapWorld(world="reef"){
  if(WORLD_MUSIC[world])currentWorld=world;
}

export function stopTrapBeat(){
  musicOn=false;
  if(musicTimer){clearInterval(musicTimer);musicTimer=null}
}

export function setMusicVolume(value=.58){
  if(!musicBus)return;
  musicBus.gain.value=Math.max(0,Math.min(.85,Number(value)||0));
}

export const sfx={
  shot(kind="pulse"){
    if(kind==="scatter"){osc({freq:170,endFreq:70,duration:.11,type:"sawtooth",gain:.11});noiseAt(audioContext()?.currentTime||0,{duration:.08,gain:.035,highpass:1400});return}
    if(kind==="rail"){osc({freq:1200,endFreq:180,duration:.18,type:"square",gain:.08});osc({freq:2200,endFreq:700,duration:.08,type:"sine",gain:.05,delay:.03});return}
    if(kind==="arc"){osc({freq:880,endFreq:1350,duration:.09,type:"sawtooth",gain:.07});osc({freq:1320,endFreq:550,duration:.12,type:"square",gain:.04,delay:.03});return}
    osc({freq:720,endFreq:260,duration:.09,type:"square",gain:.075});
  },
  hit(){osc({freq:160,endFreq:95,duration:.045,type:"square",gain:.04})},
  catchFish(){osc({freq:520,endFreq:840,duration:.09,type:"sine",gain:.06});osc({freq:780,endFreq:1120,duration:.1,type:"sine",gain:.04,delay:.045})},
  rare(){[0,1,2,3].forEach(i=>osc({freq:520*Math.pow(1.26,i),endFreq:610*Math.pow(1.26,i),duration:.12,gain:.045,delay:i*.07}))},
  boss(){osc({freq:92,endFreq:58,duration:.5,type:"sawtooth",gain:.09});osc({freq:138,endFreq:82,duration:.48,type:"square",gain:.04,delay:.05})},
  bossDown(){[0,1,2,3].forEach(i=>osc({freq:180+110*i,endFreq:260+150*i,duration:.18,type:"sawtooth",gain:.055,delay:i*.07}))},
  reload(){osc({freq:220,endFreq:320,duration:.06,type:"square",gain:.035});osc({freq:330,endFreq:520,duration:.08,type:"square",gain:.04,delay:.22})},
  empty(){osc({freq:110,endFreq:90,duration:.04,type:"square",gain:.035})},
  power(){osc({freq:420,endFreq:1200,duration:.22,type:"sine",gain:.065});osc({freq:660,endFreq:1600,duration:.18,type:"sine",gain:.035,delay:.05})},
  map(){[0,1,2].forEach(i=>osc({freq:220*Math.pow(1.5,i),endFreq:300*Math.pow(1.5,i),duration:.18,gain:.045,delay:i*.08}))},
  achievement(){[0,1,2,3].forEach(i=>osc({freq:660*Math.pow(1.18,i),endFreq:760*Math.pow(1.18,i),duration:.13,type:"triangle",gain:.04,delay:i*.08}))},
  purchase(){osc({freq:440,endFreq:660,duration:.09,type:"triangle",gain:.05});osc({freq:660,endFreq:990,duration:.1,type:"triangle",gain:.04,delay:.08})}
};

// Pause the context as well as the interval: already-scheduled notes stop immediately.
export async function resumeGameAudio(){
  audioActive=true;
  return ensureAudio();
}
export function pauseGameAudio(){
  audioActive=false;
  stopTrapBeat();
  for(const [source,nodes] of voices){try{source.stop()}catch{}for(const node of nodes){try{node.disconnect()}catch{}}}
  voices.clear();
  nextStepTime=0;step=0;
  if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});
}
