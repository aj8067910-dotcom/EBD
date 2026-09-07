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

/**
 * Fits a block of text into a maximum height by shrinking the font until the
 * wrapped lines fit. As a last resort (extremely long text) it truncates and
 * appends an ellipsis so the block never overflows into the rest of the art.
 */
function fitBlock(
  text: string,
  opts: {
    maxFont: number;
    minFont: number;
    widthFactor: number;
    lineFactor: number;
    maxHeight: number;
    trailing?: string;
  },
): { fontSize: number; lines: string[]; lineHeight: number } {
  const { maxFont, minFont, widthFactor, lineFactor, maxHeight, trailing = '' } = opts;
  for (let f = maxFont; f >= minFont; f -= 2) {
    const lines = wrap(text, f, widthFactor);
    if (lines.length * f * lineFactor <= maxHeight) {
      return { fontSize: f, lines, lineHeight: f * lineFactor };
    }
  }
  const fontSize = minFont;
  const lineHeight = fontSize * lineFactor;
  let lines = wrap(text, fontSize, widthFactor);
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines.length - 1;
    lines[last] = (lines[last] ?? '').replace(/[\s"'“”]*$/, '') + `…${trailing}`;
  }
  return { fontSize, lines, lineHeight };
}

const STAR = 'M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z';

function star(cx: number, cy: number, size: number, color: string, opacity = 1): string {
  const s = size / 100;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})"><path d="${STAR}" fill="${color}" opacity="${opacity}"/></g>`;
}

export const dailyReadingImageService = {
  /** Build the 1080×1080 art as an SVG string (El Shaday identity). */
  buildSvg(input: ReadingArtInput): string {
    const dateLabel = input.readingDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Fixed anchors keep the reference capsule and footer clear of the verse,
    // no matter how long the verse is.
    const TITLE_TOP = 300;
    const REF_CENTER_Y = 905;
    const CAPSULE_H = 78;

    // Title: shrink so it stays within ~3 lines when possible.
    const title = fitBlock(input.title.toUpperCase(), {
      maxFont: 84,
      minFont: 46,
      widthFactor: 0.6,
      lineFactor: 1.05,
      maxHeight: 3 * 84 * 1.05,
    });
    const titleFont = title.fontSize;
    const titleLines = title.lines;
    const titleFirstBaseline = TITLE_TOP + titleFont;
    const titleBottom =
      titleFirstBaseline + (titleLines.length - 1) * title.lineHeight + titleFont * 0.15;

    // Verse: fit into the space between the title and the reference capsule.
    const verseTop = titleBottom + 56;
    const verseBottom = REF_CENTER_Y - CAPSULE_H / 2 - 54;
    const verseMaxH = Math.max(120, verseBottom - verseTop);
    const verse = fitBlock(`“${input.verse}”`, {
      maxFont: 46,
      minFont: 24,
      widthFactor: 0.54,
      lineFactor: 1.3,
      maxHeight: verseMaxH,
      trailing: '”',
    });
    const verseBlockH = verse.lines.length * verse.lineHeight;
    const verseFirstBaseline =
      verseTop + Math.max(0, (verseMaxH - verseBlockH) / 2) + verse.fontSize * 0.8;

    const refFont = 46;
    const refText = input.reference;
    const refWidth = Math.min(USABLE, refText.length * refFont * 0.62 + 96);
    const refY = REF_CENTER_Y + refFont * 0.34;

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

  <text x="${SIZE / 2}" y="${titleFirstBaseline}" text-anchor="middle" class="display" fill="${OFFWHITE}"
        font-size="${titleFont}" letter-spacing="-2">${tspans(titleLines, SIZE / 2, title.lineHeight)}</text>

  <text x="${SIZE / 2}" y="${verseFirstBaseline}" text-anchor="middle" class="body" fill="${OFFWHITE}"
        font-size="${verse.fontSize}" opacity="0.92">${tspans(verse.lines, SIZE / 2, verse.lineHeight)}</text>

  <rect x="${(SIZE - refWidth) / 2}" y="${REF_CENTER_Y - CAPSULE_H / 2}" width="${refWidth}" height="${CAPSULE_H}" rx="${CAPSULE_H / 2}" fill="${CORAL}"/>
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
