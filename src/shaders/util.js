// src/shaders/util.js — ShaderMaterial 构造辅助
import * as THREE from 'three';
import { NOISE_GLSL } from './noise.glsl.js';

// 行星表面通用 uniform
export function planetUniforms(opts){
  return {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(1,0,0) }, // 由 main 每帧更新指向太阳
    uBrightness: { value: 1.0 },
    ...opts,
  };
}

// 构造球面行星 ShaderMaterial
export function makePlanetMaterial({ vertex, fragment, uniforms, transparent=false }){
  return new THREE.ShaderMaterial({
    uniforms: planetUniforms(uniforms),
    vertexShader: VERTEX_HEADER + vertex,
    fragmentShader: NOISE_GLSL + FRAGMENT_HEADER + fragment,
    transparent,
  });
}

export const VERTEX_HEADER = /* glsl */`
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vObjPos;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const FRAGMENT_HEADER = /* glsl */`
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vObjPos;
uniform float uTime;
uniform vec3 uLightDir;
uniform float uBrightness;
// 基础光照：漫反射 + 软终端
float lambert(vec3 n, vec3 l){ return max(dot(normalize(n), normalize(l)), 0.0); }
float softTerminator(vec3 n, vec3 l){
  float d = dot(normalize(n), normalize(l));
  return smoothstep(-0.15, 0.25, d);
}
`;
