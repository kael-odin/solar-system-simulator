// src/ui/achievements.js — 轻量成就系统，localStorage 持久化
const KEY = 'ssim-achievements';
const DEFS = [
  { id:'pluto_heart', name:'心之所在', desc:'聚焦冥王星，找到汤博区爱心' },
  { id:'jupiter_eye', name:'风暴之眼', desc:'聚焦木星，凝视大红斑' },
  { id:'ring_master', name:'环之大师', desc:'聚焦土星，欣赏卡西尼缝' },
  { id:'dwarf_hunter', name:'矮行星猎人', desc:'聚焦全部 8 颗矮行星' },
  { id:'sun_diver', name:'逐日者', desc:'聚焦太阳' },
  { id:'explorer', name:'探索者', desc:'聚焦任意 5 个不同天体' },
];

function load(){
  try{ return new Set(JSON.parse(localStorage.getItem(KEY)||'[]')); }catch(e){ return new Set(); }
}
function save(set){
  try{ localStorage.setItem(KEY, JSON.stringify([...set])); }catch(e){}
}

let unlocked = load();
const visited = new Set(); // 本次会话访问

export function unlock(id){
  if(unlocked.has(id)) return;
  unlocked.add(id); save(unlocked);
  const def = DEFS.find(d=>d.id===id);
  if(def) toast(def);
}
export function getUnlocked(){ return [...unlocked]; }
export function getDefs(){ return DEFS; }

// 聚焦/选中某天体时调用
export function trackVisit(id){
  visited.add(id);
  if(id==='pluto') unlock('pluto_heart');
  if(id==='jupiter') unlock('jupiter_eye');
  if(id==='saturn') unlock('ring_master');
  if(id==='sun') unlock('sun_diver');
  // 8 颗矮行星全部到访
  const DWARF_IDS = ['pluto','eris','makemake','haumea','gonggong','ceres','quaoar','orcus','ixion'];
  if(DWARF_IDS.every(d=>visited.has(d))) unlock('dwarf_hunter');
  if(visited.size>=5) unlock('explorer');
}

function toast(def){
  const el = document.createElement('div');
  el.textContent = '🏆 成就解锁：'+def.name+' — '+def.desc;
  el.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:50;'+
    'background:rgba(12,16,28,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,210,120,0.4);'+
    'color:#ffe9a8;padding:10px 18px;border-radius:12px;font-size:13px;letter-spacing:.5px;'+
    'box-shadow:0 4px 20px rgba(0,0,0,0.5);opacity:0;transition:opacity .4s,transform .4s;pointer-events:none';
  document.body.appendChild(el);
  requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateX(-50%) translateY(0)'; });
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(), 500); }, 3500);
}
