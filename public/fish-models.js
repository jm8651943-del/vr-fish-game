import * as THREE from '/vendor/three.module.js';

// Shared geometry is immutable and lives for the application's lifetime.
const sphere=new THREE.SphereGeometry(1,20,12);
const pupilGeo=new THREE.SphereGeometry(1,8,6);
for(const g of [sphere,pupilGeo])g.userData.sharedResource=true;
const white=new THREE.MeshStandardMaterial({color:0xe7ffff,roughness:.25});
const black=new THREE.MeshStandardMaterial({color:0x04101b,roughness:.2});
white.userData.sharedResource=black.userData.sharedResource=true;
const palette={clownfish:0xff7824,puffer:0xe5b643,stingray:0x39a1b8,ray:0x56cbd6,marlin:0x2788d5,seaturtle:0x52a584,reefshark:0x769ba8,orca:0x142334,angler:0x8658ca,eel:0x2fb6c8,frost:0x83defa};

function ellipsoid(parent,material,scale,pos=[0,0,0],geometry=sphere){
  const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(...scale);mesh.position.set(...pos);parent.add(mesh);return mesh;
}
function fin(parent,material,points){
  const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,steps:1});
  const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;
}
// Bake static parts by material to keep draw calls down on standalone headsets.
function mergeStaticParts(group){
  const batches=new Map();
  for(const child of [...group.children]){
    if(!child.isMesh||child.isInstancedMesh||child.userData.wingSide)continue;
    const batch=batches.get(child.material)||[];batch.push(child);batches.set(child.material,batch);
  }
  for(const [material,meshes] of batches){
    if(meshes.length<2)continue;
    const copies=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);return g});
    const geometry=new THREE.BufferGeometry();
    for(const key of ['position','normal','uv']){
      const width=copies[0].attributes[key].itemSize;
      const arrays=copies.map(g=>g.attributes[key].array),length=arrays.reduce((n,a)=>n+a.length,0),merged=new Float32Array(length);
      let offset=0;for(const a of arrays){merged.set(a,offset);offset+=a.length}
      geometry.setAttribute(key,new THREE.BufferAttribute(merged,width));
    }
    copies.forEach(g=>g.dispose());
    for(const mesh of meshes){group.remove(mesh);if(!mesh.geometry.userData.sharedResource)mesh.geometry.dispose()}
    geometry.computeBoundingSphere();group.add(new THREE.Mesh(geometry,material));
  }
}
export function createFishModel({speciesId,bossId,color,specialId,size}){
  const species=bossId?({magma:'stingray',void:'eel',reactor:'reefshark',glacier:'seaturtle',leviathan:'orca'}[bossId]||'orca'):speciesId;
  const tint=specialId||bossId?color:(palette[species]||color);
  const mat=new THREE.MeshStandardMaterial({color:tint,metalness:species==='orca'?.12:.3,roughness:.34,emissive:tint,emissiveIntensity:specialId?.28:bossId?.12:.025});
  const belly=new THREE.MeshStandardMaterial({color:species==='orca'?0xeafaff:new THREE.Color(tint).lerp(new THREE.Color(0xe0f5e7),.65),roughness:.5});
  const group=new THREE.Group(),tail=new THREE.Group();group.add(tail);tail.position.x=-.78;
  const ray=species==='stingray'||species==='ray',eel=species==='eel'||species==='frost',turtle=species==='seaturtle',puffer=species==='puffer';
  const length=eel?1.42:species==='marlin'?1.16:species==='orca'?1.2:1;
  const height=ray?.12:puffer?.57:turtle?.38:.39;
  ellipsoid(group,mat,[length,height,ray?.52:puffer?.46:.32]);
  ellipsoid(group,belly,[length*.87,height*.65,ray?.46:.28],[.07,-height*.36,0]);
  const tailMesh=fin(tail,mat,[[0,0],[-.55,.44],[-.42,0],[-.55,-.44]]);
  if(turtle){tailMesh.visible=false;for(const side of [-1,1]){const flipper=ellipsoid(group,mat,[.44,.075,.16],[.18,-.04,side*.49]);flipper.rotation.y=side*.45;}}
  else if(ray){tailMesh.scale.set(.5,.4,1);for(const side of [-1,1]){const wing=fin(group,mat,[[.55,0],[-.22,.86],[-.7,0]]);wing.rotation.x=side*Math.PI/2;wing.position.z=side*.1;wing.userData.wingSide=side;}}
  else if(!eel&&!puffer){fin(group,mat,[[-.4,.26],[.0,.79],[.24,.30]]);for(const side of [-1,1]){const flipper=fin(group,mat,[[.18,0],[-.3,-.36],[-.34,0]]);flipper.position.z=side*.27;flipper.rotation.x=side*.38;}}
  if(species==='marlin'){ellipsoid(group,mat,[.66,.035,.035],[1.43,.08,0]);}
  if(species==='clownfish'){
    for(const x of [-.45,.14,.59]){const stripe=new THREE.Mesh(new THREE.TorusGeometry(1,.12,4,20),white);stripe.rotation.y=Math.PI/2;stripe.scale.set(.31,.39,.31);stripe.position.x=x;group.add(stripe);}
  }
  if(puffer){
    const spikes=new THREE.InstancedMesh(new THREE.ConeGeometry(.05,.18,4),mat,24),m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
    for(let i=0;i<24;i++){const y=1-2*(i+.5)/24,a=i*2.39996,r=Math.sqrt(1-y*y),n=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);q.setFromUnitVectors(up,n);m.compose(n.clone().multiply(new THREE.Vector3(1.03,.61,.50)),q,new THREE.Vector3(1,1,1));spikes.setMatrixAt(i,m);}group.add(spikes);
  }
  if(turtle){
    const shell=ellipsoid(group,mat,[.8,.36,.41],[-.15,.12,0]);shell.material.roughness=.7;
    const bands=new THREE.InstancedMesh(new THREE.TorusGeometry(.48,.016,4,16),belly,3),matrix=new THREE.Matrix4();
    for(let i=0;i<3;i++){matrix.makeRotationY(Math.PI/2);matrix.setPosition(-.45+i*.3,.12,0);bands.setMatrixAt(i,matrix);}group.add(bands);
  }
  for(const side of [-1,1]){ellipsoid(group,white,[.105,.105,.06],[length*.66,height*.23,side*.285],pupilGeo);ellipsoid(group,black,[.053,.065,.03],[length*.69,height*.24,side*.337],pupilGeo);}
  if(species==='angler'){const lure=ellipsoid(group,white,[.075,.075,.075],[.7,.9,0]);const stalk=fin(group,mat,[[.4,.3],[.49,.88],[.7,.9],[.57,.75]]);lure.material= new THREE.MeshBasicMaterial({color:0x83ffff});stalk.scale.z=.5;}
  mergeStaticParts(group);
  group.scale.setScalar(bossId?2.65:size);
  group.userData.tail=tail;group.userData.modelSpecies=species;
  return group;
}
export function animateFishModel(group,time){
  const model=group.userData.model3d;if(!model)return;
  const phase=group.userData.phase||0;
  model.userData.tail.rotation.y=Math.sin(time*5+phase)*.32;
  model.traverse(o=>{if(o.userData.wingSide)o.rotation.z=Math.sin(time*2.4+phase)*.12*o.userData.wingSide;});
}
