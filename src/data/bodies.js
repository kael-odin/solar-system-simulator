// src/data/bodies.js
// 天体元数据：用于信息面板与搜索。数值为天文近似值，便于科普展示。
// ponytail: 单一数据源，UI 与场景共用。规模/距离是渲染用的缩放值，不是真实比例。
// 真实轨道参数：eccentricity 偏心率, inclination 倾角(弧度), ascendingNode 升交点经度(弧度)。

export const SUN = {
  id:'sun', name:'太阳', en:'Sun', type:'恒星', typeEn:'Star',
  diameter:1392700, semiMajor:0, rotation:27, orbit:0,
  temp:'5500 ℃ (表面) / 1500万 ℃ (核心)', moons:0
};

export const PLANETS = [
  { id:'mercury', name:'水星', en:'Mercury', type:'行星', typeEn:'Planet',
    diameter:4879, semiMajor:0.39, rotation:58.6, orbit:0.24,
    temp:'-173 ~ 427 ℃', moons:0,
    renderRadius:0.9, orbitRadius:14, orbitSpeed:4.15, rotSpeed:0.4,
    eccentricity:0.2056, inclination:0.1222, ascendingNode:0.8433 },
  { id:'venus', name:'金星', en:'Venus', type:'行星', typeEn:'Planet',
    diameter:12104, semiMajor:0.72, rotation:243, orbit:0.62,
    temp:'462 ℃', moons:0,
    renderRadius:1.4, orbitRadius:19, orbitSpeed:1.62, rotSpeed:-0.05,
    eccentricity:0.0068, inclination:0.0593, ascendingNode:0.7759 },
  { id:'earth', name:'地球', en:'Earth', type:'行星', typeEn:'Planet',
    diameter:12742, semiMajor:1.00, rotation:1, orbit:1,
    temp:'-88 ~ 58 ℃', moons:1,
    renderRadius:1.5, orbitRadius:26, orbitSpeed:1.0, rotSpeed:1.0,
    eccentricity:0.0167, inclination:0.0, ascendingNode:-1.7958 },
  { id:'mars', name:'火星', en:'Mars', type:'行星', typeEn:'Planet',
    diameter:6779, semiMajor:1.52, rotation:1.03, orbit:1.88,
    temp:'-153 ~ 20 ℃', moons:2,
    renderRadius:1.05, orbitRadius:34, orbitSpeed:0.53, rotSpeed:0.97,
    eccentricity:0.0934, inclination:0.0323, ascendingNode:-0.5054 },
  { id:'jupiter', name:'木星', en:'Jupiter', type:'行星', typeEn:'Planet',
    diameter:139820, semiMajor:5.20, rotation:0.41, orbit:11.86,
    temp:'-145 ℃', moons:95,
    renderRadius:4.5, orbitRadius:50, orbitSpeed:0.084, rotSpeed:2.4,
    eccentricity:0.0484, inclination:0.0228, ascendingNode:0.2566 },
  { id:'saturn', name:'土星', en:'Saturn', type:'行星', typeEn:'Planet',
    diameter:116460, semiMajor:9.54, rotation:0.45, orbit:29.46,
    temp:'-178 ℃', moons:146,
    renderRadius:3.8, orbitRadius:66, orbitSpeed:0.034, rotSpeed:2.2,
    eccentricity:0.0539, inclination:0.0435, ascendingNode:0.9067 },
  { id:'uranus', name:'天王星', en:'Uranus', type:'行星', typeEn:'Planet',
    diameter:50724, semiMajor:19.18, rotation:0.72, orbit:84.01,
    temp:'-224 ℃', moons:27, axialTilt:1.71,
    renderRadius:2.6, orbitRadius:80, orbitSpeed:0.0119, rotSpeed:1.4,
    eccentricity:0.0473, inclination:0.0135, ascendingNode:1.0240 },
  { id:'neptune', name:'海王星', en:'Neptune', type:'行星', typeEn:'Planet',
    diameter:49244, semiMajor:30.07, rotation:0.67, orbit:164.8,
    temp:'-218 ℃', moons:14,
    renderRadius:2.5, orbitRadius:92, orbitSpeed:0.006, rotSpeed:1.5,
    eccentricity:0.0086, inclination:0.0309, ascendingNode:-0.4793 },
];

export const DWARFS = [
  { id:'pluto', name:'冥王星', en:'Pluto', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:2376, semiMajor:39.48, rotation:6.39, orbit:248,
    temp:'-229 ℃', moons:5,
    renderRadius:0.7, orbitRadius:106, orbitSpeed:0.004, rotSpeed:0.38,
    eccentricity:0.2488, inclination:0.2992, ascendingNode:1.9178 },
  { id:'eris', name:'阋神星', en:'Eris', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:2326, semiMajor:67.78, rotation:1.08, orbit:558,
    temp:'-243 ℃', moons:1,
    renderRadius:0.68, orbitRadius:118, orbitSpeed:0.0018, rotSpeed:0.6,
    eccentricity:0.436, inclination:0.4785, ascendingNode:0.5926 },
  { id:'makemake', name:'鸟神星', en:'Makemake', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:1430, semiMajor:45.79, rotation:0.95, orbit:306,
    temp:'-240 ℃', moons:1,
    renderRadius:0.5, orbitRadius:112, orbitSpeed:0.0033, rotSpeed:0.5,
    eccentricity:0.159, inclination:0.5262, ascendingNode:0.6773 },
  { id:'haumea', name:'妊神星', en:'Haumea', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:1632, semiMajor:43.13, rotation:0.16, orbit:285,
    temp:'-241 ℃', moons:2, ellipsoid:true,
    renderRadius:0.55, orbitRadius:110, orbitSpeed:0.0035, rotSpeed:2.5,
    eccentricity:0.195, inclination:0.5051, ascendingNode:0.014 },
  { id:'gonggong', name:'共工星', en:'Gonggong', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:1230, semiMajor:67.5, rotation:0.93, orbit:554,
    temp:'-242 ℃', moons:1,
    renderRadius:0.52, orbitRadius:122, orbitSpeed:0.0018, rotSpeed:0.4,
    eccentricity:0.499, inclination:0.61, ascendingNode:2.009 },
  { id:'ceres', name:'谷神星', en:'Ceres', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:940, semiMajor:2.77, rotation:0.38, orbit:4.6,
    temp:'-105 ℃', moons:0, inBelt:true,
    renderRadius:0.35, orbitRadius:40, orbitSpeed:0.21, rotSpeed:0.5,
    eccentricity:0.0758, inclination:0.1843, ascendingNode:1.717 },
  { id:'quaoar', name:'创神星', en:'Quaoar', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:1110, semiMajor:43.69, rotation:0.74, orbit:288,
    temp:'-229 ℃', moons:1,
    renderRadius:0.45, orbitRadius:115, orbitSpeed:0.0034, rotSpeed:0.5,
    eccentricity:0.0392, inclination:0.14, ascendingNode:0.0 },
  { id:'orcus', name:'亡神星', en:'Orcus', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:910, semiMajor:39.42, rotation:1.2, orbit:248,
    temp:'-242 ℃', moons:1,
    renderRadius:0.42, orbitRadius:108, orbitSpeed:0.004, rotSpeed:0.4,
    eccentricity:0.226, inclination:0.388, ascendingNode:1.347 },
  { id:'ixion', name:'厄耳枯斯', en:'Ixion', type:'矮行星', typeEn:'Dwarf Planet',
    diameter:810, semiMajor:39.6, rotation:3.0, orbit:250,
    temp:'-240 ℃', moons:0,
    renderRadius:0.4, orbitRadius:114, orbitSpeed:0.0039, rotSpeed:0.2,
    eccentricity:0.241, inclination:0.409, ascendingNode:0.0 },
];

export const MOONS = [
  // 木星卫星
  { id:'io', name:'木卫一', en:'Io', parent:'jupiter', type:'卫星', typeEn:'Moon',
    diameter:3643, semiMajor:0.0028, rotation:1.77, orbit:0.0048, temp:'-143 ℃', moons:0,
    renderRadius:0.35, orbitRadius:7.5, orbitSpeed:8, rotSpeed:0.5 },
  { id:'europa', name:'木卫二', en:'Europa', parent:'jupiter', type:'卫星', typeEn:'Moon',
    diameter:3122, semiMajor:0.0045, rotation:3.55, orbit:0.0098, temp:'-171 ℃', moons:0,
    renderRadius:0.3, orbitRadius:9.5, orbitSpeed:5, rotSpeed:0.5 },
  { id:'ganymede', name:'木卫三', en:'Ganymede', parent:'jupiter', type:'卫星', typeEn:'Moon',
    diameter:5268, semiMajor:0.0072, rotation:7.15, orbit:0.0196, temp:'-163 ℃', moons:0,
    renderRadius:0.5, orbitRadius:12, orbitSpeed:3, rotSpeed:0.5 },
  { id:'callisto', name:'木卫四', en:'Callisto', parent:'jupiter', type:'卫星', typeEn:'Moon',
    diameter:4821, semiMajor:0.0126, rotation:16.69, orbit:0.0457, temp:'-139 ℃', moons:0,
    renderRadius:0.46, orbitRadius:15, orbitSpeed:1.8, rotSpeed:0.5 },
  // 土星卫星
  { id:'titan', name:'土卫六', en:'Titan', parent:'saturn', type:'卫星', typeEn:'Moon',
    diameter:5149, semiMajor:0.0082, rotation:15.95, orbit:0.0436, temp:'-179 ℃', moons:0,
    renderRadius:0.5, orbitRadius:10, orbitSpeed:3, rotSpeed:0.5 },
  { id:'enceladus', name:'土卫二', en:'Enceladus', parent:'saturn', type:'卫星', typeEn:'Moon',
    diameter:504, semiMajor:0.0016, rotation:1.37, orbit:0.00137, temp:'-201 ℃', moons:0,
    renderRadius:0.25, orbitRadius:7, orbitSpeed:9, rotSpeed:0.5 },
  { id:'mimas', name:'土卫一', en:'Mimas', parent:'saturn', type:'卫星', typeEn:'Moon',
    diameter:396, semiMajor:0.0013, rotation:0.94, orbit:0.00094, temp:'-204 ℃', moons:0,
    renderRadius:0.22, orbitRadius:8.2, orbitSpeed:11, rotSpeed:0.5 },
  { id:'iapetus', name:'土卫八', en:'Iapetus', parent:'saturn', type:'卫星', typeEn:'Moon',
    diameter:1469, semiMajor:0.0235, rotation:79.32, orbit:0.075, temp:'-171 ℃', moons:0,
    renderRadius:0.33, orbitRadius:16, orbitSpeed:1.0, rotSpeed:0.5 },
  // 地球卫星
  { id:'moon', name:'月球', en:'Moon', parent:'earth', type:'卫星', typeEn:'Moon',
    diameter:3474, semiMajor:0.0026, rotation:27.32, orbit:0.0748, temp:'-173 ~ 127 ℃', moons:0,
    renderRadius:0.4, orbitRadius:3.2, orbitSpeed:2.5, rotSpeed:0.3 },
];

// 标注的知名小行星
export const NAMED_ASTEROIDS = [
  { id:'vesta', name:'灶神星', en:'Vesta', type:'小行星', typeEn:'Asteroid',
    diameter:525, semiMajor:2.36, rotation:0.22, orbit:3.63, temp:'-85 ℃', moons:0 },
  { id:'pallas', name:'智神星', en:'Pallas', type:'小行星', typeEn:'Asteroid',
    diameter:512, semiMajor:2.77, rotation:0.33, orbit:4.61, temp:'-109 ℃', moons:0 },
];

export const ALL_BODIES = [SUN, ...PLANETS, ...DWARFS, ...MOONS, ...NAMED_ASTEROIDS];

export function findBody(id){ return ALL_BODIES.find(b=>b.id===id); }
export function searchBodies(q){
  const s=q.trim().toLowerCase(); if(!s) return [];
  return ALL_BODIES.filter(b=>
    b.name.includes(q.trim()) || b.en.toLowerCase().includes(s) || b.id.includes(s)
  ).slice(0,20);
}
