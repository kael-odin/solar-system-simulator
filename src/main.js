// src/main.js — 入口：场景、相机、渲染循环、Bloom、模块装配
import * as THREE from 'three';
import { EffectComposer } from 'addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'addons/controls/OrbitControls.js';

import { createSun, setSunCamera } from './bodies/sun.js';
import { createPlanet } from './bodies/planet.js';
import { createMoon } from './bodies/moon.js';
import { createDwarf } from './bodies/dwarf.js';
import { createSaturnRings } from './bodies/saturnRings.js';
import { applyScaleMode } from './scalemode.js';
import { createAsteroidBelt, createKuiperBelt, createOortCloud, updateAsteroidBelt, updateKuiperBelt } from './bodies/belts.js';
import { createBackground } from './bodies/background.js';
import { SUN, PLANETS, DWARFS, MOONS, NAMED_ASTEROIDS, findBody } from './data/bodies.js';
import { initUI, selectBody } from './ui/panels.js';
import { focusTarget, updateCamera } from './ui/camera.js';
import { getQuality, getQualityKey, setQualityKey, QUALITY_PRESETS } from './quality.js';
import { makeEllipseOrbit, bodyWorldPos } from './orbit.js';
import { bodyName } from './ui/i18n.js';

// ---- 全局状态 ----
export const STATE = {
  timeScale: 1.0,
  direction: 1,
  brightness: 1.0,
  starDensity: 1.0,
  show: { asteroids:true, kuiper:true, orbits:true, labels:true, atmospheres:true },
  selected: null,
  simTime: 0,
  reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const canvas = document.getElementById('scene');
const Q = getQuality();
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.pixelRatioCap));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if(Q.shadows){ renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 20000);
camera.position.set(60, 45, 90);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.45;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.7;
controls.minDistance = 2;
controls.maxDistance = 600;
controls.target.set(0,0,0);

// CSS2D 标签渲染器
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '5';
document.getElementById('labels').appendChild(labelRenderer.domElement);

// ---- 后期：Bloom ----
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), Q.bloomStrength, 0.6, 0.25);
bloom.setSize(innerWidth*Q.bloomScale, innerHeight*Q.bloomScale);
composer.addPass(bloom);

// ---- 环境光 ----
const ambient = new THREE.AmbientLight(0x223344, 0.25);
scene.add(ambient);
const sunLight = new THREE.PointLight(0xffeedd, 3.0, 0, 1.5); sunLight.position.set(0,0,0);
if(Q.shadows){ sunLight.castShadow = true; sunLight.shadow.mapSize.set(Q.shadowMapSize, Q.shadowMapSize); sunLight.shadow.camera.near = 0.5; sunLight.shadow.camera.far = 200; sunLight.shadow.bias = -0.0005; }
scene.add(sunLight);

// ---- 容器 ----
export const bodyGroup = new THREE.Group(); scene.add(bodyGroup);
export const orbitGroup = new THREE.Group(); scene.add(orbitGroup);
export const beltGroup = new THREE.Group(); scene.add(beltGroup);
export const labelObjects = []; // {body, obj, el}
export const bodyRegistry = new Map(); // id -> { group, mesh, data, update }

function addLabel(text, parent, id){
  const el = document.createElement('div');
  el.className = 'body-label';
  el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.position.set(0,0,0);
  parent.add(obj);
  labelObjects.push({ id, el, obj, parent });
  return obj;
}
export { addLabel };

function makeOrbit(radius){
  const segs = 128; const r = Math.max(0.01, radius);
  const pts = [];
  for(let i=0;i<=segs;i++){ const a=i/segs*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r)); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color:0x335577, transparent:true, opacity:0.25 });
  const line = new THREE.Line(g,m); line.rotation.x = Math.PI/2;
  return line;
}

// ---- 构建天体 ----
const sun = createSun(); bodyGroup.add(sun.group); bodyRegistry.set('sun', sun); addLabel(bodyName(findBody('sun')), sun.group, 'sun');
setSunCamera(camera);

const planetObjs = {};
for(const p of PLANETS){
  const po = createPlanet(p); bodyGroup.add(po.group);
  bodyRegistry.set(p.id, po); planetObjs[p.id]=po;
  addLabel(bodyName(p), po.group, p.id);
  const orbit = makeEllipseOrbit(p); orbitGroup.add(orbit); po.orbitLine = orbit;
  if(p.id==='saturn'){ const rings = createSaturnRings(applyScaleMode(p).renderRadius); po.group.add(rings); }
}

const moonObjs = {};
for(const m of MOONS){
  const parent = planetObjs[m.parent];
  if(!parent) continue;
  const mo = createMoon(m); parent.group.add(mo.group);
  bodyRegistry.set(m.id, mo); moonObjs[m.id]=mo;
  addLabel(bodyName(m), mo.group, m.id);
}

const dwarfObjs = {};
for(const d of DWARFS){
  if(d.id==='pluto'){ const po = createDwarf(d); bodyGroup.add(po.group); bodyRegistry.set('pluto', po); addLabel(bodyName(d), po.group, 'pluto'); const o=makeEllipseOrbit(d); orbitGroup.add(o); po.orbitLine=o; dwarfObjs['pluto']=po; continue; }
  const dobj = createDwarf(d); bodyGroup.add(dobj.group);
  bodyRegistry.set(d.id, dobj); dwarfObjs[d.id]=dobj;
  addLabel(bodyName(d), dobj.group, d.id);
  if(!d.inBelt){ const o=makeEllipseOrbit(d); orbitGroup.add(o); dobj.orbitLine=o; }
}

const belts = createAsteroidBelt(); beltGroup.add(belts);
const kuiper = createKuiperBelt(); beltGroup.add(kuiper);
const oort = createOortCloud(); scene.add(oort);

// 注册命名小行星到 bodyRegistry（点击/搜索聚焦用）
{
  const namedUD = belts.userData.named || [];
  for(let i=0;i<namedUD.length;i++){
    const mesh = namedUD[i];
    const na = NAMED_ASTEROIDS[i];
    bodyRegistry.set(na.id, {
      group: mesh, mesh, data:{ ...na, renderRadius: na.id==='vesta'?0.9:0.5 },
      update(){}
    });
    addLabel(bodyName(na), mesh, na.id);
  }
}

const bg = createBackground(); scene.add(bg.group);
if(STATE.reducedMotion){
  STATE.timeScale = 0; // 默认暂停
  const ts=document.getElementById('time-slider'); if(ts) ts.value=0;
  const tv=document.getElementById('time-val'); if(tv) tv.textContent='0×';
}

// ---- UI ----
initUI({ camera, controls, scene, bodyRegistry, bloom, ambient, bg, labelObjects });
window.__selectBody = selectBody;

// ---- 渲染循环 ----
const clock = new THREE.Clock();
let fpsAcc=0, fpsCount=0, fpsLast=performance.now();
const fpsEl = document.getElementById('fps');
const dateEl = document.getElementById('date-display');
const EPOCH = new Date('2026-07-20T00:00:00');
let simDays = 0; // 累计模拟天数

function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  STATE.simTime += dt * STATE.timeScale * STATE.direction;
  const t = STATE.simTime;
  updateCamera(dt);

  // 行星轨道运动（真实椭圆 + 倾角）
  for(const p of PLANETS){
    const po = planetObjs[p.id]; if(!po) continue;
    const M = t * p.orbitSpeed * 0.05;
    po.group.position.copy(bodyWorldPos(p, M));
    if(po.mesh) po.mesh.rotation.y = t * p.rotSpeed * 0.3;
    if(po.atmosphere) po.atmosphere.rotation.y = t * p.rotSpeed * 0.25;
    if(po.update) po.update(t, dt);
  }
  // 月球
  for(const m of MOONS){
    const mo = moonObjs[m.id]; if(!mo) continue;
    const parent = planetObjs[m.parent]; if(!parent) continue;
    const a = t * m.orbitSpeed * 0.05;
    mo.group.position.set(Math.cos(a)*m.orbitRadius, 0, Math.sin(a)*m.orbitRadius);
    if(mo.mesh) mo.mesh.rotation.y = t * m.rotSpeed * 0.3;
    if(mo.update) mo.update(t, dt);
  }
  // 矮行星轨道（真实椭圆 + 倾角；冥王星 17° 倾角最显著）
  for(const d of DWARFS){
    const dobj = dwarfObjs[d.id]; if(!dobj) continue;
    const M = t * d.orbitSpeed * 0.05;
    dobj.group.position.copy(bodyWorldPos(d, M));
    if(dobj.mesh) dobj.mesh.rotation.y = t * d.rotSpeed * 0.3;
    if(dobj.update) dobj.update(t, dt);
  }
  // 太阳
  if(sun.update) sun.update(t, dt);
  // 小行星带 / 柯伊伯带
  updateAsteroidBelt(belts, t);
  updateKuiperBelt(kuiper, t);
  // 背景
  if(bg.update) bg.update(t, dt);

  // 可见性同步
  belts.visible = STATE.show.asteroids;
  kuiper.visible = STATE.show.kuiper;
  orbitGroup.visible = STATE.show.orbits;
  labelObjects.forEach(l=>{ l.el.style.opacity = STATE.show.labels ? '' : '0'; });
  bodyRegistry.forEach(e=>{ if(e.atmosphere) e.atmosphere.visible = STATE.show.atmospheres; });

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);

  // fps + 日期
  const now = performance.now();
  fpsCount++; fpsAcc += dt;
  if(now - fpsLast > 500){
    const fps = Math.round(fpsCount/( (now-fpsLast)/1000 ));
    fpsEl.textContent = 'FPS: '+fps;
    fpsCount=0; fpsLast=now;
  }
  // 日期推进：1x 倍率约等于每秒 7 天（一年看约 5 分钟），倍率 0 停
  simDays += dt * STATE.timeScale * 7;
  if(dateEl){
    const d = new Date(EPOCH.getTime() + simDays*86400000);
    const y=d.getUTCFullYear(), m=String(d.getUTCMonth()+1).padStart(2,'0'), dd=String(d.getUTCDate()).padStart(2,'0');
    dateEl.textContent = `${y}-${m}-${dd}`;
  }
}

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

// 启动
document.getElementById('loading').style.display='none';
animate();
console.log('%c🌌 太阳系模拟器已启动', 'color:#6fb6ff;font-size:14px');

// 键盘导航：Tab/方向键遍历天体，Enter 聚焦
import('./ui/camera.js').then(({ focusTarget })=>{ window.__focusTarget=focusTarget; });
const NAV_ORDER = ['sun', ...PLANETS.map(p=>p.id), ...MOONS.map(m=>m.id), ...DWARFS.map(d=>d.id)];
let navIndex = 0;
addEventListener('keydown', (e)=>{
  if(e.target.tagName==='INPUT') return;
  if(e.key==='Tab'){ e.preventDefault(); navIndex = (navIndex + (e.shiftKey?-1:1) + NAV_ORDER.length) % NAV_ORDER.length; selectBodyExternal(NAV_ORDER[navIndex]); }
  else if(e.key==='Enter'){ window.__focusTarget && window.__focusTarget(NAV_ORDER[navIndex]); }
  else if(e.key==='ArrowRight'){ navIndex=(navIndex+1)%NAV_ORDER.length; selectBodyExternal(NAV_ORDER[navIndex]); }
  else if(e.key==='ArrowLeft'){ navIndex=(navIndex-1+NAV_ORDER.length)%NAV_ORDER.length; selectBodyExternal(NAV_ORDER[navIndex]); }
});
function selectBodyExternal(id){
  if(window.__selectBody) window.__selectBody(id);
}
