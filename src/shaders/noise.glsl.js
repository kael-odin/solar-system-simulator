// src/shaders/noise.glsl.js
// 全局 GLSL 噪声库 —— 所有天体着色器复用。导出为字符串片段，拼接到各 shader 顶部。
// ponytail: 单一 noise 实现集合，够用即可。升级路径：若需更高频细节可加 3D simplex。

export const NOISE_GLSL = /* glsl */`
// ---------- hash ----------
float hash11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));p3+=dot(p3,p3.yzx+33.33);return fract(vec2((p3.x+p3.y)*p3.z,(p3.x+p3.z)*p3.y));}
float hash31(vec3 p){p=fract(p*0.3183099+vec3(0.1));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}

// ---------- value noise 2D/3D ----------
float vnoise2(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float vnoise3(vec3 p){
  vec3 i=floor(p),f=fract(p);
  vec3 u=f*f*(3.0-2.0*f);
  float n000=hash31(i+vec3(0,0,0)),n100=hash31(i+vec3(1,0,0));
  float n010=hash31(i+vec3(0,1,0)),n110=hash31(i+vec3(1,1,0));
  float n001=hash31(i+vec3(0,0,1)),n101=hash31(i+vec3(1,0,1));
  float n011=hash31(i+vec3(0,1,1)),n111=hash31(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y),u.z);
}

// ---------- fbm (fractal brownian motion) ----------
float fbm2(vec2 p,int oct,float lac,float gain){
  float a=0.5,s=0.0,f=1.0;
  for(int i=0;i<8;i++){ if(i>=oct)break; s+=a*vnoise2(p*f); f*=lac; a*=gain; }
  return s;
}
float fbm3(vec3 p,int oct,float lac,float gain){
  float a=0.5,s=0.0,f=1.0;
  for(int i=0;i<8;i++){ if(i>=oct)break; s+=a*vnoise3(p*f); f*=lac; a*=gain; }
  return s;
}
// 预设便利
float fbm(vec2 p){return fbm2(p,5,2.0,0.5);}
float fbm3(vec3 p){return fbm3(p,5,2.0,0.5);}

// ---------- domain-warped fbm (更自然的地貌) ----------
float warpedFbm(vec2 p){
  vec2 q=vec2(fbm(p),fbm(p+vec2(5.2,1.3)));
  vec2 r=vec2(fbm(p+4.0*q+vec2(1.7,9.2)),fbm(p+4.0*q+vec2(8.3,2.8)));
  return fbm(p+4.0*r);
}

// ---------- turbulence (abs 叠加，金星/木星云带) ----------
float turbulence(vec2 p,int oct){
  float a=0.5,s=0.0,f=1.0;
  for(int i=0;i<8;i++){ if(i>=oct)break; s+=a*abs(vnoise2(p*f)-0.5)*2.0; f*=2.0; a*=0.5; }
  return s;
}

// ---------- ridged (山脊，火星峡谷) ----------
float ridged(vec2 p,int oct){
  float a=0.5,s=0.0,f=1.0;
  for(int i=0;i<8;i++){ if(i>=oct)break; float n=1.0-abs(vnoise2(p*f)-0.5)*2.0; n=n*n; s+=a*n; f*=2.0; a*=0.5; }
  return s;
}

// ---------- cellular / voronoi (陨石坑、月海、撞击点) ----------
// 返回 vec2: x=最近胞距离(F1), y=次近(F2)
vec2 voronoi2(vec2 p){
  vec2 ip=floor(p),fp=fract(p);
  float f1=1e9,f2=1e9;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 g=vec2(float(x),float(y));
    vec2 o=hash22(ip+g);
    // 抖动点
    vec2 r=g+o-fp;
    float d=dot(r,r);
    if(d<f1){f2=f1;f1=d;}else if(d<f2){f2=d;}
  }
  return vec2(sqrt(f1),sqrt(f2));
}
// 标量 crater 函数：在 p 周围生成环形凹陷结构
float craters(vec2 p,float density){
  vec2 c=voronoi2(p*density);
  float edge=smoothstep(0.0,0.08,c.x);     // 坑内暗
  float rim=smoothstep(0.12,0.05,abs(c.x-0.1)); // 坑缘亮
  float interior=1.0-edge;
  return mix(interior*0.4,1.0,edge)+rim*0.6;
}

// ---------- 3D 星球表面通用坐标 ----------
// 将世界法线转为球面经纬坐标(uv)，用于 2D 噪声采样，避免极点畸变过大
vec2 sphereUV(vec3 n){
  float u=0.5+atan(n.z,n.x)/(2.0*3.14159265);
  float v=0.5-asin(clamp(n.y,-1.0,1.0))/3.14159265;
  return vec2(u,v);
}
`;
