import { CanvasTexture, DataTexture, NearestFilter, RedFormat } from 'three';

let gradient: DataTexture | null = null;
export function getToonGradient(): DataTexture {
  if (!gradient) {
    gradient = new DataTexture(new Uint8Array([105, 185, 255]), 3, 1, RedFormat);
    gradient.minFilter = gradient.magFilter = NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

let shadow: CanvasTexture | null = null;
export function getShadowTexture(): CanvasTexture {
  if (!shadow) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    shadow = new CanvasTexture(c);
  }
  return shadow;
}
