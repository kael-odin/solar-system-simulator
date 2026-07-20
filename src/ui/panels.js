// src/ui/panels.js — 信息面板、控制面板、搜索、点击选中、双击聚焦
import * as THREE from 'three';
import { STATE } from '../main.js';
import { searchBodies, findBody, getExploration } from '../data/bodies.js';
import { initCameraRefs, focusTarget, gotoPreset } from './camera.js';
import { updateCamera } from './camera.js';
import { getQualityKey, QUALITY_PRESETS } from '../quality.js';
import { trackVisit, getUnlocked, getDefs } from './achievements.js';
import { isRealScale, setRealScale } from '../scalemode.js';
import { t, getLang, toggleLang, applyStaticI18N, bodyName, typeName } from './i18n.js';

let refs, bodyRegistry;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function infoDefault(){
  const zh = getLang()==='zh';
  document.getElementById('info-name').textContent = zh?'太阳系':'Solar System';
  document.getElementById('info-en').textContent = zh?'Solar System':'太阳系';
  document.getElementById('info-type').textContent = t('systemType');
  const unlocked = getUnlocked().length, total = getDefs().length;
  document.getElementById('info-body').innerHTML =
    '<div class="hint">'+t('hint',{u:unlocked,t:total})+'</div>';
}

function showInfo(body){
  document.getElementById('info-name').textContent = bodyName(body);
  document.getElementById('info-en').textContent = getLang()==='zh' ? body.en : body.name;
  document.getElementById('info-type').textContent = typeName(body);
  const rows = [
    [t('diameter'), body.diameter ? body.diameter.toLocaleString()+' km' : '—'],
    [t('semiMajor'), body.semiMajor ? body.semiMajor+' AU' : '—'],
    [t('rotation'), body.rotation ? body.rotation+' '+t('earthDay') : '—'],
    [t('orbit'), body.orbit ? (body.orbit>=1 ? body.orbit+' '+t('earthYear') : (body.orbit*365).toFixed(1)+' '+t('earthDay')) : '—'],
    [t('temp'), body.temp || '—'],
    [t('moons'), body.moons!=null ? body.moons+' '+t('moonsUnit').trim() : '—'],
  ];
  // 平滑滚动动画：逐行淡入
  const html = rows.map((r,i)=>
    `<div class="row" style="opacity:0;transform:translateY(8px);animation:rowin .4s ${i*0.06}s forwards">
       <span class="k">${r[0]}</span><span class="v">${r[1]}</span>
     </div>`).join('');
  // 探索记录
  const ex = getExploration(body.id);
  let exHtml = '';
  if(ex){
    exHtml = `<div class="row" style="opacity:0;animation:rowin .4s ${rows.length*0.06}s forwards;display:block;text-align:left">
       <span class="k" style="display:block;margin-bottom:4px">${t('exploration')}</span>
       <span class="v" style="text-align:left;font-size:11.5px;line-height:1.5">${ex.visited}</span>
     </div>`;
  }
  document.getElementById('info-body').innerHTML = html + exHtml + '<style>@keyframes rowin{to{opacity:1;transform:none}}</style>';
}

export function selectBody(id){
  STATE.selected = id;
  trackVisit(id);
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
    if(!list.length){ results.innerHTML='<div class="search-item">'+t('noResult')+'</div>'; results.style.display='block'; return; }
    results.innerHTML = list.map(b=>
      `<div class="search-item" data-id="${b.id}">${bodyName(b)}<span class="en">${getLang()==='zh'?b.en:b.name} · ${typeName(b)}</span></div>`
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
  // 质量档位切换（需重建几何，故 reload）
  document.querySelectorAll('[data-quality]').forEach(b=>b.addEventListener('click', ()=>{
    const k=b.dataset.quality;
    try{ localStorage.setItem('ssim-quality', k); }catch(e){}
    location.reload();
  }));
  // 真实尺度切换
  const realToggle = document.querySelector('[data-toggle-real]');
  if(realToggle){
    if(isRealScale()) realToggle.classList.add('on');
    realToggle.addEventListener('click', ()=>{ setRealScale(!isRealScale()); location.reload(); });
  }
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
  applyStaticI18N();
  infoDefault();
  // 高亮当前质量档
  const qk = getQualityKey();
  document.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('active', b.dataset.quality===qk));
  // 移动端控制面板抽屉切换
  const toggle = document.getElementById('panel-toggle');
  const cp = document.getElementById('control-panel');
  if(toggle && cp){ toggle.addEventListener('click', ()=> cp.classList.toggle('open')); }
  // 语言切换
  const langBtn = document.getElementById('lang-toggle');
  if(langBtn){
    langBtn.textContent = getLang()==='zh' ? 'EN' : '中';
    langBtn.addEventListener('click', ()=>{
      toggleLang();
      langBtn.textContent = getLang()==='zh' ? 'EN' : '中';
      applyStaticI18N();
      // 刷新天体标签文本
      if(refs.labelObjects){
        refs.labelObjects.forEach(l=>{
          const b = findBody(l.id);
          if(b) l.el.textContent = bodyName(b);
        });
      }
      // 刷新信息面板
      if(STATE.selected){ const b=findBody(STATE.selected); if(b) showInfo(b); else infoDefault(); }
      else infoDefault();
    });
  }
  // 注册主指针事件
  const canvas = document.getElementById('scene');
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('dblclick', onDblClick);
}

export { updateCamera };
