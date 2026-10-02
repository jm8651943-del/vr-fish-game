import * as THREE from '/vendor/three.module.js';

export function createEnvironment(map){
  const group=new THREE.Group();
  // Caustics run in one draw call, without fullscreen post-processing in XR.
  const material=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},base:{value:new THREE.Color(map.floor)},accent:{value:new THREE.Color(map.accent)},fogColor:{value:new THREE.Color(map.fog)}},
    vertexShader:'varying vec2 uvWorld; varying float distanceFromView; void main(){uvWorld=position.xy;vec4 mv=modelViewMatrix*vec4(position,1.);distanceFromView=length(mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:`uniform float time; uniform vec3 base; uniform vec3 accent; uniform vec3 fogColor; varying vec2 uvWorld; varying float distanceFromView;
      void main(){vec2 p=uvWorld;float a=sin(p.x*1.9+sin(p.y*1.4+time*.45));float b=sin(p.y*2.2+cos(p.x*1.1-time*.35));float caustic=pow(max(0.,1.-abs(a+b)*.65),12.);float fade=exp(-length(p)*.032);vec3 lit=base*.65+accent*(.055+caustic*.16)*fade;float haze=1.-exp(-distanceFromView*.035);gl_FragColor=vec4(mix(lit,fogColor,haze),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`
  });
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,88),material);floor.rotation.x=-Math.PI/2;floor.position.set(0,-2.27,-25);group.add(floor);
  // Soft light columns; cheap geometry, restrained opacity, no camera motion.
  if(map.id!=='space'){
    const beamMaterial=new THREE.MeshBasicMaterial({color:map.accent,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    for(let i=0;i<5;i++){const beam=new THREE.Mesh(new THREE.CylinderGeometry(.15,1.7,15,8,1,true),beamMaterial);beam.position.set((i-2)*7,4,-10-i*6);beam.rotation.z=-.22;group.add(beam);}
  }
  // Fine suspended plankton instead of individual particle meshes.
  const count=180,positions=new Float32Array(count*3),origins=new Float32Array(count*3);
  for(let i=0;i<count;i++){positions[i*3]=(Math.random()-.5)*32;positions[i*3+1]=-1.8+Math.random()*10;positions[i*3+2]=-3-Math.random()*45;}
  origins.set(positions);
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const motes=new THREE.Points(pg,new THREE.PointsMaterial({color:map.accent,size:.045,transparent:true,opacity:.42,depthWrite:false}));group.add(motes);
  if(map.id==='reef'||map.id==='toxic'){
    const kelp=new THREE.InstancedMesh(new THREE.ConeGeometry(.16,1,5),new THREE.MeshStandardMaterial({color:map.id==='reef'?0x23775e:0x536c21,roughness:.72}),60);
    const dummy=new THREE.Object3D();
    for(let i=0;i<60;i++){const h=.6+Math.random()*1.8;dummy.position.set((Math.random()-.5)*22,-2.27+h*.5,-5-Math.random()*32);dummy.scale.set(1,h,1);dummy.rotation.z=(Math.random()-.5)*.4;dummy.updateMatrix();kelp.setMatrixAt(i,dummy.matrix);}group.add(kelp);
  }
  group.userData.update=time=>{material.uniforms.time.value=time;for(let i=0;i<count;i++){positions[i*3]=origins[i*3]+Math.sin(time*.3+i)*.18;positions[i*3+1]=-1.8+((origins[i*3+1]+1.8+time*.12)%10);}pg.attributes.position.needsUpdate=true;};
  return group;
}
