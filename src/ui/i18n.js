// src/ui/i18n.js — 中英文切换
const STRINGS = {
  zh: {
    appTitle: '电影级太阳系模拟器 · Cinematic Solar System',
    searchPlaceholder: '搜索天体 / Search bodies (中英文)…',
    noResult: '无匹配结果',
    systemType: '系统',
    hint: '单击任意天体查看详情；双击聚焦飞行；拖拽旋转，滚轮缩放，右键平移。<br>Tab/方向键切换天体，Enter 聚焦。<br><br>🏆 成就 {u}/{t}',
    diameter: '直径',
    semiMajor: '轨道半长轴',
    rotation: '自转周期',
    orbit: '公转周期',
    temp: '表面温度',
    moons: '已知卫星',
    earthDay: '地球日',
    earthYear: '地球年',
    moonsUnit: '颗',
    exploration: '探索记录',
    show: '显示',
    asteroids: '小行星带',
    kuiper: '柯伊伯带',
    orbits: '轨道线',
    labels: '天体标签',
    atmospheres: '大气外壳',
    time: '时间',
    timeRate: '时间倍率',
    direction: '公转方向',
    prograde: '顺行',
    retrograde: '逆行',
    visual: '画面',
    brightness: '亮度',
    starDensity: '星空密度',
    view: '视角',
    overview: '太阳系全景',
    inner: '内太阳系',
    jupiterSys: '木星系统',
    saturnSys: '土星系统',
    plutoClose: '冥王星特写',
    reset: '重置视角',
    quality: '质量',
    perf: '性能', balanced: '平衡', qualityHi: '质量',
    realScale: '真实尺度(对数)',
    achievement: '成就解锁',
    bodyTypeStar: '恒星', bodyTypePlanet: '行星', bodyTypeDwarf: '矮行星',
    bodyTypeMoon: '卫星', bodyTypeAsteroid: '小行星',
  },
  en: {
    appTitle: 'Cinematic Solar System Simulator',
    searchPlaceholder: 'Search bodies (zh/en)…',
    noResult: 'No results',
    systemType: 'System',
    hint: 'Click a body for details; double-click to fly & focus; drag to orbit, scroll to zoom, right-drag to pan.<br>Tab/arrows to cycle, Enter to focus.<br><br>🏆 Achievements {u}/{t}',
    diameter: 'Diameter',
    semiMajor: 'Semi-major axis',
    rotation: 'Rotation',
    orbit: 'Orbital period',
    temp: 'Surface temp',
    moons: 'Known moons',
    earthDay: 'Earth days',
    earthYear: 'Earth years',
    moonsUnit: '',
    exploration: 'Exploration',
    show: 'Show',
    asteroids: 'Asteroid belt',
    kuiper: 'Kuiper belt',
    orbits: 'Orbits',
    labels: 'Body labels',
    atmospheres: 'Atmospheres',
    time: 'Time',
    timeRate: 'Time rate',
    direction: 'Direction',
    prograde: 'Prograde',
    retrograde: 'Retrograde',
    visual: 'Visual',
    brightness: 'Brightness',
    starDensity: 'Star density',
    view: 'View',
    overview: 'Overview',
    inner: 'Inner system',
    jupiterSys: 'Jupiter system',
    saturnSys: 'Saturn system',
    plutoClose: 'Pluto close-up',
    reset: 'Reset view',
    quality: 'Quality',
    perf: 'Perf', balanced: 'Balanced', qualityHi: 'Quality',
    realScale: 'Real scale (log)',
    achievement: 'Achievement unlocked',
    bodyTypeStar: 'Star', bodyTypePlanet: 'Planet', bodyTypeDwarf: 'Dwarf planet',
    bodyTypeMoon: 'Moon', bodyTypeAsteroid: 'Asteroid',
  },
};

let _lang = 'zh';
try{ _lang = localStorage.getItem('ssim-lang') || 'zh'; }catch(e){}

export function getLang(){ return _lang; }
export function setLang(l){ _lang = l; try{ localStorage.setItem('ssim-lang', l); }catch(e){} }
export function toggleLang(){ setLang(_lang==='zh'?'en':'zh'); }

export function t(key, vars){
  const s = STRINGS[_lang][key] || STRINGS.zh[key] || key;
  if(vars){ let r=s; for(const k in vars) r=r.replace('{'+k+'}', vars[k]); return r; }
  return s;
}

// 当前语言下的天体名/类型
export function bodyName(b){ return _lang==='zh' ? b.name : b.en; }
export function typeName(b){
  const k = ({恒星:'bodyTypeStar',行星:'bodyTypePlanet',矮行星:'bodyTypeDwarf',卫星:'bodyTypeMoon',小行星:'bodyTypeAsteroid'})[b.type];
  return k ? t(k) : b.type;
}

// 重新应用所有静态 UI 文本
export function applyStaticI18N(){
  document.documentElement.lang = _lang==='zh'?'zh-CN':'en';
  document.title = t('appTitle');
  const set = (sel, key)=>{ const el=document.querySelector(sel); if(el) el.textContent = t(key); };
  const ph = document.getElementById('search-input'); if(ph) ph.placeholder = t('searchPlaceholder');
  set('#info-name', null) || null; // name 动态
  // 顶部信息面板默认态由 infoDefault 重设，这里只刷静态标签
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.dataset.i18n); });
}
