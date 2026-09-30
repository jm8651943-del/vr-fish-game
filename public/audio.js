let ctx=null;
let master=null;

function audioContext(){
  if(ctx)return ctx;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return null;
  ctx=new C();
  master=ctx.createGain();
  master.gain.value=.18;
  master.connect(ctx.destination);
  return ctx;
}

export async function ensureAudio(){
  const c=audioContext();
  if(c?.state==="suspended"){
    try{await c.resume()}catch{}
  }
  return c;
}

function tone({freq=440,endFreq=freq,duration=.08,type="sine",gain=.12,delay=0}={}){
  const c=audioContext();
  if(!c||!master)return;
  const t=c.currentTime+delay;
  const o=c.createOscillator();
  const g=c.createGain();
  o.type=type;
  o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.008);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(master);
  o.start(t);o.stop(t+duration+.02);
}

function noise({duration=.07,gain=.04,delay=0,highpass=900}={}){
  const c=audioContext();
  if(!c||!master)return;
  const frames=Math.max(1,Math.floor(c.sampleRate*duration));
  const buffer=c.createBuffer(1,frames,c.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
  const src=c.createBufferSource();
  const filter=c.createBiquadFilter();
  const g=c.createGain();
  filter.type="highpass";filter.frequency.value=highpass;
  g.gain.value=gain;
  src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(master);
  src.start(c.currentTime+delay);
}

export const sfx={
  shot(kind="pulse"){
    if(kind==="scatter"){tone({freq:170,endFreq:70,duration:.11,type:"sawtooth",gain:.11});noise({duration:.08,gain:.035,highpass:1400});return}
    if(kind==="rail"){tone({freq:1200,endFreq:180,duration:.18,type:"square",gain:.08});tone({freq:2200,endFreq:700,duration:.08,type:"sine",gain:.05});return}
    if(kind==="arc"){tone({freq:880,endFreq:1350,duration:.09,type:"sawtooth",gain:.07});tone({freq:1320,endFreq:550,duration:.12,type:"square",gain:.04,delay:.03});return}
    tone({freq:720,endFreq:260,duration:.09,type:"square",gain:.075});
  },
  hit(){tone({freq:160,endFreq:95,duration:.045,type:"square",gain:.04})},
  catchFish(){tone({freq:520,endFreq:840,duration:.09,type:"sine",gain:.06});tone({freq:780,endFreq:1120,duration:.1,type:"sine",gain:.04,delay:.045})},
  rare(){[0,1,2,3].forEach(i=>tone({freq:520*Math.pow(1.26,i),endFreq:610*Math.pow(1.26,i),duration:.12,gain:.045,delay:i*.07}))},
  boss(){tone({freq:92,endFreq:58,duration:.5,type:"sawtooth",gain:.09});tone({freq:138,endFreq:82,duration:.48,type:"square",gain:.04,delay:.05})},
  bossDown(){[0,1,2,3].forEach(i=>tone({freq:180+110*i,endFreq:260+150*i,duration:.18,type:"sawtooth",gain:.055,delay:i*.07}))},
  reload(){tone({freq:220,endFreq:320,duration:.06,type:"square",gain:.035});tone({freq:330,endFreq:520,duration:.08,type:"square",gain:.04,delay:.22})},
  empty(){tone({freq:110,endFreq:90,duration:.04,type:"square",gain:.035})},
  power(){tone({freq:420,endFreq:1200,duration:.22,type:"sine",gain:.065});tone({freq:660,endFreq:1600,duration:.18,type:"sine",gain:.035,delay:.05})},
  map(){[0,1,2].forEach(i=>tone({freq:220*Math.pow(1.5,i),endFreq:300*Math.pow(1.5,i),duration:.18,gain:.045,delay:i*.08}))},
  achievement(){[0,1,2,3].forEach(i=>tone({freq:660*Math.pow(1.18,i),endFreq:760*Math.pow(1.18,i),duration:.13,type:"triangle",gain:.04,delay:i*.08}))},
  purchase(){tone({freq:440,endFreq:660,duration:.09,type:"triangle",gain:.05});tone({freq:660,endFreq:990,duration:.1,type:"triangle",gain:.04,delay:.08})}
};
