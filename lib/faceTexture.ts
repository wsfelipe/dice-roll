import { CanvasTexture, SRGBColorSpace } from 'three';
import type { DiceSkin, DieValue, FaceContent } from './types';
import { DIE_VALUES } from './faceBasis';

export type FaceTextures = Record<DieValue, CanvasTexture>;

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // obrigatório para usar a imagem como textura WebGL
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Falha ao carregar imagem do dado: ${src.slice(0, 80)}`));
      img.src = src;
    });
    p.catch(() => imageCache.delete(src));
    imageCache.set(src, p);
  }
  return p;
}

function svgToDataUrl(svg: string, color: string, px: number): string {
  const colored = svg.replace(/currentColor/g, color);
  const el = new DOMParser().parseFromString(colored, 'image/svg+xml').documentElement;
  if (!el.getAttribute('xmlns')) el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!el.getAttribute('viewBox')) {
    const w = parseFloat(el.getAttribute('width') ?? '24') || 24;
    const h = parseFloat(el.getAttribute('height') ?? '24') || 24;
    el.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  el.setAttribute('width', String(px));
  el.setAttribute('height', String(px));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(el))}`;
}

const loadedFonts = new Set<string>();
async function loadFonts(skin: DiceSkin) {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    skin.fonts.map(async (f) => {
      const key = `${f.family}|${f.src}|${f.weight ?? ''}|${f.style ?? ''}`;
      if (loadedFonts.has(key)) return;
      const face = new FontFace(f.family, `url("${f.src}")`, { weight: f.weight, style: f.style });
      await face.load();
      document.fonts.add(face);
      loadedFonts.add(key);
    }),
  );
  const wanted = new Set<string>();
  for (const v of DIE_VALUES) {
    const c = skin.faces[v].content;
    const d = skin.faceDefaults;
    if (c.type === 'text') wanted.add(`${c.fontWeight ?? d.fontWeight} 64px ${c.fontFamily ?? d.fontFamily}`);
    if (c.type === 'pips' && c.glyph) wanted.add(`${d.fontWeight} 64px ${d.fontFamily}`);
  }
  await Promise.all([...wanted].map((f) => document.fonts.load(f).catch(() => undefined)));
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

interface GlyphOpts {
  color: string;
  family: string;
  weight: string | number;
  stroke?: string;
  strokeWidth?: number;
  maxWidth?: number;
}
function drawGlyph(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, o: GlyphOpts) {
  const font = (p: number) => `${o.weight} ${p}px ${o.family}, ${EMOJI_FONT}`;
  ctx.font = font(px);
  if (o.maxWidth) {
    const w = ctx.measureText(text).width;
    if (w > o.maxWidth) {
      px *= o.maxWidth / w;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const yy = y + px * 0.04;
  if (o.stroke && o.strokeWidth) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.strokeWidth * px;
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(text, x, yy);
  }
  ctx.fillStyle = o.color;
  ctx.fillText(text, x, yy);
}

async function drawImageFit(
  ctx: CanvasRenderingContext2D, size: number, img: HTMLImageElement,
  fit: 'contain' | 'cover', padding: number, radius: number,
) {
  const pad = padding * size;
  const box = size - pad * 2;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = fit === 'cover' ? Math.max(box / iw, box / ih) : Math.min(box / iw, box / ih);
  const w = iw * s;
  const h = ih * s;
  ctx.save();
  roundRectPath(ctx, pad, pad, box, box, radius * size);
  ctx.clip();
  ctx.drawImage(img, size / 2 - w / 2, size / 2 - h / 2, w, h);
  ctx.restore();
}

async function drawContent(ctx: CanvasRenderingContext2D, size: number, value: DieValue, c: FaceContent, skin: DiceSkin) {
  const d = skin.faceDefaults;
  switch (c.type) {
    case 'pips': {
      const color = c.color ?? d.color;
      const diam = (c.size ?? 0.2) * size;
      for (const [gx, gy] of PIP_LAYOUT[value]) {
        const x = size / 2 + gx * size * 0.25;
        const y = size / 2 + gy * size * 0.25;
        if (c.glyph) {
          drawGlyph(ctx, c.glyph, x, y, diam * 1.2, { color, family: d.fontFamily, weight: d.fontWeight });
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, diam / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'text':
      drawGlyph(ctx, c.text, size / 2, size / 2, size * 0.62 * (c.scale ?? 1), {
        color: c.color ?? d.color,
        family: c.fontFamily ?? d.fontFamily,
        weight: c.fontWeight ?? d.fontWeight,
        stroke: c.stroke,
        strokeWidth: c.strokeWidth,
        maxWidth: size * 0.84,
      });
      break;
    case 'emoji':
      drawGlyph(ctx, c.emoji, size / 2, size / 2, size * 0.56 * (c.scale ?? 1), {
        color: '#000',
        family: EMOJI_FONT,
        weight: 400,
        maxWidth: size * 0.84,
      });
      break;
    case 'image': {
      // Imagem como pontos: usa layout dos pips conforme o valor (1-6)
      const img = await loadImage(c.src);
      const pts = PIP_LAYOUT[value] ?? [[0, 0]];
      const diam = (c.size ?? 0.2) * size;
      for (const [gx, gy] of pts) {
        const cx = size / 2 + gx * size * 0.25;
        const cy = size / 2 + gy * size * 0.25;
        const w = diam * 1.2;
        const h = diam * 1.2;
        const r = w * 0.3; // cantos arredondados
        roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, r);
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        ctx.restore();
      }
      break;
    }
    case 'svg': {
      const px = Math.round(size * 0.7 * (c.scale ?? 1));
      const img = await loadImage(svgToDataUrl(c.svg, c.color ?? d.color, px));
      const w = px;
      ctx.drawImage(img, size / 2 - w / 2, size / 2 - w / 2, w, w);
      break;
    }
  }
}

async function drawFace(ctx: CanvasRenderingContext2D, size: number, value: DieValue, skin: DiceSkin) {
  const face = skin.faces[value];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = face.background ?? skin.faceDefaults.background ?? skin.bodyColor;
  ctx.fillRect(0, 0, size, size);
  try {
    await drawContent(ctx, size, value, face.content, skin);
  } catch (err) {
    console.warn(`[d6] face ${value}:`, err);
    drawGlyph(ctx, '?', size / 2, size / 2, size * 0.5, {
      color: skin.faceDefaults.color, family: skin.faceDefaults.fontFamily, weight: skin.faceDefaults.fontWeight,
    });
  }
  if (face.border) {
    const w = (face.border.width ?? 0.04) * size;
    ctx.strokeStyle = face.border.color;
    ctx.lineWidth = w;
    ctx.strokeRect(w / 2, w / 2, size - w, size - w);
  }
}

export async function buildFaceTextures(skin: DiceSkin): Promise<FaceTextures> {
  await loadFonts(skin);
  const size = skin.textureSize;
  const entries = await Promise.all(
    DIE_VALUES.map(async (v) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      await drawFace(canvas.getContext('2d')!, size, v, skin);
      const tex = new CanvasTexture(canvas);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return [v, tex] as const;
    }),
  );
  return Object.fromEntries(entries) as FaceTextures;
}
