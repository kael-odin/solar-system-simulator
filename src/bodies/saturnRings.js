// src/bodies/saturnRings.js — 土星环：多层半透明 + 卡西尼缝 + discard 粒子散射 + 内外色彩渐变
import * as THREE from 'three';
import { isRealScale } from '../scalemode.js';

export function createSaturnRings(planetRadius){
  // 真实尺度下距离被对数压扁，环按观感倍率会切到邻星轨道，收紧环径比。
  const k = isRealScale() ? { inner:1.25, outer:1.75 } : { inner:1.4, outer:2.4 };
  const innerR = planetRadius * k.inner;
  const outerR = planetRadius * k.outer;
  const geo = new THREE.RingGeometry(innerR, outerR, 128, 8);
  // 修正 UV：默认 RingGeometry 的 uv 不便按径向计算，自定义 attribute
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), y=pos.getY(i);
    const r = Math.hypot(x,y);
    uv.setXY(i, (r-innerR)/(outerR-innerR), 0);
  }
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uBrightness:{value:1.0}, uSaturnRadius:{value:planetRadius} },
    vertexShader:`
      varying vec2 vUv; varying vec3 vPos; varying vec3 vWorldPos;
      void main(){
        vUv=uv; vPos=position;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader:`
      varying vec2 vUv; varying vec3 vPos; varying vec3 vWorldPos;
      uniform float uTime; uniform float uBrightness; uniform float uSaturnRadius;
      // hash for particle scatter
      float h(float x){ return fract(sin(x*4217.31)*43758.5453); }
      void main(){
        float u = vUv.x; // 0 内 -> 1 外
        // 真实土星环配色：C 环(内)暗透 → B 环亮金黄 → 卡西尼缝 → A 环浅棕 → 外缘淡灰
        vec3 cC   = vec3(0.55,0.48,0.34); // C 环：偏暗的沙色
        vec3 cB   = vec3(0.92,0.84,0.62); // B 环：最亮的金黄（最密）
        vec3 cA   = vec3(0.80,0.70,0.50); // A 环：浅棕
        vec3 cOut = vec3(0.62,0.60,0.55); // F 环外：淡灰棕
        vec3 col = mix(cC, cB, smoothstep(0.0,0.22,u));       // C→B
        col = mix(col, cA, smoothstep(0.45,0.55,u));          // B→A（跨卡西尼缝）
        col = mix(col, cOut, smoothstep(0.85,1.0,u));         // A→外缘
        // 环密度：B 环最密，内外缘淡
        float dens = 0.55;
        dens *= smoothstep(0.0,0.06,u);            // 内缘淡入
        dens *= 1.0 - smoothstep(0.93,1.0,u);      // 外缘淡出
        dens *= 1.0 + 0.5*smoothstep(0.18,0.45,u); // B 环增密
        // 卡西尼缝（B/A 之间，约 u=0.5）
        float cassini = smoothstep(0.46,0.50,u) - smoothstep(0.50,0.54,u);
        dens *= 1.0 - cassini*0.92;
        // 次级细缝
        float gap2 = smoothstep(0.30,0.315,u) - smoothstep(0.315,0.33,u);
        dens *= 1.0 - gap2*0.5;
        // 环状微粒条纹（高频，模拟粒子聚集）
        float bands = 0.6 + 0.4*sin(u*180.0);
        dens *= 0.65 + 0.35*bands;
        // 粒子散射：discard 部分像素造颗粒感
        float scatter = h(u*1000.0 + fract(uTime*0.1));
        if(scatter < 0.12) discard;
        // 光照：太阳在原点，光方向 = 环点指向太阳
        vec3 toSun = normalize(-vWorldPos);
        // 环法线（世界空间）：环倾斜 0.15rad，法线近似 (sin0.15, cos0.15, 0)
        vec3 nrm = normalize(vec3(sin(0.15), cos(0.15), 0.0));
        // 环是平面颗粒层，亮度正比于太阳穿过环平面的量 = |dot(nrm, toSun)|
        // 法线⊥太阳时环边缘对日（暗），法线∥太阳时环正对日（亮）。用绝对值让双面对称。
        float facing = abs(dot(nrm, toSun));
        float lit = mix(0.35, 1.0, facing);
        // 土星本体投在环上的阴影：背阳半圆且在土星半径内
        vec2 horiz = vec2(vWorldPos.x, vWorldPos.z);
        float radialDot = dot(normalize(horiz), normalize(toSun.xz));
        float inShadowCone = smoothstep(0.0, 0.2, -radialDot);
        float withinRadius = 1.0 - smoothstep(uSaturnRadius*0.9, uSaturnRadius*1.6, length(horiz));
        float shadow = inShadowCone * withinRadius * 0.78;
        lit *= (1.0 - shadow);
        float alpha = dens * 0.92;
        gl_FragColor = vec4(col * uBrightness * lit, alpha);
      }`,
    transparent:true, side:THREE.DoubleSide, depthWrite:false,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI/2 - 0.15;
  return ring;
}
