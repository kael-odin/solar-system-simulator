// src/bodies/dwarf.js — 冥王星(汤博区爱心) + 其他矮行星
import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/noise.glsl.js';
import { getQuality } from '../quality.js';
import { applyScaleMode } from '../scalemode.js';

const VERT = /* glsl */`
varying vec3 vNormal; varying vec3 vObjPos;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vObjPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;
const HEAD = /* glsl */`
varying vec3 vNormal; varying vec3 vObjPos;
uniform float uTime; uniform vec3 uLightDir; uniform float uBrightness;
float term(vec3 n, vec3 l){ return smoothstep(-0.15,0.25,dot(normalize(n),normalize(l))); }
`;

function lightDirFrom(group){
  const wp = new THREE.Vector3(); group.getWorldPosition(wp);
  return wp.clone().negate().normalize();
}

// 汤博区爱心形：用两个圆 + 下三角组合的 SDF
const SHADERS = {
  pluto: /* glsl */`
  // 心形 SDF (2D)
  float heart(vec2 p){
    p.x = abs(p.x);
    if(p.y+p.x>1.0){ return sqrt(dot(p-vec2(0.25,0.75),p-vec2(0.25,0.75)))-0.35; }
    vec2 q = p - vec2(0.0,1.0);
    return sqrt(min(dot(p-vec2(0.0,0.75),p-vec2(0.0,0.75)),dot(q,q)))*sign(p.x);
  }
  void main(){
    vec3 sp = normalize(vObjPos);
    vec2 uv = sphereUV(sp);
    // 汤博区：赤道附近偏一侧，用经纬坐标构造心形
    vec2 hp = vec2((uv.x-0.55)*2.0, (uv.y-0.45)*2.0); // 定位
    float h = heart(hp);
    float tombaugh = 1.0 - smoothstep(0.0, 0.08, h); // 爱心区域内=1
    // 自然过渡边缘：加噪声扰动
    float edge = fbm2(uv*20.0, 3, 2.0, 0.5);
    tombaugh *= smoothstep(0.0, 0.15, 0.15 + edge*0.15 - h);
    // 表面斑块
    float n = warpedFbm(uv*4.0);
    vec3 white = vec3(0.92,0.88,0.80);
    vec3 lbrown = vec3(0.55,0.40,0.28);
    vec3 dbrown = vec3(0.32,0.22,0.16);
    vec3 col = mix(lbrown, dbrown, smoothstep(0.4,0.65,n));
    col = mix(col, white, tombaugh*0.92);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  eris: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    vec3 col = vec3(0.90,0.92,0.95)*(0.85+n*0.15);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  makemake: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    vec3 col = vec3(0.72,0.40,0.25)*(0.8+n*0.2);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  haumea: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*5.0,4,2.0,0.5);
    vec3 col = vec3(0.75,0.78,0.80)*(0.8+n*0.2);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  gonggong: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    vec3 col = vec3(0.45,0.12,0.08)*(0.8+n*0.25);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  ceres: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float c = craters(uv, 30.0);
    float n = fbm2(uv*3.0,4,2.0,0.5);
    vec3 col = vec3(0.30,0.28,0.26)*(0.6+c*0.5+n*0.2);
    // 白色盐斑亮点
    float salt = step(0.85, fbm2(uv*12.0,4,2.0,0.5));
    col = mix(col, vec3(0.95,0.95,0.92), salt*0.85);
    float L = term(vNormal, uLightDir);
    col *= 0.08 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  quaoar: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    vec3 col = vec3(0.62,0.32,0.22)*(0.8+n*0.2);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  orcus: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    float c = craters(uv, 20.0);
    vec3 col = vec3(0.70,0.72,0.74)*(0.8+n*0.2)*c;
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  ixion: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    vec3 col = vec3(0.42,0.20,0.12)*(0.8+n*0.25);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,
};

export function createDwarf(data){
  data = applyScaleMode(data);
  const group = new THREE.Group();
  const r = data.renderRadius;
  const frag = SHADERS[data.id];
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uLightDir:{value:new THREE.Vector3(1,0,0)}, uBrightness:{value:1.0} },
    vertexShader: VERT, fragmentShader: NOISE_GLSL + HEAD + frag,
  });
  let geo = new THREE.SphereGeometry(r, getQuality().moonSeg, getQuality().moonSeg);
  // 妊神星：拉长椭球
  if(data.ellipsoid) geo.scale(2.0, 1.0, 1.0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.bodyId = data.id;
  const Q = getQuality();
  if(Q.shadows){ mesh.castShadow = true; mesh.receiveShadow = true; }
  group.add(mesh);

  return {
    group, mesh, data,
    update(t, dt){
      mat.uniforms.uTime.value = t;
      mat.uniforms.uLightDir.value.copy(lightDirFrom(group));
    },
  };
}
