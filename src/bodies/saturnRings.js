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
    uniforms:{ uTime:{value:0}, uBrightness:{value:1.0} },
    vertexShader:`
      varying vec2 vUv; varying vec3 vPos;
      void main(){ vUv=uv; vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      varying vec2 vUv; varying vec3 vPos; uniform float uTime; uniform float uBrightness;
      // hash for particle scatter
      float h(float x){ return fract(sin(x*4217.31)*43758.5453); }
      void main(){
        float u = vUv.x; // 0 内 -> 1 外
        // 颜色渐变：内淡黄 -> 中浅棕 -> 外淡蓝灰
        vec3 cIn  = vec3(0.85,0.78,0.55);
        vec3 cMid = vec3(0.72,0.60,0.42);
        vec3 cOut = vec3(0.62,0.66,0.72);
        vec3 col = mix(cIn, cMid, smoothstep(0.0,0.45,u));
        col = mix(col, cOut, smoothstep(0.5,1.0,u));
        // 多层环密度
        float dens = 0.6;
        dens *= smoothstep(0.0,0.05,u);          // 内缘淡入
        dens *= 1.0 - smoothstep(0.95,1.0,u);    // 外缘淡出
        // 卡西尼缝
        float cassini = smoothstep(0.55,0.6,u) - smoothstep(0.6,0.65,u);
        dens *= 1.0 - cassini*0.9;
        // 次级缝
        float gap2 = smoothstep(0.30,0.32,u) - smoothstep(0.32,0.34,u);
        dens *= 1.0 - gap2*0.6;
        // 环状条纹
        float bands = 0.7 + 0.3*sin(u*120.0);
        dens *= 0.7 + 0.3*bands;
        // 粒子散射：discard 部分像素
        float scatter = h(u*1000.0 + fract(uTime*0.1));
        if(scatter < 0.12) discard;
        // 边缘菲涅尔
        float alpha = dens * 0.9;
        gl_FragColor = vec4(col*uBrightness, alpha);
      }`,
    transparent:true, side:THREE.DoubleSide, depthWrite:false,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI/2 - 0.15;
  return ring;
}
