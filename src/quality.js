// src/quality.js — 质量档位：性能 / 平衡 / 质量
// 全局唯一配置源，所有几何分段、粒子数、像素比、Bloom 分辨率、阴影开关都读这里。
// 独立模块，不依赖 main.js，避免循环引用。

export const QUALITY_PRESETS = {
  performance: {
    label:'性能',
    pixelRatioCap: 1,
    sphereSeg: 32,        // 行星球面分段
    moonSeg: 24,
    starCount: 4000,
    bloomScale: 0.5,      // Bloom 渲染分辨率倍率
    bloomStrength: 1.1,
    shadows: false,
    shadowMapSize: 1024,
    asteroidCount: 200,
    kuiperCount: 1000,
    oortCount: 800,
    dprCap: 1,
  },
  balanced: {
    label:'平衡',
    pixelRatioCap: 1.5,
    sphereSeg: 48,
    moonSeg: 32,
    starCount: 6000,
    bloomScale: 0.75,
    bloomStrength: 1.1,
    shadows: false,
    shadowMapSize: 1024,
    asteroidCount: 280,
    kuiperCount: 1500,
    oortCount: 1200,
    dprCap: 1.5,
  },
  quality: {
    label:'质量',
    pixelRatioCap: 2,
    sphereSeg: 64,
    moonSeg: 48,
    starCount: 8000,
    bloomScale: 1.0,
    bloomStrength: 1.1,
    shadows: true,
    shadowMapSize: 2048,
    asteroidCount: 320,
    kuiperCount: 2000,
    oortCount: 1500,
    dprCap: 2,
  },
};

// 默认按硬件能力自动选档
export function autoDetectQuality(){
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator.deviceMemory) || 4; // GB，Chrome only
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if(mobile || cores <= 4 || mem <= 4) return 'performance';
  if(cores <= 6 || mem <= 8) return 'balanced';
  return 'quality';
}

let _key = null;
export function getQualityKey(){ if(_key) return _key; _key = autoDetectQuality(); return _key; }
export function getQuality(){ return QUALITY_PRESETS[getQualityKey()]; }

export function setQualityKey(k){
  _key = k;
  // 持久化
  try{ localStorage.setItem('ssim-quality', k); }catch(e){}
}
// 启动时读取用户上次选择
try{
  const saved = localStorage.getItem('ssim-quality');
  if(saved && QUALITY_PRESETS[saved]) _key = saved;
}catch(e){}
