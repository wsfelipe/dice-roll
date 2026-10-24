export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface PipsContent {
  type: 'pips';
  color?: string;
  glyph?: string;
  size?: number;
}
export interface TextContent {
  type: 'text';
  text: string;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  scale?: number;
  stroke?: string;
  strokeWidth?: number;
}
export interface EmojiContent {
  type: 'emoji';
  emoji: string;
  scale?: number;
}
export interface ImageContent {
  type: 'image';
  src: string;
  fit?: 'contain' | 'cover';
  padding?: number;
  radius?: number;
}
export interface SvgContent {
  type: 'svg';
  svg: string;
  color?: string;
  scale?: number;
}
export type FaceContent = PipsContent | TextContent | EmojiContent | ImageContent | SvgContent;

export interface FaceStyle {
  content: FaceContent;
  background?: string;
  border?: { color: string; width?: number };
}

export interface FontSource {
  family: string;
  src: string;
  weight?: string;
  style?: string;
}

export interface FaceDefaults {
  background?: string;
  color: string;
  fontFamily: string;
  fontWeight: string | number;
}

export interface DiceSkin {
  bodyColor: string;
  outlineColor: string;
  outlineWidth: number;
  cornerRadius: number;
  textureSize: number;
  faceDefaults: FaceDefaults;
  fonts: FontSource[];
  faces: Record<DieValue, FaceStyle>;
}

export type DiceSkinInput = Partial<Omit<DiceSkin, 'faces' | 'faceDefaults'>> & {
  faceDefaults?: Partial<FaceDefaults>;
  faces?: Partial<Record<DieValue, FaceStyle>>;
};
