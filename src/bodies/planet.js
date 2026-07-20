// src/bodies/planet.js — 行星工厂：按 id 选用着色器，统一返回 {group,mesh,data,update}
import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/noise.glsl.js';
import { getQuality } from '../quality.js';
import { applyScaleMode } from '../scalemode.js';

const VERT = /* glsl */`
varying vec3 vNormal; varying vec3 vObjPos; varying vec3 vWorldPos;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const HEAD = /* glsl */`
varying vec3 vNormal; varying vec3 vObjPos; varying vec3 vWorldPos;
uniform float uTime; uniform vec3 uLightDir; uniform float uBrightness;
float lambert(vec3 n, vec3 l){ return max(dot(normalize(n),normalize(l)),0.0); }
float term(vec3 n, vec3 l){ return smoothstep(-0.15,0.25,dot(normalize(n),normalize(l))); }
`;

function lightDirFrom(group){
  // 太阳在原点：光方向 = 从天体指向太阳
  const wp = new THREE.Vector3(); group.getWorldPosition(wp);
  return wp.clone().negate().normalize();
}

// 体积感大气壳：反向法线 + 噪声厚度，比纯菲涅尔更有体积感
function makeAtmosphere(radius, color, opacity=0.35, power=3.0){
  const geo = new THREE.SphereGeometry(radius*1.12, 48, 48);
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uColor:{value:new THREE.Color(color)}, uOpacity:{value:opacity}, uPower:{value:power}, uTime:{value:0} },
    vertexShader:`varying vec3 vN; varying vec3 vP;
      void main(){ vN=normalize(normalMatrix*normal); vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: NOISE_GLSL + `
      varying vec3 vN; varying vec3 vP; uniform vec3 uColor; uniform float uOpacity; uniform float uPower; uniform float uTime;
      void main(){
        float rim = 1.0 - max(dot(normalize(vN), vec3(0,0,1)), 0.0);
        float f = pow(rim, uPower);
        // 大气流动：薄云丝缕，边缘更明显
        vec2 uv = sphereUV(normalize(vP));
        float flow = fbm2(uv*4.0 + vec2(uTime*0.02, 0.0), 4, 2.0, 0.5);
        float alpha = f*uOpacity + flow*f*0.25;
        gl_FragColor = vec4(uColor, alpha);
      }`,
    transparent:true, side:THREE.BackSide, blending:THREE.AdditiveBlending, depthWrite:false,
  });
  return new THREE.Mesh(geo, mat);
}

// ---------- 着色器 ----------
const SHADERS = {
  mercury: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float c = craters(uv, 28.0);
    float base = fbm2(uv*4.0, 4, 2.0, 0.5)*0.3+0.6;
    float v = mix(base, c, 0.6);
    vec3 col = vec3(0.62,0.58,0.54) * v;
    float L = term(vNormal, uLightDir);
    col *= 0.15 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  venus: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    // 浓厚云带：湍流 + 横向带
    float bands = sin(uv.y*8.0 + fbm2(uv*3.0,4,2.0,0.5)*3.0 + uTime*0.02)*0.5+0.5;
    float turb = turbulence(uv*6.0 + vec2(uTime*0.03, 0.0), 5);
    float cloud = mix(bands, turb, 0.5);
    vec3 base = vec3(0.85,0.70,0.40);
    vec3 dark = vec3(0.55,0.40,0.20);
    vec3 col = mix(dark, base, cloud);
    col += vec3(0.1,0.06,0.02)*fbm2(uv*2.0,3,2.0,0.5); // 明暗变化
    float L = term(vNormal, uLightDir);
    col *= 0.25 + L*0.85;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  earth: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = warpedFbm(uv*3.0);
    float sea = 0.52;
    float isSea = step(n, sea);
    // 大陆：绿/棕，破碎边缘由 warpedFbm 保证
    float biome = fbm2(uv*6.0,4,2.0,0.5);
    vec3 ocean = vec3(0.04,0.18,0.45);
    vec3 land = mix(vec3(0.20,0.45,0.12), vec3(0.45,0.35,0.18), biome);
    vec3 col = mix(land, ocean, isSea);
    // 海洋镜面高光（阳光海面闪烁）
    float spec = 0.0;
    if(isSea>0.5){
      spec = pow(max(dot(normalize(vNormal),normalize(uLightDir)),0.0),80.0)*0.6;
    }
    // 夜灯（夜面城市灯光）
    float night = 1.0 - term(vNormal, uLightDir);
    if(isSea<0.5){
      float city = step(0.6, fbm2(uv*12.0,4,2.0,0.5));
      col += vec3(1.0,0.8,0.4)*city*night*0.8;
    }
    float L = term(vNormal, uLightDir);
    col *= 0.12 + L*0.95;
    col += vec3(1.0,0.95,0.8)*spec*0.3;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  mars: /* glsl */`
  void main(){
    vec2 uv = sphereUV(normalize(vObjPos));
    float n = warpedFbm(uv*3.0);
    float ridge = ridged(uv*8.0, 4); // 峡谷/火山
    vec3 base = vec3(0.55,0.27,0.12);
    vec3 dark = vec3(0.30,0.12,0.08); // 玄武岩
    vec3 col = mix(base, dark, smoothstep(0.4,0.6,n));
    col = mix(col, vec3(0.7,0.4,0.2), ridge*0.3);
    // 极地冰盖
    float lat = abs(normalize(vObjPos).y);
    float ice = smoothstep(0.75,0.9,lat);
    col = mix(col, vec3(0.95,0.95,0.98), ice);
    float L = term(vNormal, uLightDir);
    col *= 0.1 + L*0.95;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  jupiter: /* glsl */`
  // 多层拉伸噪声条带 + 大红斑 + 小涡旋
  void main(){
    vec3 sp = normalize(vObjPos);
    vec2 uv = sphereUV(sp);
    float lat = sp.y;
    // 条带
    float band = sin(lat*18.0 + fbm2(vec2(uTime*0.02, lat*4.0),4,2.0,0.5)*4.0);
    float warp = turbulence(vec2(uTime*0.03+uv.x*8.0, uv.y*3.0), 5);
    float t = band*0.5+0.5;
    vec3 cOrange = vec3(0.85,0.55,0.25);
    vec3 cRed    = vec3(0.70,0.30,0.15);
    vec3 cCream  = vec3(0.92,0.85,0.72);
    vec3 cBrown  = vec3(0.55,0.35,0.20);
    vec3 col = mix(cOrange, cCream, smoothstep(0.45,0.6,t));
    col = mix(col, cBrown, smoothstep(0.3,0.45,t));
    col = mix(col, cRed, smoothstep(0.6,0.78,t));
    col = mix(col, vec3(warp*0.15), 0.2);
    // 大红斑：赤道附近椭圆涡旋
    vec2 rsp = vec2(sp.x, sp.y*1.6); // 椭圆
    float dr = rsp.x*0.6 + rsp.y*0.8; // 椭圆距离修正
    vec2 center = vec2(0.0, -0.25);
    float d = length(vec2(sp.x*1.3, (sp.y+0.25)*1.8));
    // 螺旋边缘
    float ang = atan(sp.y+0.25, sp.x);
    float spiral = sin(d*20.0 - ang*6.0 + uTime*0.5);
    float spot = smoothstep(0.32,0.18,d);
    vec3 redSpot = mix(vec3(0.55,0.10,0.05), vec3(0.85,0.35,0.25), spiral*0.5+0.5);
    col = mix(col, redSpot, spot*0.85);
    // 小白斑
    float w1 = smoothstep(0.10,0.04,length(vec2(sp.x*1.5,(sp.y-0.4)*1.2)));
    float w2 = smoothstep(0.08,0.03,length(vec2(sp.x*1.5-0.5,(sp.y+0.5)*1.2)));
    float w3 = smoothstep(0.08,0.03,length(vec2(sp.x*1.5+0.6,(sp.y+0.2)*1.4)));
    col = mix(col, vec3(0.98,0.95,0.9), max(max(w1,w2),w3)*0.7);
    float L = term(vNormal, uLightDir);
    col *= 0.12 + L*0.95;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  saturn: /* glsl */`
  void main(){
    vec3 sp = normalize(vObjPos);
    float lat = sp.y;
    float band = sin(lat*12.0 + fbm2(vec2(0.0,lat*3.0),3,2.0,0.5)*2.0);
    float t = band*0.5+0.5;
    vec3 col = mix(vec3(0.80,0.72,0.55), vec3(0.92,0.86,0.70), t);
    col += vec3(0.05,0.04,0.02)*turbulence(vec2(sp.x*4.0, lat*8.0),4)*0.5;
    float L = term(vNormal, uLightDir);
    col *= 0.15 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  uranus: /* glsl */`
  void main(){
    vec3 sp = normalize(vObjPos);
    float band = sin(sp.y*8.0)*0.1+0.9;
    float n = fbm2(sphereUV(sp)*4.0,4,2.0,0.5);
    vec3 col = vec3(0.55,0.82,0.82) * band;
    col = mix(col, vec3(0.45,0.72,0.78), n*0.3);
    float L = term(vNormal, uLightDir);
    col *= 0.2 + L*0.9;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,

  neptune: /* glsl */`
  void main(){
    vec3 sp = normalize(vObjPos);
    float n = fbm2(sphereUV(sp)*5.0 + vec2(uTime*0.02,0.0),5,2.0,0.5);
    vec3 col = mix(vec3(0.10,0.25,0.65), vec3(0.20,0.40,0.85), n);
    // 大暗斑
    float d = length(vec2(sp.x*1.4, (sp.y-0.3)*1.6));
    float spot = smoothstep(0.28,0.12,d);
    col = mix(col, vec3(0.04,0.10,0.30), spot*0.7);
    float L = term(vNormal, uLightDir);
    col *= 0.15 + L*0.92;
    gl_FragColor=vec4(col*uBrightness,1.0);
  }`,
};

const ATMOSPHERES = {
  venus: { color:0xddc888, opacity:0.4, power:3.0 },
  earth: { color:0x6fa8ff, opacity:0.35, power:3.5 },
  mars:  { color:0xd8a080, opacity:0.25, power:3.0 },
};

export function createPlanet(data){
  data = applyScaleMode(data);
  const group = new THREE.Group();
  const r = data.renderRadius;
  const frag = SHADERS[data.id];
  const seg = getQuality().sphereSeg;
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uLightDir:{value:new THREE.Vector3(1,0,0)}, uBrightness:{value:1.0} },
    vertexShader: VERT, fragmentShader: NOISE_GLSL + HEAD + frag,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
  mesh.userData.bodyId = data.id;
  const Q = getQuality();
  if(Q.shadows){
    mesh.castShadow = true; mesh.receiveShadow = true;
  }
  // 天王星 98° 倾角
  if(data.axialTilt) mesh.rotation.z = data.axialTilt;
  group.add(mesh);

  let atmosphere = null;
  const atm = ATMOSPHERES[data.id];
  if(atm){
    atmosphere = makeAtmosphere(r, atm.color, atm.opacity, atm.power);
    group.add(atmosphere);
  }

  // 地球：独立云层球壳，慢速旋转飘过地表
  let cloudMesh = null;
  if(data.id==='earth'){
    const cloudMat = new THREE.ShaderMaterial({
      uniforms:{ uTime:{value:0}, uLightDir:{value:new THREE.Vector3(1,0,0)}, uBrightness:{value:1.0} },
      vertexShader: VERT,
      fragmentShader: NOISE_GLSL + HEAD + `
        void main(){
          vec2 uv = sphereUV(normalize(vObjPos));
          float c = fbm2(uv*5.0 + vec2(uTime*0.03, uTime*0.01), 6, 2.0, 0.55);
          c = smoothstep(0.48, 0.82, c);
          float L = term(vNormal, uLightDir);
          // 云在夜面变暗但仍可见微光
          vec3 col = vec3(0.95) * (0.25 + L*0.85);
          gl_FragColor = vec4(col*uBrightness, c*0.85);
        }`,
      transparent:true, depthWrite:false,
    });
    cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(r*1.02, seg, seg), cloudMat);
    group.add(cloudMesh);
  }

  // 天王星细环
  if(data.id==='uranus'){
    const ringGeo = new THREE.RingGeometry(r*1.6, r*1.9, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color:0x4a7a80, transparent:true, opacity:0.25, side:THREE.DoubleSide, depthWrite:false });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI/2; ring.rotation.z = data.axialTilt||0;
    group.add(ring);
  }
  // 海王星细环
  if(data.id==='neptune'){
    const ringGeo = new THREE.RingGeometry(r*1.7, r*1.9, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color:0x3a4a8a, transparent:true, opacity:0.18, side:THREE.DoubleSide, depthWrite:false });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI/2;
    group.add(ring);
  }
  // 土星环阴影：在土星表面投下的暗化环（ShaderMaterial 无法 receiveShadow 的务实替代）
  if(data.id==='saturn'){
    const shadowGeo = new THREE.RingGeometry(r*1.4, r*2.4, 96);
    const shadowMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.35, side:THREE.DoubleSide, blending:THREE.MultiplyBlending, depthWrite:false });
    const shadowRing = new THREE.Mesh(shadowGeo, shadowMat);
    shadowRing.rotation.x = Math.PI/2 - 0.15;
    shadowRing.position.y = 0.01; // 略浮于土星表面
    group.add(shadowRing);
  }

  return {
    group, mesh, data, atmosphere,
    update(t, dt){
      mat.uniforms.uTime.value = t;
      if(atmosphere) atmosphere.material.uniforms.uTime.value = t;
      if(cloudMesh){
        cloudMesh.material.uniforms.uTime.value = t;
        cloudMesh.rotation.y = t * 0.04; // 云独立慢转
        cloudMesh.material.uniforms.uLightDir.value.copy(mat.uniforms.uLightDir.value);
      }
      const ld = lightDirFrom(group);
      mat.uniforms.uLightDir.value.copy(ld);
    },
  };
}
