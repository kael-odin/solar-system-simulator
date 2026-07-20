// src/ui/panels.js — 信息面板、控制面板、搜索、点击选中、双击聚焦
import * as THREE from 'three';
import { STATE } from '../main.js';
import { searchBodies, findBody } from '../data/bodies.js';
import { initCameraRefs, focusTarget, gotoPreset } from './camera.js';
import { updateCamera } from './camera.js';

let refs, bodyRegistry;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function infoDefault(){
  document.getElementById('info-name').textContent = '太阳系';
  document.getElementById('info-en').textContent = 'Solar System';
  document.getElementById('info-type').textContent = '系统';
  document.getElementById('info-body').innerHTML =
    '<div class="hint">单击任意天体查看详情；双击聚焦飞行；拖拽旋转，滚轮缩放，右键平移。</div>';
}

function showInfo(body){
  document.getElementById('info-name').textContent = body.name;
  document.getElementById('info-en').textContent = body.en;
  document.getElementById('info-type').textContent = body.type + ' · ' + (body.typeEn||'');
  const rows = [
    ['直径', body.diameter ? body.diameter.toLocaleString()+' km' : '—'],
    ['轨道半长轴', body.semiMajor ? body.semiMajor+' AU' : '—'],
    ['自转周期', body.rotation ? body.rotation+' 地球日' : '—'],
    ['公转周期', body.orbit ? (body.orbit>=1 ? body.orbit+' 地球年' : (body.orbit*365).toFixed(1)+' 地球日') : '—'],
    ['表面温度', body.temp || '—'],
    ['已知卫星', body.moons!=null ? body.moons+' 颗' : '—'],
  ];
  // 平滑滚动动画：逐行淡入
  const html = rows.map((r,i)=>
    `<div class="row" style="opacity:0;transform:translateY(8px);animation:rowin .4s ${i*0.06}s forwards">
       <span class="k">${r[0]}</span><span class="v">${r[1]}</span>
     </div>`).join('');
  document.getElementById('info-body').innerHTML = html + '<style>@keyframes rowin{to{opacity:1;transform:none}}</style>';
}

function selectBody(id){
  STATE.selected = id;
  document.querySelectorAll('.body-label').forEach(el=>el.classList.remove('selected'));
  const labelObj = refs.labelObjects.find(l=>l.id===id);
  if(labelObj) labelObj.el.classList.add('selected');
  const b = findBody(id);
  if(b) showInfo(b);
}

// 点击选中
let downXY = null;
function onPointerDown(e){ downXY = { x:e.clientX, y:e.clientY }; }
function onPointerUp(e){
  if(!downXY) return;
  const dx = e.clientX-downXY.x, dy = e.clientY-downXY.y;
  if(Math.hypot(dx,dy) > 5){ downXY=null; return; } // 拖动不算点击
  downXY = null;
  mouse.x = (e.clientX/innerWidth)*2-1;
  mouse.y = -(e.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouse, refs.camera);
  const meshes = [];
  refs.bodyRegistry.forEach(e=>{ if(e.mesh) meshes.push(e.mesh); });
  const hits = raycaster.intersectObjects(meshes, false);
  if(hits.length){
    const obj = hits[0].object;
    const id = obj.userData?.bodyId;
    if(id) selectBody(id);
  } else {
    STATE.selected = null;
    document.querySelectorAll('.body-label').forEach(el=>el.classList.remove('selected'));
    infoDefault();
  }
}
// 双击聚焦
function onDblClick(e){
  mouse.x=(e.clientX/innerWidth)*2-1; mouse.y=-(e.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouse, refs.camera);
  const meshes=[]; refs.bodyRegistry.forEach(en=>{ if(en.mesh) meshes.push(en.mesh); });
  const hits = raycaster.intersectObjects(meshes,false);
  if(hits.length){ const id=hits[0].object.userData?.bodyId; if(id){ selectBody(id); focusTarget(id); } }
}

// 搜索
function setupSearch(){
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  input.addEventListener('input', ()=>{
    const q = input.value.trim();
    if(!q){ results.style.display='none'; return; }
    const list = searchBodies(q);
    if(!list.length){ results.innerHTML='<div class="search-item">无匹配结果</div>'; results.style.display='block'; return; }
    results.innerHTML = list.map(b=>
      `<div class="search-item" data-id="${b.id}">${b.name}<span class="en">${b.en} · ${b.type}</span></div>`
    ).join('');
    results.style.display='block';
  });
  results.addEventListener('click', e=>{
    const item = e.target.closest('.search-item'); if(!item) return;
    const id = item.dataset.id;
    input.value=''; results.style.display='none';
    selectBody(id); focusTarget(id);
  });
  input.addEventListener('blur', ()=> setTimeout(()=>results.style.display='none', 200));
}

// 控制面板
function setupControls(){
  // toggles
  document.querySelectorAll('.toggle').forEach(t=>{
    t.addEventListener('click', ()=>{
      t.classList.toggle('on');
      const on = t.classList.contains('on');
      STATE.show[t.dataset.toggle] = on;
      applyVisibility();
    });
  });
  // 时间滑块: 0..1000 → 0..1000x。前段(0..10)给精细低倍率控制。
  const ts = document.getElementById('time-slider'), tv = document.getElementById('time-val');
  ts.addEventListener('input', ()=>{
    const v = parseFloat(ts.value);
    STATE.timeScale = v <= 10 ? v : 10 + (v - 10);
    tv.textContent = STATE.timeScale.toFixed(STATE.timeScale > 0 && STATE.timeScale < 10 ? 1 : 0) + '×';
  });
  // 方向
  document.getElementById('dir-seg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    document.querySelectorAll('#dir-seg button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    STATE.direction = parseInt(b.dataset.dir);
  });
  // 亮度
  const bs=document.getElementById('bright-slider'), bv=document.getElementById('bright-val');
  bs.addEventListener('input', ()=>{
    STATE.brightness = parseFloat(bs.value); bv.textContent = STATE.brightness.toFixed(2);
    refs.bloom.strength = 1.1 * STATE.brightness;
    refs.ambient.intensity = 0.25 * STATE.brightness;
  });
  // 星空密度
  const ss=document.getElementById('star-slider'), sv=document.getElementById('star-val');
  ss.addEventListener('input', ()=>{
    STATE.starDensity = parseFloat(ss.value)/100;
    sv.textContent = Math.round(STATE.starDensity*100)+'%';
    if(refs.bg.setDensity) refs.bg.setDensity(STATE.starDensity);
  });
  // 预设
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>gotoPreset(b.dataset.preset)));
  document.getElementById('reset-view').addEventListener('click', ()=>gotoPreset('overview'));
}

function applyVisibility(){
  // 由 main 在每帧读取 STATE.show；这里直接操作可访问的对象
  if(refs.bodyRegistry){
    refs.bodyRegistry.forEach(e=>{
      if(e.orbitLine) e.orbitLine.visible = STATE.show.orbits;
      if(e.atmosphere) e.atmosphere.visible = STATE.show.atmospheres;
    });
  }
  if(refs.labelObjects){
    refs.labelObjects.forEach(l=>{
      l.el.style.opacity = STATE.show.labels ? '' : '0';
    });
  }
}

export function initUI(_refs){
  refs = _refs; bodyRegistry = _refs.bodyRegistry;
  initCameraRefs(_refs);
  setupSearch(); setupControls();
  infoDefault();
  // 注册主指针事件
  const canvas = document.getElementById('scene');
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('dblclick', onDblClick);
}

export { updateCamera };
