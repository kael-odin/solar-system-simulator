// src/bodies/belts.js — 小行星带(300+) + 柯伊伯带 + 命名小行星(Vesta/Pallas)
import * as THREE from 'three';
import { NAMED_ASTEROIDS } from '../data/bodies.js';

// 不规则小行星：对球体顶点随机扰动
function makeAsteroidGeo(radius, seed){
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  // 简单确定性扰动：基于 seed
  let s = seed;
  const rnd = ()=>{ s = (s*9301+49297)%233280; return s/233280; };
  for(let i=0;i<pos.count;i++){
    const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);
    const len=Math.hypot(px,py,pz)||1;
    const d = 0.7 + rnd()*0.5; // 不规则
    pos.setXYZ(i, px/len*radius*d, py/len*radius*d, pz/len*radius*d);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeAsteroidMaterial(){
  // 简单灰岩色，带顶点色变化
  return new THREE.MeshStandardMaterial({ color:0x8a7a6a, roughness:0.95, metalness:0.0, flatShading:true });
}

export function createAsteroidBelt(){
  const group = new THREE.Group();
  const N = 320;
  const mat = makeAsteroidMaterial();
  const instanced = new THREE.InstancedMesh(makeAsteroidGeo(0.12, 1), mat, N);
  const dummy = new THREE.Object3D();
  const data = [];
  for(let i=0;i<N;i++){
    const a = Math.random()*Math.PI*2;
    const r = 36 + Math.random()*8; // 火星(34)与木星(50)之间
    const incl = (Math.random()-0.5)*0.5;   // 倾角
    const ecc = 1 + (Math.random()-0.5)*0.1; // 偏心率
    const scale = 0.3 + Math.random()*1.5;
    const rotSpd = (Math.random()-0.5)*2;
    const orbitSpd = 0.08 + Math.random()*0.05;
    data.push({ a,r,incl,ecc,scale,rotSpd,orbitSpd, phase:Math.random()*Math.PI*2 });
    dummy.position.set(Math.cos(a)*r, Math.sin(a)*incl*r, Math.sin(a)*r);
    dummy.scale.setScalar(scale);
    dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;
  group.add(instanced);

  // 命名大行星：Vesta, Pallas（独立 mesh，带 userData）
  const named = [];
  for(const na of NAMED_ASTEROIDS){
    const g = makeAsteroidGeo(na.id==='vesta'?0.9:0.5, na.id.length*7+1);
    // Vesta 略扁
    if(na.id==='vesta') g.scale(1,0.85,1);
    const m = new THREE.MeshStandardMaterial({ color: na.id==='vesta'?0xb0a090:0x6a5a4a, roughness:0.9, flatShading:true });
    const mesh = new THREE.Mesh(g,m);
    mesh.userData = { bodyId: na.id, isNamed:true, orbitR: 38+Math.random()*4, phase:Math.random()*Math.PI*2, speed:0.1, incl:(Math.random()-0.5)*0.3 };
    named.push(mesh); group.add(mesh);
  }

  group.userData = { instanced, data, named };
  return group;
}

export function updateAsteroidBelt(group, t){
  const ud = group.userData; if(!ud) return;
  const dummy = new THREE.Object3D();
  for(let i=0;i<ud.data.length;i++){
    const d = ud.data[i];
    const ang = d.a + t*d.orbitSpd;
    const rr = d.r * d.ecc;
    dummy.position.set(Math.cos(ang)*rr, Math.sin(ang)*d.incl*rr, Math.sin(ang)*rr);
    dummy.scale.setScalar(d.scale);
    dummy.rotation.set(ang*0.5, t*d.rotSpd, ang*0.3);
    dummy.updateMatrix();
    ud.instanced.setMatrixAt(i, dummy.matrix);
  }
  ud.instanced.instanceMatrix.needsUpdate = true;
  for(const m of ud.named){
    const ang = m.userData.phase + t*m.userData.speed;
    const rr = m.userData.orbitR;
    m.position.set(Math.cos(ang)*rr, Math.sin(ang)*m.userData.incl*rr, Math.sin(ang)*rr);
    m.rotation.y = t*0.5;
  }
}

export function createKuiperBelt(){
  const N = 2000;
  const pos = new Float32Array(N*3);
  const col = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const a = Math.random()*Math.PI*2;
    const r = 95 + Math.random()*25; // 海王星(92)外
    const incl = (Math.random()-0.5)*0.6;
    pos[i*3]=Math.cos(a)*r;
    pos[i*3+1]=Math.sin(a)*incl*0.5;
    pos[i*3+2]=Math.sin(a)*r;
    const tint = Math.random();
    col[i*3]=0.7+tint*0.3; col[i*3+1]=0.8+tint*0.2; col[i*3+2]=0.9+tint*0.1;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({ size:0.6, vertexColors:true, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false });
  const pts = new THREE.Points(g,m);
  pts.userData = { N, pos, basePos: pos.slice() };
  return pts;
}

export function updateKuiperBelt(pts, t){
  // 缓慢绕转
  pts.rotation.y = t*0.01;
}

export function createOortCloud(){
  // 在 background.js 中已建。这里返回空组以兼容。
  return new THREE.Group();
}
