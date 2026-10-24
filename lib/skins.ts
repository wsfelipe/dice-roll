import type { DiceSkin, DiceSkinInput, DieValue, FaceContent, FaceStyle } from './types';
import { DIE_VALUES } from './faceBasis';

export const DEFAULT_FACE_DEFAULTS = {
  color: '#2A2438',
  fontFamily: '"Fredoka","Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif',
  fontWeight: 700 as string | number,
};

export function createSkin(input: DiceSkinInput = {}): DiceSkin {
  const faceDefaults = { ...DEFAULT_FACE_DEFAULTS, ...input.faceDefaults };
  const faces = {} as Record<DieValue, FaceStyle>;
  for (const v of DIE_VALUES) faces[v] = input.faces?.[v] ?? { content: { type: 'pips' } };
  return {
    bodyColor: input.bodyColor ?? '#FFFBF2',
    outlineColor: input.outlineColor ?? '#2A2438',
    outlineWidth: input.outlineWidth ?? 0.06,
    cornerRadius: input.cornerRadius ?? 0.14,
    textureSize: input.textureSize ?? 512,
    fonts: input.fonts ?? [],
    faceDefaults,
    faces,
  };
}

export const DEFAULT_SKIN = createSkin();

export function facesFrom(contents: FaceContent[], extra: Omit<FaceStyle, 'content'> = {}) {
  if (contents.length !== 6) throw new Error('facesFrom espera exatamente 6 conteúdos');
  const faces = {} as Record<DieValue, FaceStyle>;
  DIE_VALUES.forEach((v, i) => (faces[v] = { ...extra, content: contents[i] }));
  return faces;
}
export const textFaces = (texts: string[], extra?: Omit<FaceStyle, 'content'>) =>
  facesFrom(texts.map((text) => ({ type: 'text', text }) as const), extra);
export const emojiFaces = (emojis: string[], extra?: Omit<FaceStyle, 'content'>) =>
  facesFrom(emojis.map((emoji) => ({ type: 'emoji', emoji }) as const), extra);
export const imageFaces = (srcs: string[], extra?: Omit<FaceStyle, 'content'>) =>
  facesFrom(srcs.map((src) => ({ type: 'image', src, fit: 'cover' }) as const), extra);
