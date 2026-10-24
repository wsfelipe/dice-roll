# Implementation Guide — Dice Roll 3D Lib

## Required files (src/d6/)

- types.ts — DieValue, FaceContent variants, DiceSkin, DiceSkinInput
- skins.ts — createSkin(), DEFAULT_SKIN, facesFrom(), textFaces(), emojiFaces(), imageFaces()
- faceBasis.ts — DIE_VALUES [1..6], FACE_BASIS, decalTransform(), restQuaternion()
- Die.tsx — forwardRef component with props: skin?, bodyColor?, faceType?, size, initial
- DiceTable.tsx — table scene, ref DiceSceneHandle
- DiceScene.tsx — 3D scene (lights, camera)
- rollPlan.ts — deterministic roll animations
- faceTexture.ts — drawFace(), drawContent(), buildFaceTextures()
- useFaceTextures.ts — texture cache / dispose
- toon.ts — MeshToonMaterial gradient
- layout.ts — die positioning
- index.ts — public exports

## Core rules (test-proven)

1. Uniform skin: buildSkin(bodyColor?, faceType?) creates DiceSkin with all 6 faces same type.
2. Pips follow number: PIP_LAYOUT defines dots per value (1=center, 2=diag, ... 6=3x2).
3. Text follows number: text uses c.text = String(v).
4. Image as dots: image uses PIP_LAYOUT[value] with roundRectPath + clip for rounded corners. Not a full-face image.
5. No mixed faces: if faceType is set, all 6 faces have same content type.
6. Roll result: only values returned (number[]), NOT the sum. Use last.join(', ') in UI.
7. Texture cache: useFaceTextures key = bodyColor|faceType for pips/text; JSON.stringify for others.

## Test / Example usage (see example/ folder)

```tsx
import { DiceTable, createSkin, type DiceSceneHandle } from '../src/d6';

const dice = [
  { id: 'a', skin: createSkin({ bodyColor: '#FFE9F1', faces: { 1..6: { content: { type: 'pips' } } } }) },
  { id: 'b', skin: createSkin({ bodyColor: '#FFE9F1', faces: { 1..6: { content: { type: 'image', src: '...' } } } }) },
];
```

## Dependencies
- react 18/19
- three >= 0.152
- @react-three/fiber
- vite
