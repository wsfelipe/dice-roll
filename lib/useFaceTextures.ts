import { useEffect, useMemo, useState } from 'react';
import type { DiceSkin, FaceContent } from './types';
import { buildFaceTextures, type FaceTextures } from './faceTexture';
import { DIE_VALUES } from './faceBasis';

interface Entry { promise: Promise<FaceTextures>; refs: number }
const cache = new Map<string, Entry>();

export function useFaceTextures(skin: DiceSkin | ReturnType<typeof buildSkin>): FaceTextures | null {
  const key = useMemo(() => {
    if (skin && typeof skin === 'object' && 'bodyColor' in skin && 'faces' in skin) {
      const faceTypes = new Set<FaceContent['type']>();
      for (const v of DIE_VALUES) {
        const content = skin.faces[v].content;
        faceTypes.add(content.type);
      }
      if (faceTypes.size === 1) {
        const faceType = Array.from(faceTypes)[0];
        return `${skin.bodyColor}|${faceType}`;
      }
    }
    return JSON.stringify(skin);
  }, [skin]);
  const [textures, setTextures] = useState<FaceTextures | null>(null);

  useEffect(() => {
    let cancelled = false;
    let entry = cache.get(key);
    if (!entry) {
      entry = { refs: 0, promise: buildFaceTextures(skin) };
      cache.set(key, entry);
    }
    entry.refs++;
    const e = entry;
    e.promise.then((t) => !cancelled && setTextures(t)).catch((err) => console.error('[d6]', err));
    return () => {
      cancelled = true;
      if (--e.refs === 0) {
        cache.delete(key);
        e.promise.then((t) => Object.values(t).forEach((x) => x.dispose())).catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return textures;
}
