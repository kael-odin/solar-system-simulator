// src/scalemode.js — 观感尺度 vs 真实尺度(对数压缩)切换
// 真实尺度下：天体半径与轨道用对数压缩的真实直径/半长轴，科普展示真实比例关系。

let _real = false;
try{ _real = localStorage.getItem('ssim-realscale') === '1'; }catch(e){}

export function isRealScale(){ return _real; }
export function setRealScale(v){ _real = v; try{ localStorage.setItem('ssim-realscale', v?'1':'0'); }catch(e){} }

// 由真实直径(km)计算渲染半径
export function realRenderRadius(diameterKm){
  if(!diameterKm) return 0.5;
  // 对数压缩：log10(d/100km) * k，保证可见差异又不至于太阳吞一切
  return Math.max(0.3, Math.log10(diameterKm/100) * 0.9);
}
// 由真实半长轴(AU)计算渲染轨道半径
// ponytail: 距离对数压缩——真实比例下土星到海王星会撑爆屏幕，但环半径也要跟着缩，
// 否则环 outer 会越过邻星轨道（土星环切天王星）。环倍率在 saturnRings.js 收紧配套。
export function realOrbitRadius(semiMajorAU){
  if(!semiMajorAU) return 10;
  // 指数根压扁近行星、拉开远行星，保留"越远越大"相对关系
  return Math.max(10, Math.pow(semiMajorAU, 0.62) * 17);
}

// 给 data 注入 real-scale 渲染值（若开启）
export function applyScaleMode(data){
  if(!_real) return data;
  return {
    ...data,
    renderRadius: realRenderRadius(data.diameter),
    orbitRadius: realOrbitRadius(data.semiMajor),
  };
}
