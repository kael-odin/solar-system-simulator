// src/orbit.js — 椭圆轨道力学：开普勒近似位置 + 椭圆轨道线
import * as THREE from 'three';
import { applyScaleMode } from './scalemode.js';

// 解开普勒方程 M = E - e*sinE，牛顿迭代（偏心率不大，3-4 次足够）
function solveKepler(M, e){
  let E = M;
  for(let i=0;i<4;i++){ E = E - (E - e*Math.sin(E) - M)/(1 - e*Math.cos(E)); }
  return E;
}

// 在轨道平面（XY）内的位置；返回 {x,z}（黄道面，Y 为法向）
// a:半长轴(渲染单位), e:偏心率, M:平近点角
export function orbitPlanePos(a, e, M){
  const E = solveKepler(M, e);
  const x = a*(Math.cos(E) - e);
  const z = a*Math.sqrt(1 - e*e)*Math.sin(E);
  return { x, z };
}

// 应用轨道倾角 + 升交点经度：把轨道平面内的 (x,0,z) 转到 3D
// inclination:轨道对黄道倾角, ascendingNode:升交点经度
export function orbitToWorld(x, z, inclination, ascendingNode){
  // 先绕 Y 转 ascendingNode（升交点定向）
  const cosN=Math.cos(ascendingNode), sinN=Math.sin(ascendingNode);
  let X = x*cosN - 0*sinN;      // y=0
  let Z = x*sinN + 0*cosN;
  // 实际：轨道平面内 x 沿升交点方向，z 垂直。先组合
  X = x*cosN - z*sinN;
  Z = x*sinN + z*cosN;
  const Y = 0;
  // 再绕升交点轴(此时为 X 轴方向)倾斜 inclination —— 简化：绕 X 轴转
  const cosI=Math.cos(inclination), sinI=Math.sin(inclination);
  const Y2 = Y*cosI - Z*sinI;
  const Z2 = Y*sinI + Z*cosI;
  return new THREE.Vector3(X, Y2, Z2);
}

// 完整：给定天体数据与平近点角 M，返回世界坐标
export function bodyWorldPos(data, M){
  data = applyScaleMode(data);
  const a = data.orbitRadius;
  const e = data.eccentricity||0;
  const inc = data.inclination||0;
  const node = data.ascendingNode||0;
  const p = orbitPlanePos(a, e, M);
  return orbitToWorld(p.x, p.z, inc, node);
}

// 画椭圆轨道线（含倾角），返回 Line
export function makeEllipseOrbit(data){
  data = applyScaleMode(data);
  const a = Math.max(0.01, data.orbitRadius);
  const e = data.eccentricity||0;
  const inc = data.inclination||0;
  const node = data.ascendingNode||0;
  const segs = 160;
  const pts = [];
  for(let i=0;i<=segs;i++){
    const M = i/segs*Math.PI*2;
    const p = orbitPlanePos(a, e, M);
    pts.push(orbitToWorld(p.x, p.z, inc, node));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color:0x335577, transparent:true, opacity:0.25 });
  return new THREE.Line(g, m);
}
