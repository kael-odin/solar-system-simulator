// src/ui/camera.js — 相机聚焦飞行 + 预设视角
import * as THREE from 'three';
import { findBody } from '../data/bodies.js';

let camera, controls, bodyRegistry;
export function initCameraRefs(refs){ camera=refs.camera; controls=refs.controls; bodyRegistry=refs.bodyRegistry; }

// 平滑飞行：tween 相机位置与 target
const fly = { active:false, t:0, dur:1.4, fromPos:new THREE.Vector3(), toPos:new THREE.Vector3(),
  fromTgt:new THREE.Vector3(), toTgt:new THREE.Vector3() };

function easeInOut(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }

export function flyTo(toPos, toTgt, dur=1.4){
  fly.active=true; fly.t=0; fly.dur=dur;
  fly.fromPos.copy(camera.position);
  fly.toPos.copy(toPos);
  fly.fromTgt.copy(controls.target);
  fly.toTgt.copy(toTgt);
}

export function focusTarget(id){
  const entry = bodyRegistry.get(id);
  if(!entry) return;
  const wp = new THREE.Vector3();
  entry.group.getWorldPosition(wp);
  const r = entry.data?.renderRadius || 1.5;
  const dist = Math.max(r*4, 6);
  const offset = new THREE.Vector3(dist*0.7, dist*0.45, dist*0.7);
  flyTo(wp.clone().add(offset), wp.clone(), 1.6);
}

export const PRESETS = {
  overview: { pos:[60,45,90], tgt:[0,0,0], dur:1.8 },
  inner:    { pos:[28,18,40], tgt:[0,0,0], dur:1.6 },
  jupiter:  { bodyId:'jupiter', mul:5.5, dur:1.8 },
  saturn:   { bodyId:'saturn', mul:6.0, dur:1.8 },
  pluto:    { bodyId:'pluto', mul:4.0, dur:2.0 },
};

export function gotoPreset(key){
  const p = PRESETS[key];
  if(!p) return;
  if(p.bodyId){
    const entry = bodyRegistry.get(p.bodyId);
    if(!entry) return;
    const wp = new THREE.Vector3(); entry.group.getWorldPosition(wp);
    const r = entry.data.renderRadius;
    const dist = r * p.mul;
    const off = new THREE.Vector3(dist*0.6, dist*0.4, dist*0.6);
    flyTo(wp.clone().add(off), wp.clone(), p.dur);
  } else {
    flyTo(new THREE.Vector3(...p.pos), new THREE.Vector3(...p.tgt), p.dur);
  }
}

export function updateCamera(dt){
  if(!fly.active) return;
  fly.t += dt / fly.dur;
  if(fly.t >= 1){ fly.t=1; fly.active=false; }
  const k = easeInOut(fly.t);
  camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
  controls.target.lerpVectors(fly.fromTgt, fly.toTgt, k);
}
