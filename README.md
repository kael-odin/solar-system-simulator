# Cinematic Solar System Simulator

A cinematic, fully-procedural Three.js solar system simulator in a single runnable web app.
Every texture, shader, font, and dataset is generated in-code — no external image/model/font assets.
Built with Three.js (r160) via importmap, post-processed with `EffectComposer` + `UnrealBloomPass`.

## Features

- 8 planets + Sun + Moon + Pluto, each with custom GLSL shaders (FBM, turbulence, cellular noise)
- 13 named moons across the Jupiter/Saturn systems (Io, Europa, Ganymede, Callisto, Titan, Enceladus, Mimas, Iapetus, ...)
- 8 additional dwarf planets (Eris, Makemake, Haumea, Gonggong, Ceres, Quaoar, Orcus, Ixion)
- Asteroid belt (300+ procedurally deformed rocks), Kuiper belt, Oort cloud halo
- Saturn rings with Cassini division, particle-scatter discard shader
- 8000+ background stars with chromatic twinkle, stochastic meteors
- Sun: boiling plasma surface, 3-layer corona sprites, sunspots, solar-wind particles
- Jupiter Great Red Spot with spiral/vortex structure, evolving bands
- Earth: night-side city lights, ocean specular, fresnel atmosphere
- CSS2D labels on every major body, auto-scaling with camera distance
- Interactions: focus-on-double-click, select-on-click, preset views, fuzzy search (zh/en), frosted-glass info & control panels, time-rate slider, orbit toggle, brightness, star density

## Run

Open `index.html` in a modern browser. No build step, no server strictly required — but ES modules need `http://`, not `file://`. Easiest:

```bash
npx serve .
# or
python -m http.server 8000
```

## Tech constraints honored

- Three.js only via importmap CDN (`three@0.160.0`, addons).
- No external textures / models / fonts — all procedural.
- Post-processing bloom mandatory.

## Project layout

```
index.html              # entry, importmap, CSS
src/main.js             # bootstrap, scene, render loop
src/shaders/            # GLSL: noise lib, planet/sun/ring/star shaders
src/bodies/             # body factories (sun, planets, moons, belts, dwarfs)
src/ui/                 # panels, search, labels, camera focus, presets
src/data/               # body metadata (diameter, orbit, period, temp, ...)
```

## Status

See `TODO.md` for per-body implementation progress.

## License

MIT
