// src/bodies/background.js — 深空背景：星点着色器 + 渐变天球 + 流星 + 奥尔特云
import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/noise.glsl.js';
import { getQuality } from '../quality.js';

// 深蓝紫渐变天球
function makeSkyDome(){
  const geo = new THREE.SphereGeometry(8000, 32, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false,
    uniforms:{},
    vertexShader:`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`varying vec3 vP; void main(){
      float h = normalize(vP).y*0.5+0.5;
      vec3 c1 = vec3(0.02,0.025,0.06);   // 深底
      vec3 c2 = vec3(0.05,0.04,0.10);    // 中
      vec3 c3 = vec3(0.07,0.05,0.12);    // 顶带紫
      vec3 col = mix(c1,c2,smoothstep(0.0,0.5,h));
      col = mix(col,c3,smoothstep(0.5,1.0,h));
      gl_FragColor=vec4(col,1.0);
    }`,
  });
  return new THREE.Mesh(geo, mat);
}

// 8000+ 星点，带色彩偏移与闪烁
function makeStarfield(count=8000){
  const pos = new Float32Array(count*3);
  const col = new Float32Array(count*3);
  const siz = new Float32Array(count);
  const phs = new Float32Array(count);
  for(let i=0;i<count;i++){
    // 球面均匀
    const u=Math.random(), v=Math.random();
    const th=u*Math.PI*2, ph=Math.acos(2*v-1);
    const r=3000+Math.random()*4000;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);
    pos[i*3+1]=r*Math.sin(ph)*Math.sin(th);
    pos[i*3+2]=r*Math.cos(ph);
    // 色彩偏移：白/蓝/黄/橙
    const t=Math.random();
    let cr,cg,cb;
    if(t<0.6){ cr=1;cg=1;cb=1; }            // 白
    else if(t<0.78){ cr=0.7;cg=0.8;cb=1.0; } // 蓝
    else if(t<0.9){ cr=1.0;cg=0.9;cb=0.7; } // 黄
    else { cr=1.0;cg=0.65;cb=0.5; }          // 橙红
    col[i*3]=cr;col[i*3+1]=cg;col[i*3+2]=cb;
    siz[i]=Math.random()*2.0+0.4;
    phs[i]=Math.random()*6.28;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('aColor',new THREE.BufferAttribute(col,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(siz,1));
  g.setAttribute('aPhase',new THREE.BufferAttribute(phs,1));
  const mat=new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDensity:{value:1.0} },
    vertexShader:`
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      varying vec3 vColor; varying float vTw; uniform float uTime; uniform float uDensity;
      void main(){
        vColor=aColor;
        // 闪烁
        float tw = 0.6 + 0.4*sin(uTime*1.5 + aPhase);
        vTw = tw;
        // 密度：按 hash 丢弃一部分
        float keep = step(1.0-uDensity, fract(aPhase*7.31));
        gl_PointSize = aSize * (300.0/-(modelViewMatrix*vec4(position,1.0)).z) * tw;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
        gl_Position = keep>0.5 ? gl_Position : vec4(2.0,2.0,2.0,1.0); // 移出屏幕
      }`,
    fragmentShader:`
      varying vec3 vColor; varying float vTw;
      void main(){
        vec2 d = gl_PointCoord-0.5;
        float a = smoothstep(0.5,0.0,length(d));
        gl_FragColor=vec4(vColor*vTw, a);
      }`,
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
  });
  return new THREE.Points(g,mat);
}

// 流星
function makeMeteors(){
  const N = 6;
  const group = new THREE.Group();
  const meteors = [];
  for(let i=0;i<N;i++){
    const geo = new THREE.BufferGeometry();
    const pts = new Float32Array(2*3); // 起止两点
    geo.setAttribute('position', new THREE.BufferAttribute(pts,3));
    const colors = new Float32Array(2*3);
    colors[0]=1.0;colors[1]=0.95;colors[2]=0.8; // 头
    colors[3]=0.6;colors[4]=0.4;colors[5]=0.2;  // 尾
    geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
    const mat = new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    meteors.push({ line, pts, mat, next: Math.random()*8+2, active:false, t:0, dur:1.2, p0:new THREE.Vector3(), p1:new THREE.Vector3(), v:new THREE.Vector3() });
  }
  function spawn(m){
    // 在远处球壳上选起点，向另一方向飞
    const u=Math.random()*Math.PI*2, v=Math.acos(2*Math.random()-1);
    const r=2500;
    m.p0.set(r*Math.sin(v)*Math.cos(u), r*Math.sin(v)*Math.sin(u), r*Math.cos(v));
    const dir = new THREE.Vector3((Math.random()-0.5),(Math.random()-0.5),(Math.random()-0.5)).normalize();
    m.p1.copy(m.p0).addScaledVector(dir, 400+Math.random()*400);
    m.v.copy(dir);
    m.active=true; m.t=0; m.dur=0.8+Math.random()*0.8;
  }
  return { group, meteors, spawn };
}

// 奥尔特云：极远处稀疏粒子
function makeOort(count=1500){
  const N=count;
  const pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const u=Math.random()*Math.PI*2, v=Math.acos(2*Math.random()-1);
    const r=5000+Math.random()*2500;
    pos[i*3]=r*Math.sin(v)*Math.cos(u);
    pos[i*3+1]=r*Math.sin(v)*Math.sin(u);
    pos[i*3+2]=r*Math.cos(v);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const m=new THREE.PointsMaterial({ color:0x8899bb, size:2, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:false });
  return new THREE.Points(g,m);
}

export function createBackground(){
  const Q = getQuality();
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const group = new THREE.Group();
  const sky = makeSkyDome(); group.add(sky);
  const stars = makeStarfield(Q.starCount); group.add(stars);
  const meteors = makeMeteors(); if(!reduced) group.add(meteors.group);
  const oort = makeOort(Q.oortCount); group.add(oort);

  return {
    group,
    setDensity(d){ stars.material.uniforms.uDensity.value = d; },
    update(t, dt){
      stars.material.uniforms.uTime.value = t;
      // 流星
      for(const m of meteors.meteors){
        if(!m.active){
          m.next -= dt;
          if(m.next<=0){ meteors.spawn(m); }
        } else {
          m.t += dt;
          const k = m.t/m.dur;
          if(k>=1){ m.active=false; m.mat.opacity=0; m.next=Math.random()*10+3; continue; }
          // 头部位置
          const head = m.p0.clone().addScaledVector(m.v, k*400*(m.dur));
          const tail = head.clone().addScaledVector(m.v, -60);
          m.pts[0]=head.x;m.pts[1]=head.y;m.pts[2]=head.z;
          m.pts[3]=tail.x;m.pts[4]=tail.y;m.pts[5]=tail.z;
          m.line.geometry.attributes.position.needsUpdate=true;
          m.mat.opacity = Math.sin(k*Math.PI); // 淡入淡出
        }
      }
    },
  };
}
