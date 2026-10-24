# 🎲 Dice Roll 3D

Biblioteca de dados 3D cartoon para React + Three.js (via @react-three/fiber).

## 📦 Instalação

```bash
npm install dice-roll-lib
# ou, se estiver usando TypeScript:
npm install -D @types/three
```

## 🚀 Uso rápido

```tsx
import { DiceTable, createSkin, type DiceSceneHandle } from 'dice-roll-lib';

const candy = createSkin({
  bodyColor: '#FFE9F1',
  outlineColor: '#3B1F4A',
  cornerRadius: 0.16,
  faces: {
    1: { background: '#FFD166', content: { type: 'emoji', emoji: '⭐' } },
    2: { background: '#06D6A0', content: { type: 'text', text: 'B', color: '#fff' } },
    3: { background: '#118AB2', content: { type: 'svg', svg: '<path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/>' } },
    4: { background: '#fff', content: { type: 'text', text: '4' } },
    5: { content: { type: 'pips', color: '#EF476F' } },
    6: { content: { type: 'pips', glyph: '🍒' } },
  },
});

function App() {
  const table = useRef<DiceSceneHandle>(null);
  const [busy, setBusy] = useState(false);

  const roll = async () => {
    setBusy(true);
    const values = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    await table.current?.roll(values);
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <div style={{ aspectRatio: '16 / 10', borderRadius: 24, overflow: 'hidden' }}>
        <DiceTable ref={table} dice={[{ id: 'a' }, { id: 'b', skin: candy }]} />
      </div>
      <button onClick={roll} disabled={busy}>Rolar</button>
    </div>
  );
}
```

## 📋 API

### `DiceTable`

Componente React que renderiza a mesa com os dados e a animação de rolagem.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `dice` | `DiceDef[]` | Lista de dados a serem exibidos |
| `ref` | `Ref<DiceSceneHandle>` | Referência para chamar `.roll()` |

```tsx
<DiceTable
  ref={table}
  dice={[
    { id: 'a' },
    { id: 'b', skin: candy },
    { id: 'c', skin: DEFAULT_SKIN },
  ]}
/>
```

### `DiceSceneHandle.roll()`

```ts
await table.current?.roll(values);
await table.current?.roll(values, { seed: 123 });
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `values` | `number[]` ou `{ [id: string]: number }` | Resultado final de cada dado |
| `options.seed?` | `number` | Seed para animação determinística (mesma seed = mesma animação) |

### `createSkin()`

Cria uma skin customizada para os dados.

| Opção | Tipo | Descrição |
|-------|------|-----------|
| `bodyColor` | `string` | Cor do corpo do dado |
| `outlineColor` | `string` | Cor do contorno |
| `cornerRadius` | `number` | Raio de arredondamento (0–0.5) |
| `faceDefaults` | `FaceContent` | Configuração padrão para todas as faces |
| `faces` | `Record<1 \| 2 \| 3 \| 4 \| 5 \| 6, FaceDef>` | Configuração por face |
| `fonts?` | `Font[]` | Fontes locais (carregadas via `@font-face`) |

### Tipos de conteúdo por face

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `pips` | Pontos clássicos (1–6) | `{ type: 'pips', color: '#EF476F' }` |
| `text` | Texto com fonte | `{ type: 'text', text: 'B', color: '#fff', stroke: '#046e55' }` |
| `emoji` | Emoji | `{ type: 'emoji', emoji: '⭐' }` |
| `svg` | SVG inline | `{ type: 'svg', svg: '<path.../>', color: '#fff' }` |
| `image` | Imagem (contain/cover) | `{ type: 'image', src: '/faces/gato.png', fit: 'cover' }` |

## 📐 Arquitetura

```
Camada de dados (puro, sem React)    Camada de render (R3F)              Camada de API
types.ts    skin/faces               Die.tsx        1 dado + animação    DiceTable.tsx  Canvas + câmera top-down
skins.ts    createSkin, facesFrom    DiceScene.tsx  mesa, luz, N dados  DiceSceneHandle.roll()
faceTexture.ts  canvas -> textura   useFaceTextures.ts  cache/dispose
rollPlan.ts  plano determinístico   toon.ts  gradiente cartoon + sombra
layout.ts    pouso/entrada, rng.ts    faceBasis.ts  normais/orientação
```

**Resultado controlado:** `rollPlan.ts` calcula a orientação final com a face `value` para cima
e anima `q(t) = rotação_residual(t) × alvo`; o resíduo decai a zero. Altura, quicadas,
eixos, voltas, ponto de entrada, pouso e inclinação final são sorteados (ou fixados por `seed`).
Não usa engine de física: nada pode "dar errado".

## ⚠️ Limites conhecidos

- A cor/arte da face cobre a área plana (1 − 2·cornerRadius); os cantos arredondados usam `bodyColor`.
- Imagens de outro domínio precisam de CORS (`Access-Control-Allow-Origin`).
- `frameloop="demand"`: só renderiza durante a animação.

## 🔧 Desenvolvimento

```bash
npm run dev    # Preview local (Vite)
npm run build  # Build de produção
```


Para implementar este projeto como biblioteka (`dice-roll-lib`) a partir deste repositório:

## 📝 Dependências

- React 18 → `@react-three/fiber@^8` · React 19 → `@react-three/fiber@^9`
- `three >= 0.152` (usa `colorSpace`).