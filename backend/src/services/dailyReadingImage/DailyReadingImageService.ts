import sharp from 'sharp';

export interface ReadingArtInput {
  title: string;
  verse: string;
  reference: string;
  readingDate: Date;
}

const SIZE = 1080;
const PAD = 110;
const USABLE = SIZE - PAD * 2;

// El Shaday palette.
const RED = '#D91F1F';
const RED_DEEP = '#8C0F14';
const CORAL = '#FF5A47';
const OFFWHITE = '#F7F2EC';
const GRAPHITE = '#111111';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Naive word-wrap by estimated glyph width. */
function wrap(text: string, fontSize: number, widthFactor = 0.56): string[] {
  const maxChars = Math.max(6, Math.floor(USABLE / (fontSize * widthFactor)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function tspans(lines: string[], x: number, lineHeight: number): string {
  return lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
}

const STAR = 'M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z';

function star(cx: number, cy: number, size: number, color: string, opacity = 1): string {
  const s = size / 100;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})"><path d="${STAR}" fill="${color}" opacity="${opacity}"/></g>`;
}

export const dailyReadingImageService = {
  /** Build the 1080×1080 art as an SVG string (El Shaday identity). */
  buildSvg(input: ReadingArtInput): string {
    const titleLines = wrap(input.title.toUpperCase(), 84, 0.6);
    const titleFont = titleLines.length > 2 ? 70 : 84;
    const verseLines = wrap(`“${input.verse}”`, 42);

    const dateLabel = input.readingDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const refFont = 46;
    const refText = input.reference;
    const refWidth = Math.min(USABLE, refText.length * refFont * 0.62 + 96);

    // Vertical layout anchored around the center.
    const titleY = 430 - (titleLines.length - 1) * titleFont * 0.5;
    const verseY = titleY + titleLines.length * titleFont * 1.02 + 90;
    const refY = verseY + verseLines.length * 52 + 96;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${RED_DEEP}"/>
      <stop offset="0.55" stop-color="${RED}"/>
      <stop offset="1" stop-color="${GRAPHITE}"/>
    </linearGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="3" fill="${OFFWHITE}"/>
    </pattern>
    <radialGradient id="fade" cx="0.9" cy="0.1" r="0.8">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="0.7" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="fadeMask"><rect width="${SIZE}" height="${SIZE}" fill="url(#fade)"/></mask>
    <style>
      .display { font-family: 'Bricolage Grotesque Variable','Bricolage Grotesque','Arial Black',Arial,sans-serif; font-weight: 800; }
      .body { font-family: 'Inter Variable',Inter,Arial,sans-serif; }
    </style>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#dots)" opacity="0.10" mask="url(#fadeMask)"/>

  ${star(150, 170, 46, CORAL, 0.95)}
  ${star(210, 140, 26, OFFWHITE, 0.9)}
  ${star(120, 220, 20, OFFWHITE, 0.7)}

  <text x="${SIZE / 2}" y="210" text-anchor="middle" class="display" fill="${OFFWHITE}"
        font-size="30" letter-spacing="10" opacity="0.85">KOINONIA CLASS · EL SHADAY</text>

  <text x="${SIZE / 2}" y="${titleY}" text-anchor="middle" class="display" fill="${OFFWHITE}"
        font-size="${titleFont}" letter-spacing="-2">${tspans(titleLines, SIZE / 2, titleFont * 1.02)}</text>

  <text x="${SIZE / 2}" y="${verseY}" text-anchor="middle" class="body" fill="${OFFWHITE}"
        font-size="42" opacity="0.92">${tspans(verseLines, SIZE / 2, 52)}</text>

  <rect x="${(SIZE - refWidth) / 2}" y="${refY - 46}" width="${refWidth}" height="72" rx="36" fill="${CORAL}"/>
  <text x="${SIZE / 2}" y="${refY}" text-anchor="middle" class="display" fill="#111"
        font-size="${refFont}" letter-spacing="-1">${escapeXml(refText)}</text>

  <text x="${PAD}" y="${SIZE - 70}" class="body" fill="${OFFWHITE}" font-size="28" opacity="0.85">${escapeXml(dateLabel)}</text>
  <text x="${SIZE - PAD}" y="${SIZE - 70}" text-anchor="end" class="body" fill="${OFFWHITE}" font-size="26" opacity="0.7">Leitura Diária</text>
</svg>`;
  },

  /** Rasterize the SVG art to a 1080×1080 PNG buffer. */
  async toPng(input: ReadingArtInput): Promise<Buffer> {
    const svg = this.buildSvg(input);
    return sharp(Buffer.from(svg)).png().toBuffer();
  },
};
