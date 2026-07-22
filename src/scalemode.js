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
// ponytail: 距离幂律压缩——真实线性比例下海王星(30AU)是水星(0.39AU)的77倍，
// 屏幕装不下。平方根压缩(p=0.5)把比例压到5.5倍，保留"越远越大"且让外行星不再挤成一团。
// 真实尺度模式用 p=1.0（线性），观感用 p=0.5。
export function realOrbitRadius(semiMajorAU, p=0.5){
  if(!semiMajorAU) return 10;
  return Math.max(10, Math.pow(semiMajorAU, p) * 26);
}

// 给 data 注入渲染值：真实模式线性距离+对数半径；观感模式平方根距离+观感半径
// 卫星无 semiMajor（不绕日），保留其原 orbitRadius 不动
export function applyScaleMode(data){
  const p = _real ? 1.0 : 0.5;
  return {
    ...data,
    renderRadius: _real ? realRenderRadius(data.diameter) : data.renderRadius,
    orbitRadius: data.semiMajor ? realOrbitRadius(data.semiMajor, p) : data.orbitRadius,
  };
}
