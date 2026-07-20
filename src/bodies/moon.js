// src/bodies/moon.js — 月球与各卫星着色器工厂
import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/noise.glsl.js';

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
  return wp.clone().negate().normalize(); // 父行星-太阳近似同向（卫星较近父行星，仍用太阳方向）
}

const SHADERS = {
  moon: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float c = craters(uv, 24.0);
    float sea = fbm2(uv*2.0, 4, 2.0, 0.5);
    float v = mix(c, sea*0.4+0.5, 0.4);
    vec3 col = mix(vec3(0.50,0.48,0.45), vec3(0.30,0.28,0.26), smoothstep(0.4,0.6,sea));
    col *= v;
    float L = term(vNormal, uLightDir);
    col *= 0.06 + L*0.95;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  io: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*5.0, 5, 2.0, 0.5);
    vec3 col = mix(vec3(0.85,0.55,0.20), vec3(1.0,0.75,0.30), n);
    // 黑色火山斑点
    float vol = step(0.8, fbm2(uv*10.0,4,2.0,0.5));
    col = mix(col, vec3(0.08,0.05,0.03), vol*0.7);
    // 绿色硫磺沉积
    float sul = step(0.7, fbm2(uv*6.0+5.0,3,2.0,0.5));
    col = mix(col, vec3(0.3,0.4,0.15), sul*0.4);
    float L = term(vNormal, uLightDir);
    col *= 0.12 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  europa: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,4,2.0,0.5);
    vec3 col = vec3(0.92,0.92,0.88) * (0.8+n*0.2);
    // 裂纹线条
    float lines = abs(sin((fbm2(uv*8.0,5,2.0,0.5))*6.28));
    float crack = smoothstep(0.95,0.98,1.0-lines) * step(0.4,fbm2(uv*3.0,3,2.0,0.5));
    col = mix(col, vec3(0.25,0.15,0.10), crack*0.8);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  ganymede: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = fbm2(uv*4.0,5,2.0,0.5);
    float grooves = abs(sin(uv.x*30.0 + n*6.0))*0.3+0.7;
    vec3 col = mix(vec3(0.55,0.50,0.45), vec3(0.35,0.32,0.28), n);
    col *= grooves;
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  callisto: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float c = craters(uv, 40.0);
    float n = fbm2(uv*3.0,4,2.0,0.5);
    vec3 col = vec3(0.35,0.32,0.28) * (0.6 + c*0.5 + n*0.2);
    float L = term(vNormal, uLightDir);
    col *= 0.08 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  titan: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float bands = turbulence(vec2(uv.x*4.0+uTime*0.01, uv.y*6.0),5);
    vec3 col = mix(vec3(0.75,0.55,0.25), vec3(0.55,0.38,0.15), bands);
    col = mix(col, vec3(0.4,0.25,0.10), smoothstep(0.5,0.8,fbm2(uv*3.0,3,2.0,0.5)));
    float L = term(vNormal, uLightDir);
    col *= 0.15 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  enceladus: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    vec3 col = vec3(0.97,0.97,0.98);
    // 南极蓝色虎纹
    float south = smoothstep(-0.5,-0.3,normalize(vObjPos).y) * (1.0-smoothstep(-0.3,0.1,normalize(vObjPos).y));
    float stripes = abs(sin(uv.x*40.0))*step(0.5,south);
    col = mix(col, vec3(0.3,0.5,0.85), stripes*0.7);
    float n = fbm2(uv*8.0,3,2.0,0.5);
    col *= 0.85+n*0.15;
    float L = term(vNormal, uLightDir);
    col *= 0.12 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  mimas: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    vec3 col = vec3(0.55,0.52,0.50);
    // 赫歇尔陨石坑：巨大凹陷
    vec3 sp = normalize(vObjPos);
    float d = length(vec2(sp.x*1.0-0.3, sp.y*1.0));
    float crater = smoothstep(0.25,0.1,d);
    col = mix(col, vec3(0.30,0.28,0.26), crater*0.8);
    col += vec3(0.1)*smoothstep(0.22,0.2,abs(d-0.22)); // 坑缘
    float L = term(vNormal, uLightDir);
    col *= 0.08 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  iapetus: /* glsl */`
  void main(){
    vec3 sp = normalize(vObjPos);
    // 双色：一侧黑一侧白
    float side = smoothstep(-0.2,0.2,sp.x);
    vec3 dark = vec3(0.15,0.10,0.08);
    vec3 lightc = vec3(0.92,0.90,0.86);
    vec3 col = mix(dark, lightc, side);
    float n = fbm2(sphereUV(sp)*5.0,3,2.0,0.5);
    col *= 0.85+n*0.15;
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,
};

function makeAtmosphere(radius, color, opacity=0.35, power=3.0){
  const geo = new THREE.SphereGeometry(radius*1.08, 32, 32);
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uColor:{value:new THREE.Color(color)}, uOpacity:{value:opacity}, uPower:{value:power} },
    vertexShader:`varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`varying vec3 vN; uniform vec3 uColor; uniform float uOpacity; uniform float uPower;
      void main(){ float r=1.0-max(dot(normalize(vN),vec3(0,0,1)),0.0); float f=pow(r,uPower); gl_FragColor=vec4(uColor,f*uOpacity); }`,
    transparent:true, side:THREE.BackSide, blending:THREE.AdditiveBlending, depthWrite:false,
  });
  return new THREE.Mesh(geo, mat);
}

export function createMoon(data){
  const group = new THREE.Group();
  const r = data.renderRadius;
  const frag = SHADERS[data.id] || SHADERS.callisto;
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uLightDir:{value:new THREE.Vector3(1,0,0)}, uBrightness:{value:1.0} },
    vertexShader: VERT, fragmentShader: NOISE_GLSL + HEAD + frag,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), mat);
  mesh.userData.bodyId = data.id;
  group.add(mesh);

  let atmosphere = null;
  if(data.id==='titan'){ atmosphere = makeAtmosphere(r, 0xcc8833, 0.35, 3.0); group.add(atmosphere); }

  return {
    group, mesh, data, atmosphere,
    update(t, dt){
      mat.uniforms.uTime.value = t;
      mat.uniforms.uLightDir.value.copy(lightDirFrom(group));
    },
  };
}
