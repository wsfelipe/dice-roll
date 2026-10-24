import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export const iconToSvg = (icon: ReactElement): string => renderToStaticMarkup(icon);
