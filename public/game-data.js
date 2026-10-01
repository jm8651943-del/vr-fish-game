export const WORLD_MAPS=[
  {
    id:"reef",name:"NEON REEF",subtitle:"Coral City",fog:0x021a2b,clear:0x000000,fogDensity:.03,
    floor:0x083847,rock:0x12434c,accent:0x19dfff,bonus:1,progress:12,
    palette:[0x19dfff,0xff48c8,0xffcf40,0x62ff83,0x906bff,0xff633f],
    species:["clownfish","puffer","stingray","marlin","seaturtle","reefshark","orca","angler"],boss:"leviathan"
  },
  {
    id:"lava",name:"MOLTEN TRENCH",subtitle:"Core Breach",fog:0x2d0702,clear:0x000000,fogDensity:.036,
    floor:0x2b0805,rock:0x32100c,accent:0xff5a1f,bonus:1.5,progress:14,
    palette:[0xff5a1f,0xffb000,0xff3333,0xffe26b,0xd92dff,0xff7a45],
    species:["ember","puffer","stingray","marlin","seaturtle","reefshark","orca","eel"],boss:"magma"
  },
  {
    id:"space",name:"COSMIC VOID",subtitle:"Zero-G Shoal",fog:0x030316,clear:0x000000,fogDensity:.02,
    floor:0x080824,rock:0x151545,accent:0x9d6cff,bonus:2,progress:16,
    palette:[0x8efcff,0xa96cff,0xff57d8,0x6bffda,0xffe36b,0x7a8cff],
    species:["comet","stingray","marlin","seaturtle","reefshark","orca","eel","angler"],boss:"void"
  },
  {
    id:"ice",name:"FROZEN ABYSS",subtitle:"Cryo Shelf",fog:0x071c2c,clear:0x000000,fogDensity:.028,
    floor:0x123b52,rock:0x38667d,accent:0x9feaff,bonus:2.5,progress:18,
    palette:[0xc9f6ff,0x75d8ff,0xaac8ff,0xd3a8ff,0x8ffff0,0xffffff],
    species:["frost","clownfish","stingray","marlin","seaturtle","reefshark","orca","eel"],boss:"glacier"
  },
  {
    id:"toxic",name:"TOXIC RUINS",subtitle:"Reactor Delta",fog:0x122408,clear:0x000000,fogDensity:.034,
    floor:0x182d0c,rock:0x304319,accent:0xb4ff3c,bonus:3,progress:20,
    palette:[0xb4ff3c,0x71ff6a,0xe4ff4a,0x3dffac,0xe963ff,0xffd24a],
    species:["sludge","puffer","stingray","marlin","seaturtle","reefshark","orca","angler","eel"],boss:"reactor"
  }
];

export const SPECIES={
  clownfish:{id:"clownfish",name:"Clownfish",hp:1,speed:1.20,value:30,points:30,multiplier:3,shape:"clownfish",motion:"school",size:.82},
  dart:{id:"dart",name:"Dartfish",hp:1,speed:1.45,value:24,points:24,multiplier:2,shape:"dart",motion:"fast",size:.76},
  puffer:{id:"puffer",name:"Blowfish",hp:4,speed:.52,value:80,points:80,multiplier:7,shape:"puffer",motion:"bob",size:1.02},
  stingray:{id:"stingray",name:"Stingray",hp:5,speed:.68,value:130,points:130,multiplier:12,shape:"stingray",motion:"glide",size:1.20},
  ray:{id:"ray",name:"Prism Ray",hp:4,speed:.75,value:115,points:115,multiplier:10,shape:"ray",motion:"glide",size:1.12},
  marlin:{id:"marlin",name:"Blue Marlin",hp:7,speed:1.28,value:210,points:210,multiplier:20,shape:"marlin",motion:"fast",size:1.38},
  seaturtle:{id:"seaturtle",name:"Sea Turtle",hp:9,speed:.43,value:280,points:280,multiplier:28,shape:"turtle",motion:"glide",size:1.40},
  reefshark:{id:"reefshark",name:"Reef Shark",hp:12,speed:.84,value:380,points:380,multiplier:40,shape:"shark",motion:"sweep",size:1.55},
  orca:{id:"orca",name:"Killer Whale",hp:18,speed:.74,value:650,points:650,multiplier:65,shape:"orca",motion:"sweep",size:1.90},
  angler:{id:"angler",name:"Neon Angler",hp:3,speed:.83,value:150,points:150,multiplier:14,shape:"angler",motion:"zigzag",size:1.04},
  eel:{id:"eel",name:"Arc Eel",hp:5,speed:1.05,value:175,points:175,multiplier:17,shape:"eel",motion:"wave",size:1.22},
  ember:{id:"ember",name:"Emberfin",hp:3,speed:1.02,value:105,points:105,multiplier:9,shape:"dart",motion:"zigzag",size:.95},
  comet:{id:"comet",name:"Comet Koi",hp:3,speed:1.18,value:145,points:145,multiplier:13,shape:"dart",motion:"fast",size:1.04},
  frost:{id:"frost",name:"Frost Pike",hp:5,speed:.88,value:180,points:180,multiplier:17,shape:"eel",motion:"glide",size:1.20},
  sludge:{id:"sludge",name:"Sludge Snapper",hp:8,speed:.46,value:240,points:240,multiplier:24,shape:"round",motion:"bob",size:1.28}
};

export const BOSSES={
  leviathan:{id:"leviathan",name:"REEF LEVIATHAN",hp:48,value:4000,multiplier:100,color:0xff285d,shape:"leviathan",motion:"sweep",coreReward:4},
  magma:{id:"magma",name:"MAGMA RAY",hp:56,value:5200,multiplier:150,color:0xff3100,shape:"ray",motion:"charge",coreReward:5},
  void:{id:"void",name:"VOID EEL",hp:64,value:6500,multiplier:220,color:0xa657ff,shape:"eel",motion:"warp",coreReward:6},
  glacier:{id:"glacier",name:"GLACIER KRAKEN",hp:72,value:7800,multiplier:300,color:0x9feaff,shape:"leviathan",motion:"orbit",coreReward:7},
  reactor:{id:"reactor",name:"REACTOR SHARK",hp:84,value:9500,multiplier:500,color:0xb4ff3c,shape:"shark",motion:"charge",coreReward:8}
};

export const SPECIALS=[
  {id:"gold",label:"GOLDEN FISH",chance:.04,color:0xffd447,value:700,multiplier:50,power:"double",coreReward:1},
  {id:"crystal",label:"CRYSTAL FISH",chance:.03,color:0x7fffff,value:650,multiplier:40,power:"infinite",coreReward:1},
  {id:"nova",label:"NOVA FISH",chance:.022,color:0xff57d8,value:1000,multiplier:75,power:"rapid",coreReward:2},
  {id:"chrono",label:"CHRONO FISH",chance:.014,color:0x8bff8e,value:1300,multiplier:100,power:"slow",coreReward:2}
];

export const WEAPONS=[
  {id:"pulse",name:"PULSE BLASTER",unlockLevel:1,ammoCost:1,damage:1,cooldown:170,spread:0,pellets:1,color:0x79ffff,description:"Balanced plasma sidearm."},
  {id:"scatter",name:"SCATTER CANNON",unlockLevel:3,ammoCost:2,damage:1,cooldown:420,spread:.055,pellets:5,color:0xffd86b,description:"Five-shot cone. Great for swarms."},
  {id:"rail",name:"RAIL LANCE",unlockLevel:6,ammoCost:1,damage:4,cooldown:650,spread:0,pellets:1,pierce:3,color:0xb98cff,description:"High damage beam that pierces targets."},
  {id:"arc",name:"ARC DRIVER",unlockLevel:10,ammoCost:2,damage:2,cooldown:520,spread:0,pellets:1,chain:2,color:0x8bff8e,description:"Chains damage to nearby fish."}
];

export const UPGRADES=[
  {id:"damage",name:"DAMAGE CORE",max:5,baseCost:4,description:"+15% weapon damage per rank."},
  {id:"magazine",name:"MAGAZINE CORE",max:5,baseCost:3,description:"+3 max ammo per rank."},
  {id:"score",name:"SCORE CORE",max:5,baseCost:4,description:"+10% score per rank."},
  {id:"luck",name:"LUCK CORE",max:5,baseCost:5,description:"+15% rare-fish chance per rank."}
];

export const ACHIEVEMENTS=[
  {id:"first_catch",name:"FIRST BLOOD... SORT OF",description:"Catch your first fish.",type:"catches",target:1,reward:1},
  {id:"ten_catch",name:"AQUATIC MENACE",description:"Catch 10 fish.",type:"catches",target:10,reward:1},
  {id:"combo_5",name:"TRIGGER HAPPY",description:"Reach a x5 combo multiplier.",type:"comboMultiplier",target:5,reward:2},
  {id:"rare_1",name:"SHINY OBJECT",description:"Catch a rare fish.",type:"rare",target:1,reward:2},
  {id:"boss_1",name:"BIGGER FISH",description:"Defeat a world boss.",type:"bossKills",target:1,reward:3},
  {id:"worlds_5",name:"WORLD TOUR",description:"Visit all five worlds.",type:"worldsVisited",target:5,reward:5},
  {id:"score_25000",name:"ARCADE ROYALTY",description:"Reach 25,000 points.",type:"score",target:25000,reward:5}
];
