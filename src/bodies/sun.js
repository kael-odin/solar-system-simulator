// src/bodies/sun.js — 太阳：沸腾等离子体 + 3层光晕 + 黑子 + 太阳风粒子
import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/noise.glsl.js';
import { getQuality } from '../quality.js';

// 镜头引用，由 main.js 注入，用于光晕朝向衰减
let _camera = null;
export function setSunCamera(cam){ _camera = cam; }

const VERT = /* glsl */`
varying vec3 vNormal; varying vec3 vObjPos;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vObjPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

const FRAG = /* glsl */`
varying vec3 vNormal; varying vec3 vObjPos;
uniform float uTime; uniform float uBrightness;

// 沸腾等离子体：多层噪声 + 时间演化 + 涡流
vec3 plasmaColor(vec3 p){
  vec2 uv = sphereUV(normalize(vObjPos));
  // 大尺度背景
  float base = fbm2(uv*3.0 + vec2(uTime*0.03, uTime*0.02), 5, 2.0, 0.5);
  // 中尺度湍流
  float turb = turbulence(uv*8.0 + vec2(uTime*0.05, -uTime*0.04), 5);
  // 高频细节
  float fine = vnoise2(uv*22.0 + vec2(uTime*0.1, uTime*0.08));
  // 太阳黑子：缓慢移动的暗斑
  vec2 spotUV = uv + vec2(uTime*0.01, 0.0);
  vec2 vor = voronoi2(spotUV*4.0);
  float spot = smoothstep(0.06, 0.02, vor.x); // 离胞中心近 = 暗斑

  float v = base*0.5 + turb*0.3 + fine*0.15;
  v = clamp(v*1.4, 0.0, 1.0);

  // 色彩：深橙 → 亮黄 → 白热
  vec3 cDark   = vec3(0.55, 0.10, 0.02);
  vec3 cMid    = vec3(1.0, 0.45, 0.08);
  vec3 cHot    = vec3(1.0, 0.85, 0.45);
  vec3 cWhite  = vec3(1.0, 0.95, 0.75);
  vec3 col = mix(cDark, cMid, smoothstep(0.2,0.5,v));
  col = mix(col, cHot, smoothstep(0.5,0.75,v));
  col = mix(col, cWhite, smoothstep(0.78,0.95,v));
  // 黑子
  col = mix(col, vec3(0.12,0.04,0.02), spot*0.8);
  return col * (1.2 + v*0.8);
}

void main(){
  vec3 col = plasmaColor(normalize(vObjPos));
  // 边缘加亮（日冕感）
  float rim = 1.0 - max(dot(normalize(vNormal), vec3(0,0,1)), 0.0);
  col += vec3(1.0, 0.6, 0.2) * pow(rim, 2.0) * 0.4;
  gl_FragColor = vec4(col * uBrightness, 1.0);
}
`;

// 镜头光晕纹理：十字光芒 + 中心辉光
function makeFlareTexture(){
  const s = 256, c = document.createElement('canvas'); c.width=c.height=s;
  const ctx = c.getContext('2d');
  const cx=s/2, cy=s/2;
  // 中心辉光
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,s*0.18);
  g.addColorStop(0,'rgba(255,240,200,0.9)');
  g.addColorStop(1,'rgba(255,200,120,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,s,s);
  // 十字光芒
  ctx.globalCompositeOperation='lighter';
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.atan2(dy,dx));
    const grad = ctx.createLinearGradient(-s*0.5,0,s*0.5,0);
    grad.addColorStop(0,'rgba(255,220,150,0)');
    grad.addColorStop(0.5,'rgba(255,235,180,0.5)');
    grad.addColorStop(1,'rgba(255,220,150,0)');
    ctx.fillStyle=grad; ctx.fillRect(-s*0.5,-1.5,s,3);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 光晕 Sprite 纹理（程序化径向渐变）
function makeGlowTexture(){
  const s = 256, c = document.createElement('canvas'); c.width=c.height=s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s/2,s/2,0, s/2,s/2,s/2);
  g.addColorStop(0, 'rgba(255,230,150,1)');
  g.addColorStop(0.2,'rgba(255,180,60,0.7)');
  g.addColorStop(0.5,'rgba(255,120,30,0.25)');
  g.addColorStop(1,  'rgba(255,80,20,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,s,s);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function makeOuterGlowTexture(){
  const s = 256, c = document.createElement('canvas'); c.width=c.height=s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s/2,s/2,0, s/2,s/2,s/2);
  g.addColorStop(0,  'rgba(255,200,120,0.5)');
  g.addColorStop(0.4,'rgba(255,140,70,0.18)');
  g.addColorStop(0.8,'rgba(200,100,180,0.06)');
  g.addColorStop(1,  'rgba(120,80,200,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,s,s);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 太阳风粒子
function makeSolarWind(){
  const N = 600;
  const pos = new Float32Array(N*3);
  const life = new Float32Array(N);
  for(let i=0;i<N;i++){
    // 随机球面方向出发
    const u = Math.random(), v = Math.random();
    const th = u*Math.PI*2, ph = Math.acos(2*v-1);
    const r = 1.0;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);
    pos[i*3+1]=r*Math.sin(ph)*Math.sin(th);
    pos[i*3+2]=r*Math.cos(ph);
    life[i]=Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('aLife', new THREE.BufferAttribute(life,1));
  const m = new THREE.PointsMaterial({
    color:0xffcc66, size:0.06, transparent:true, opacity:0.8,
    blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true,
  });
  const pts = new THREE.Points(g, m);
  pts.userData = { N, pos, life };
  return pts;
}

export function createSun(){
  const group = new THREE.Group();
  const radius = 3.0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime:{value:0}, uBrightness:{value:1.0} },
    vertexShader: VERT, fragmentShader: NOISE_GLSL + FRAG,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, getQuality().sphereSeg, getQuality().sphereSeg), mat);
  mesh.userData.bodyId = 'sun';
  group.add(mesh);

  // 光晕 Sprite
  const tex = makeGlowTexture();
  const tex2 = makeOuterGlowTexture();
  const inner = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  inner.scale.set(radius*4, radius*4, 1); group.add(inner);
  const outer = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex2, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  outer.scale.set(radius*8, radius*8, 1); group.add(outer);
  const diffuse = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex2, transparent:true, opacity:0.4, blending:THREE.AdditiveBlending, depthWrite:false }));
  diffuse.scale.set(radius*14, radius*14, 1); group.add(diffuse);

  const wind = makeSolarWind(); group.add(wind);

  // 体积感日冕：反向法线半透明球壳，任意角度有厚度
  const coronaGeo = new THREE.SphereGeometry(radius*1.35, 48, 48);
  const coronaMat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uBrightness:{value:1.0} },
    vertexShader:`varying vec3 vN; varying vec3 vP;
      void main(){ vN=normalize(normalMatrix*normal); vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: NOISE_GLSL + `
      varying vec3 vN; varying vec3 vP; uniform float uTime; uniform float uBrightness;
      void main(){
        float rim = 1.0 - max(dot(normalize(vN), vec3(0,0,1)), 0.0);
        float f = pow(rim, 2.2);
        // 日冕丝缕：沿球面流动的噪声
        vec2 uv = sphereUV(normalize(vP));
        float strands = fbm2(uv*6.0 + vec2(uTime*0.05, -uTime*0.03), 5, 2.0, 0.55);
        strands = pow(strands, 1.5);
        vec3 col = mix(vec3(1.0,0.55,0.15), vec3(1.0,0.85,0.5), strands);
        float alpha = f*0.55 + strands*f*0.4;
        gl_FragColor = vec4(col*uBrightness, alpha);
      }`,
    transparent:true, side:THREE.BackSide, blending:THREE.AdditiveBlending, depthWrite:false,
  });
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  group.add(corona);

  // 镜头光晕：十字光芒 sprite（程序化纹理）
  const flareTex = makeFlareTexture();
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map:flareTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.6 }));
  flare.scale.set(radius*10, radius*10, 1);
  group.add(flare);

  return {
    group, mesh, data:{ renderRadius:radius, id:'sun' },
    update(t, dt){
      mat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      // 粒子向外飘散 + 循环
      const ud = wind.userData; const p = ud.pos; const L = ud.life;
      for(let i=0;i<ud.N;i++){
        L[i] += dt*0.5;
        const r = radius + L[i]*4.0;
        const ux = p[i*3], uy=p[i*3+1], uz=p[i*3+2];
        const len = Math.hypot(ux,uy,uz)||1;
        p[i*3]=ux/len*r; p[i*3+1]=uy/len*r; p[i*3+2]=uz/len*r;
        if(L[i]>1.0){ L[i]=0; }
      }
      wind.geometry.attributes.position.needsUpdate = true;
      // 光晕微脉动
      const pulse = 1 + Math.sin(t*0.5)*0.03;
      inner.scale.set(radius*4*pulse, radius*4*pulse,1);
      // 镜头光晕：相机越正对太阳越亮
      if(_camera){
        const sunPos = new THREE.Vector3(); group.getWorldPosition(sunPos);
        const dir = sunPos.clone().sub(_camera.position).normalize();
        const camFwd = new THREE.Vector3(); _camera.getWorldDirection(camFwd);
        const facing = Math.max(0, dir.dot(camFwd));
        flare.material.opacity = 0.15 + facing*facing*0.7;
        const fs = radius*(8 + facing*4);
        flare.scale.set(fs,fs,1);
      }
    },
  };
}
