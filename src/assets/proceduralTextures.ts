import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

let snowCache: PbrTextureSet | null = null;
let timberCache: PbrTextureSet | null = null;
let stoneCache: PbrTextureSet | null = null;
let iceCache: { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } | null = null;
let fabricNormalCache: THREE.CanvasTexture | null = null;

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeat: number,
  isColor: boolean,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Deterministic pseudo-random helper so snow/wood grain stays crisp without jitter. */
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function getSnowTextures(): PbrTextureSet {
  if (snowCache) return snowCache;

  const size = 256;
  const [cCanvas, cCtx] = createCanvas(size);
  const [bCanvas, bCtx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);

  const cImg = cCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;

      // Tileable soft wind drifts + fine sparkle grain
      const drift =
        Math.sin(u * 2 + Math.cos(v * 2) * 0.6) * 0.5 +
        Math.cos(v * 3 - Math.sin(u) * 0.5) * 0.35 +
        Math.sin((u + v) * 5) * 0.15;
      const grain = hash2d(x, y);
      const glint = grain > 0.985 ? 1 : 0;

      const albedoBase = 238 + Math.round(drift * 6 + grain * 8);
      cImg.data[idx] = Math.min(255, albedoBase - 3);
      cImg.data[idx + 1] = Math.min(255, albedoBase + 1);
      cImg.data[idx + 2] = Math.min(255, albedoBase + 7);
      cImg.data[idx + 3] = 255;

      const bumpVal = Math.max(0, Math.min(255, Math.round(128 + drift * 42 + (grain - 0.5) * 28)));
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      // Powdery matte snow (~0.88 roughness) punctuated by micro-ice glints (~0.18 roughness)
      const roughVal = glint ? 46 : Math.round(212 + (grain - 0.5) * 24);
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  snowCache = {
    map: finalizeTexture(cCanvas, 7, true),
    bumpMap: finalizeTexture(bCanvas, 7, false),
    roughnessMap: finalizeTexture(rCanvas, 7, false),
  };
  return snowCache;
}

export function getTimberTextures(): PbrTextureSet {
  if (timberCache) return timberCache;

  const size = 256;
  const [cCanvas, cCtx] = createCanvas(size);
  const [bCanvas, bCtx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);

  cCtx.fillStyle = '#6f472d';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#c8c8c8';
  rCtx.fillRect(0, 0, size, size);

  const plankHeight = 32;
  for (let row = 0; row < size / plankHeight; row++) {
    const y0 = row * plankHeight;
    const shade = (hash2d(row, 11) - 0.5) * 22;
    cCtx.fillStyle = `rgb(${112 + shade}, ${71 + shade * 0.6}, ${44 + shade * 0.4})`;
    cCtx.fillRect(0, y0, size, plankHeight - 2);

    // Plank seam
    cCtx.fillStyle = '#3c2416';
    cCtx.fillRect(0, y0 + plankHeight - 2, size, 2);
    bCtx.fillStyle = '#252525';
    bCtx.fillRect(0, y0 + plankHeight - 2, size, 2);

    // Subtle wood fibers
    for (let i = 0; i < 24; i++) {
      const fy = y0 + 2 + hash2d(row, i + 30) * (plankHeight - 6);
      const alpha = 0.08 + hash2d(i, row) * 0.14;
      cCtx.fillStyle =
        i % 2 === 0 ? `rgba(52, 28, 16, ${alpha})` : `rgba(165, 118, 78, ${alpha * 0.6})`;
      cCtx.fillRect(0, fy, size, 1.5);

      bCtx.fillStyle = `rgba(165, 165, 165, ${alpha})`;
      bCtx.fillRect(0, fy, size, 1.5);
    }
  }

  timberCache = {
    map: finalizeTexture(cCanvas, 2, true),
    bumpMap: finalizeTexture(bCanvas, 2, false),
    roughnessMap: finalizeTexture(rCanvas, 2, false),
  };
  return timberCache;
}

export function getStoneCobbleTextures(): PbrTextureSet {
  if (stoneCache) return stoneCache;

  const size = 256;
  const [cCanvas, cCtx] = createCanvas(size);
  const [bCanvas, bCtx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);

  // Mortar base
  cCtx.fillStyle = '#5c6675';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#404040';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#dcdcdc';
  rCtx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 6;
  const rh = size / rows;
  const cw = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const seed = hash2d(c + 10, r + 20);
      const x = c * cw + offset + 2;
      const y = r * rh + 2;
      const w = cw - 4;
      const h = rh - 4;
      const tone = 115 + Math.round((seed - 0.5) * 42);
      cCtx.fillStyle = `rgb(${tone}, ${tone + 6}, ${tone + 15})`;
      cCtx.beginPath();
      cCtx.roundRect(x, y, w, h, 5);
      cCtx.fill();

      const bTone = 148 + Math.round((seed - 0.5) * 45);
      bCtx.fillStyle = `rgb(${bTone}, ${bTone}, ${bTone})`;
      bCtx.beginPath();
      bCtx.roundRect(x, y, w, h, 5);
      bCtx.fill();

      const rTone = 188 + Math.round((seed - 0.5) * 30);
      rCtx.fillStyle = `rgb(${rTone}, ${rTone}, ${rTone})`;
      rCtx.beginPath();
      rCtx.roundRect(x, y, w, h, 5);
      rCtx.fill();
    }
  }

  stoneCache = {
    map: finalizeTexture(cCanvas, 3, true),
    bumpMap: finalizeTexture(bCanvas, 3, false),
    roughnessMap: finalizeTexture(rCanvas, 3, false),
  };
  return stoneCache;
}

export function getIceTextures(): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  if (iceCache) return iceCache;

  const size = 256;
  const [bCanvas, bCtx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#242424';
  rCtx.fillRect(0, 0, size, size);

  // Subtle skate blades & frost swirls
  for (let i = 0; i < 36; i++) {
    const cx = hash2d(i, 1) * size;
    const cy = hash2d(i, 2) * size;
    const rad = 24 + hash2d(i, 3) * 65;
    const a0 = hash2d(i, 4) * Math.PI * 2;
    const a1 = a0 + 0.5 + hash2d(i, 5) * 1.4;

    bCtx.strokeStyle = 'rgba(220, 220, 220, 0.24)';
    bCtx.lineWidth = 1.2;
    bCtx.beginPath();
    bCtx.arc(cx, cy, rad, a0, a1);
    bCtx.stroke();

    rCtx.strokeStyle = 'rgba(130, 130, 130, 0.35)';
    rCtx.lineWidth = 1.5;
    rCtx.beginPath();
    rCtx.arc(cx, cy, rad, a0, a1);
    rCtx.stroke();
  }

  iceCache = {
    bumpMap: finalizeTexture(bCanvas, 2, false),
    roughnessMap: finalizeTexture(rCanvas, 2, false),
  };
  return iceCache;
}

/** High-frequency woven felt/wool normal map so winter coats, scarves, and fur feel tactile. */
export function getFabricNormalMap(): THREE.CanvasTexture {
  if (fabricNormalCache) return fabricNormalCache;

  const size = 128;
  const [canvas, ctx] = createCanvas(size);
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const weaveX = Math.sin(x * 1.1) * Math.cos(y * 0.55);
      const weaveY = Math.cos(y * 1.1) * Math.sin(x * 0.55);
      const fuzz = (hash2d(x, y) - 0.5) * 0.4;

      img.data[idx] = Math.max(0, Math.min(255, Math.round(128 + (weaveX + fuzz) * 45)));
      img.data[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + (weaveY + fuzz) * 45)));
      img.data[idx + 2] = 240;
      img.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  fabricNormalCache = finalizeTexture(canvas, 6, false);
  return fabricNormalCache;
}
