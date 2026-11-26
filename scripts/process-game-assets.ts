import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface SpriteSourceSpec {
  readonly key: string;
  readonly winterPath: string;
  readonly summerPath?: string;
  readonly maxWidth: number;
  readonly removeWhiteBg: boolean;
  readonly keepLargestComponentOnly?: boolean;
  readonly cropRightFraction?: number;
  readonly extraSeeds?: readonly (readonly [number, number])[];
  readonly anchorX: number;
  readonly anchorY: number;
}

interface ProcessedSprite {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly buffer: Buffer;
}

interface PackedSprite {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly buffer: Buffer;
}

const ROOT = process.cwd();
const GAME_ASSET_DIR = path.join(ROOT, 'assets', 'game_asset');
const SUMMER_ASSET_DIR = path.join(GAME_ASSET_DIR, 'summer-asset');
const OUTPUT_DIR = path.join(GAME_ASSET_DIR, 'compiled');
const GENERATED_TS_PATH = path.join(ROOT, 'src', 'game', 'town-atlas.ts');

// Max width tuned so all 34 sprites pack cleanly under 2048x2048 GPU limit per seasonal atlas
const SPRITE_SPECS: readonly SpriteSourceSpec[] = [
  {
    key: 'townHall',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Bear Town Hall.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Town Hall.jfif'),
    maxWidth: 360,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'bank',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Bear Bank Treasury.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Bank Treasury.jfif'),
    maxWidth: 340,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'blacksmith',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Yeti Blacksmith Shop.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Yeti Blacksmith.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'tradePost',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Fantasy Market Hall.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Market Trade Post.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.82,
  },
  {
    key: 'yetiLodge',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Yeti Cabin Game Icon.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Yeti Lodge.jfif'),
    maxWidth: 320,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'cottage',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Cottage with Glowing Windows.png'
    ),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Citizen Cottage.jfif'),
    maxWidth: 300,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'bakery',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Bakery Storefront.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Bakery.jfif'),
    maxWidth: 320,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.8,
  },
  {
    key: 'windmill',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Windmill Cottage.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Windmill.jfif'),
    maxWidth: 320,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'sawmill',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Sawmill Workshop.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Sawmill.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'builderShop',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Architect\u2019s Workshop.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Builder Workshop.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    extraSeeds: [[0.82, 0.28]],
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'yakBarn',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Barn Game Asset.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Yak Barn.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'cheeseCellar',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Alpine Cheese Creamery.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Cheese Cellar.jfif'),
    maxWidth: 310,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'fishingPier',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Winter Fishing Cabin Dock.png'
    ),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Fishing Pier.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'smokehouse',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Medieval Smokehouse Cottage.png'
    ),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Smokehouse.jfif'),
    maxWidth: 320,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'minehead',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Echo Cave Minehead.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'smelter',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Blast Furnace Smelter.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'barracks',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Town Watch Barracks.jfif'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Town Watch Barracks.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'guardWatchtower',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Guard Watchtower.jfif'),
    maxWidth: 250,
    removeWhiteBg: true,
    keepLargestComponentOnly: true,
    cropRightFraction: 0.67,
    anchorX: 0.5,
    anchorY: 0.88,
  },
  {
    key: 'snowballCatapult',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Snowball Catapult.jfif'),
    maxWidth: 270,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.82,
  },
  {
    key: 'iceTrap',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Ice Slick Trap.jfif'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.72,
  },
  {
    key: 'tavern',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Frosty Yeti Tavern.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'apothecary',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Apothecary Tailor Hut.jfif'),
    maxWidth: 320,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'greenhouse',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Sun Glass Greenhouse.jfif'),
    maxWidth: 330,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'grandMonument',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Grand Yeti Monument.jfif'),
    maxWidth: 310,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.86,
  },
  {
    key: 'constructionFoundation',
    winterPath: path.join(
      SUMMER_ASSET_DIR,
      'Summer Foundation Pit Construction.jfif'
    ),
    summerPath: path.join(
      SUMMER_ASSET_DIR,
      'Summer Foundation Pit Construction.jfif'
    ),
    maxWidth: 320,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.8,
  },
  {
    key: 'constructionFrame',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Timber House Under Construction.png'
    ),
    summerPath: path.join(
      SUMMER_ASSET_DIR,
      'Summer Timber Frame Construction.jfif'
    ),
    maxWidth: 320,
    removeWhiteBg: true,
    extraSeeds: [
      [0.25, 0.34],
      [0.42, 0.32],
      [0.72, 0.25],
      [0.78, 0.28],
      [0.83, 0.39],
      [0.52, 0.88],
      [0.6, 0.84],
    ],
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'constructionScaffold',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Cottage Under Construction.png'
    ),
    summerPath: path.join(
      SUMMER_ASSET_DIR,
      'Summer Cottage Scaffold Construction.jfif'
    ),
    maxWidth: 320,
    removeWhiteBg: true,
    extraSeeds: [
      [0.42, 0.14],
      [0.51, 0.17],
      [0.29, 0.23],
      [0.39, 0.27],
      [0.2, 0.31],
      [0.3, 0.35],
    ],
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'stoneWell',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Medieval Stone Well.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Stone Well.jfif'),
    maxWidth: 220,
    removeWhiteBg: true,
    extraSeeds: [
      [0.37, 0.57],
      [0.62, 0.56],
      [0.41, 0.42],
      [0.58, 0.48],
    ],
    anchorX: 0.5,
    anchorY: 0.86,
  },
  {
    key: 'streetLantern',
    winterPath: path.join(GAME_ASSET_DIR, 'Snowy Whimsical Lantern Post.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Street Lantern.jfif'),
    maxWidth: 140,
    removeWhiteBg: true,
    extraSeeds: [
      [0.64, 0.22],
      [0.51, 0.25],
    ],
    anchorX: 0.43,
    anchorY: 0.94,
  },
  {
    key: 'signpost',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Woodland Signpost with Barrels and Crate.png'
    ),
    maxWidth: 190,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.9,
  },
  {
    key: 'pineTree',
    winterPath: path.join(
      GAME_ASSET_DIR,
      'Snow-Covered Cartoon Pine Tree.png'
    ),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Pine Tree.jfif'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.9,
  },
  {
    key: 'pineSapling',
    winterPath: path.join(GAME_ASSET_DIR, 'Snow-Capped Cartoon Pine Tree.png'),
    summerPath: path.join(SUMMER_ASSET_DIR, 'Summer Pine Sapling.jfif'),
    maxWidth: 190,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.9,
  },
  {
    key: 'summerPine',
    winterPath: path.join(
      SUMMER_ASSET_DIR,
      'Cartoon Evergreen Tree Game Asset.png'
    ),
    summerPath: path.join(
      SUMMER_ASSET_DIR,
      'Cartoon Evergreen Tree Game Asset.png'
    ),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.9,
  },
  {
    key: 'yeti',
    winterPath: path.join(ROOT, 'assets', 'yeti', 'android-icon-background.png'),
    maxWidth: 120,
    removeWhiteBg: false,
    anchorX: 0.5,
    anchorY: 0.86,
  },
];

function isExteriorWhiteOrTransparent(
  data: Buffer,
  pixelOffset: number
): boolean {
  const r = data[pixelOffset];
  const g = data[pixelOffset + 1];
  const b = data[pixelOffset + 2];
  const a = data[pixelOffset + 3];

  if (a < 20) {
    return true;
  }

  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const chroma = maxC - minC;

  return minC >= 228 && chroma <= 24;
}

function stripExteriorWhiteBackground(
  data: Buffer,
  width: number,
  height: number,
  extraSeeds?: readonly (readonly [number, number])[]
): void {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueueIfBg = (x: number, y: number): void => {
    const idx = y * width + x;

    if (visited[idx] === 1) {
      return;
    }

    if (isExteriorWhiteOrTransparent(data, idx * 4)) {
      visited[idx] = 1;
      queue[tail] = idx;
      tail += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueueIfBg(0, y);
    enqueueIfBg(width - 1, y);
  }

  if (extraSeeds) {
    for (const [rx, ry] of extraSeeds) {
      const sx = Math.max(0, Math.min(width - 1, Math.round(rx * width)));
      const sy = Math.max(0, Math.min(height - 1, Math.round(ry * height)));

      enqueueIfBg(sx, sy);
    }
  }

  while (head < tail) {
    const idx = queue[head];

    head += 1;
    data[idx * 4 + 3] = 0;

    const x = idx % width;
    const y = (idx / width) | 0;

    if (x > 0) enqueueIfBg(x - 1, y);
    if (x + 1 < width) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y + 1 < height) enqueueIfBg(x, y + 1);
  }

  // Smoothly de-halo 2px anti-aliased whitish fringe adjacent to removed background
  let currentMask = visited;

  for (let pass = 0; pass < 2; pass += 1) {
    const nextMask = new Uint8Array(currentMask);

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = y * width + x;

        if (currentMask[idx] === 1) {
          continue;
        }

        const touchesBg =
          currentMask[idx - 1] === 1 ||
          currentMask[idx + 1] === 1 ||
          currentMask[idx - width] === 1 ||
          currentMask[idx + width] === 1;

        if (!touchesBg) {
          continue;
        }

        const p = idx * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const a = data[p + 3];

        if (a === 0) {
          nextMask[idx] = 1;
          continue;
        }

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum >= 208 && chroma <= 36) {
          const factor = Math.max(0, Math.min(1, (242 - lum) / 46));
          const newAlpha = Math.round(a * factor);

          data[p + 3] = newAlpha;

          if (newAlpha < 24) {
            data[p + 3] = 0;
            nextMask[idx] = 1;
          }
        }
      }
    }

    currentMask = nextMask;
  }
}

/**
 * Removes detached stray pixel smudges (such as floating generator artifacts)
 * while keeping the main sprite connected component intact.
 */
function keepLargestOpaqueComponent(
  data: Buffer,
  width: number,
  height: number
): void {
  const total = width * height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  let nextLabel = 1;
  let bestLabel = 0;
  let bestSize = 0;

  for (let start = 0; start < total; start += 1) {
    if (labels[start] !== 0 || data[start * 4 + 3] <= 24) {
      continue;
    }

    const label = nextLabel;

    nextLabel += 1;
    let head = 0;
    let tail = 0;

    labels[start] = label;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const idx = queue[head];

      head += 1;
      const x = idx % width;
      const y = (idx / width) | 0;

      const tryNeighbor = (nx: number, ny: number): void => {
        const nIdx = ny * width + nx;

        if (labels[nIdx] === 0 && data[nIdx * 4 + 3] > 24) {
          labels[nIdx] = label;
          queue[tail] = nIdx;
          tail += 1;
        }
      };

      if (x > 0) tryNeighbor(x - 1, y);
      if (x + 1 < width) tryNeighbor(x + 1, y);
      if (y > 0) tryNeighbor(x, y - 1);
      if (y + 1 < height) tryNeighbor(x, y + 1);
    }

    if (tail > bestSize) {
      bestSize = tail;
      bestLabel = label;
    }
  }

  for (let i = 0; i < total; i += 1) {
    if (labels[i] !== bestLabel) {
      data[i * 4 + 3] = 0;
    }
  }
}

function findAlphaBounds(
  data: Buffer,
  width: number,
  height: number
): { left: number; top: number; cropWidth: number; cropHeight: number } {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, cropWidth: width, cropHeight: height };
  }

  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);

  return {
    left,
    top,
    cropWidth: right - left + 1,
    cropHeight: bottom - top + 1,
  };
}

async function processSpriteFromPath(
  spec: SpriteSourceSpec,
  inputPath: string
): Promise<ProcessedSprite> {
  if (!existsSync(inputPath)) {
    throw new Error(`Missing source file for "${spec.key}": ${inputPath}`);
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(data);

  if (spec.cropRightFraction !== undefined) {
    const cutX = Math.floor(info.width * spec.cropRightFraction);

    for (let y = 0; y < info.height; y += 1) {
      for (let x = cutX; x < info.width; x += 1) {
        const p = (y * info.width + x) * 4;

        rgba[p] = 255;
        rgba[p + 1] = 255;
        rgba[p + 2] = 255;
        rgba[p + 3] = 0;
      }
    }
  }

  if (spec.removeWhiteBg) {
    stripExteriorWhiteBackground(rgba, info.width, info.height, spec.extraSeeds);

    if (spec.keepLargestComponentOnly) {
      keepLargestOpaqueComponent(rgba, info.width, info.height);
    }
  }

  const bounds = findAlphaBounds(rgba, info.width, info.height);

  const resized = await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.cropWidth,
      height: bounds.cropHeight,
    })
    .resize({
      width: spec.maxWidth,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    key: spec.key,
    width: resized.info.width,
    height: resized.info.height,
    anchorX: spec.anchorX,
    anchorY: spec.anchorY,
    buffer: resized.data,
  };
}

function packSpritesOnShelves(
  sprites: readonly ProcessedSprite[],
  atlasWidth: number,
  padding: number
): { packed: PackedSprite[]; atlasHeight: number } {
  const sorted = [...sprites].sort((a, b) => b.height - a.height);
  const packed: PackedSprite[] = [];

  let cursorX = padding;
  let cursorY = padding;
  let shelfHeight = 0;

  for (const sprite of sorted) {
    if (cursorX + sprite.width + padding > atlasWidth) {
      cursorX = padding;
      cursorY += shelfHeight + padding;
      shelfHeight = 0;
    }

    packed.push({
      key: sprite.key,
      x: cursorX,
      y: cursorY,
      width: sprite.width,
      height: sprite.height,
      anchorX: sprite.anchorX,
      anchorY: sprite.anchorY,
      buffer: sprite.buffer,
    });

    cursorX += sprite.width + padding;

    if (sprite.height > shelfHeight) {
      shelfHeight = sprite.height;
    }
  }

  const rawHeight = cursorY + shelfHeight + padding;
  const atlasHeight = Math.ceil(rawHeight / 16) * 16;

  return { packed, atlasHeight };
}

async function compileAtlas(
  sprites: readonly ProcessedSprite[],
  atlasWidth: number,
  outFileName: string
): Promise<{ packed: PackedSprite[]; atlasHeight: number }> {
  const { packed, atlasHeight } = packSpritesOnShelves(sprites, atlasWidth, 10);
  const atlasPath = path.join(OUTPUT_DIR, outFileName);

  const result = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      packed.map((s) => ({
        input: s.buffer,
        left: s.x,
        top: s.y,
      }))
    )
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(atlasPath);

  console.log(
    `    ${outFileName}: ${atlasWidth}x${atlasHeight} (${(result.size / 1024).toFixed(1)} KB)`
  );

  return { packed, atlasHeight };
}

function formatFrameMap(packed: readonly PackedSprite[]): string {
  const sortedByKey = [...packed].sort((a, b) => a.key.localeCompare(b.key));

  return sortedByKey
    .map(
      (s) =>
        `  ${s.key}: {\n    x: ${s.x},\n    y: ${s.y},\n    width: ${s.width},\n    height: ${s.height},\n    anchorX: ${s.anchorX},\n    anchorY: ${s.anchorY},\n  },`
    )
    .join('\n');
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(
    `1/3 Processing ${SPRITE_SPECS.length} Winter town buildings, defenses & props...`
  );

  const winterProcessed = await Promise.all(
    SPRITE_SPECS.map((spec) => processSpriteFromPath(spec, spec.winterPath))
  );

  const winterByKey = new Map<string, ProcessedSprite>();

  for (let i = 0; i < winterProcessed.length; i += 1) {
    winterByKey.set(winterProcessed[i].key, winterProcessed[i]);
  }

  console.log(
    `2/3 Processing ${SPRITE_SPECS.length} Summer snow-free buildings & props...`
  );

  const summerProcessed = await Promise.all(
    SPRITE_SPECS.map(async (spec) => {
      if (spec.summerPath !== undefined && existsSync(spec.summerPath)) {
        return processSpriteFromPath(spec, spec.summerPath);
      }

      const fallback = winterByKey.get(spec.key);

      if (fallback === undefined) {
        throw new Error(`Missing winter fallback for "${spec.key}"`);
      }

      return fallback;
    })
  );

  const atlasWidth = 1920;

  const [winterAtlas, summerAtlas] = await Promise.all([
    compileAtlas(winterProcessed, atlasWidth, 'town-atlas.webp'),
    compileAtlas(summerProcessed, atlasWidth, 'town-atlas-summer.webp'),
  ]);

  console.log('3/3 Generating typed dual-season manifest src/game/town-atlas.ts...');

  const sortedKeys = [...SPRITE_SPECS]
    .map((s) => s.key)
    .sort((a, b) => a.localeCompare(b));

  const tsContent = `// Auto-generated by scripts/process-game-assets.ts — do not edit manually.

export interface AtlasSpriteFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

export const TOWN_ATLAS_WIDTH = ${atlasWidth};
export const TOWN_ATLAS_HEIGHT = ${winterAtlas.atlasHeight};
export const TOWN_SUMMER_ATLAS_WIDTH = ${atlasWidth};
export const TOWN_SUMMER_ATLAS_HEIGHT = ${summerAtlas.atlasHeight};

export type TownSpriteKey =
${sortedKeys.map((k) => `  | '${k}'`).join('\n')};

export const TOWN_ATLAS_FRAMES = {
${formatFrameMap(winterAtlas.packed)}
} as const satisfies Record<TownSpriteKey, AtlasSpriteFrame>;

export const TOWN_SUMMER_ATLAS_FRAMES = {
${formatFrameMap(summerAtlas.packed)}
} as const satisfies Record<TownSpriteKey, AtlasSpriteFrame>;
`;

  writeFileSync(GENERATED_TS_PATH, tsContent, 'utf8');
  console.log('Done!');
}

void main();
