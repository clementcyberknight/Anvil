import {
  Atlas,
  BlendMode,
  BlurStyle,
  Canvas,
  FilterMode,
  Group,
  MipmapMode,
  Oval,
  PaintStyle,
  Picture,
  Skia,
  type SkImage,
  type SkPicture,
  StrokeCap,
  StrokeJoin,
  TileMode,
  useClock,
  useImage,
  useRectBuffer,
  useRSXformBuffer,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TOWN_ATLAS_FRAMES, type TownSpriteKey } from '@/game/town-atlas';
import type { StoredLandPatch } from '@/game/town-db';
import {
  advanceVillagerRoute,
  createInitialVillagerRoutes,
  packVillagerRoutesToFlatBuffer,
  TOWN_VILLAGERS,
  VILLAGER_BUFFER_STRIDE,
  type VillagerRouteSegment,
} from '@/game/town-villagers';
import type { Season } from '@/game/types';
import {
  VILLAGER_CELL_SIZE,
  VILLAGER_FEET_ANCHOR_X,
  VILLAGER_FEET_ANCHOR_Y,
  VILLAGER_FRAMES_PER_DIR,
} from '@/game/villager-atlas';
import {
  BLOCK_GRID_SIZE,
  getTreeGrowthProgress,
  isBlockBlockedForSoil,
  type StoredValleyBuilding,
  VALLEY_BLOCK_COLS,
  VALLEY_BLOCK_PX,
  VALLEY_BLOCK_ROWS,
  VALLEY_BORDER_BLOCKS,
  VALLEY_BORDER_X,
  VALLEY_BORDER_Y,
  VALLEY_CULL_BUFFER_BLOCKS,
  VALLEY_LAKE_ZONE,
  VALLEY_PLAYABLE_BOUNDS,
  VALLEY_PLAZA_CENTER,
  VALLEY_SPAWN_FOCUS_X,
  VALLEY_SPAWN_FOCUS_Y,
  VALLEY_STREET_PROPS,
  VALLEY_STREET_SEGMENTS,
  VALLEY_TILE_COLS,
  VALLEY_TILE_PX,
  VALLEY_TILE_ROWS,
  VALLEY_WORLD_HEIGHT,
  VALLEY_WORLD_WIDTH,
  type ValleyPlantedTree,
} from '@/game/valley-zones';

const ZOOM_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const INITIAL_SCALE = 0.54;
const MAX_ZOOM_OUT_HORIZONTAL_BLOCKS = 10;
const MAX_ZOOM = 1.9;
const HYSTERESIS_MARGIN_BLOCKS = 2;
const VILLAGER_COUNT = TOWN_VILLAGERS.length;
const NPC_SPRITE_SCALE = 0.68;
const FOCUS_ZOOM_MIN_SCALE = 0.96;

const MIN_TOTAL_BX = -VALLEY_BORDER_BLOCKS;
const MAX_TOTAL_BX = VALLEY_BLOCK_COLS + VALLEY_BORDER_BLOCKS - 1;
const MIN_TOTAL_BY = -VALLEY_BORDER_BLOCKS;
const MAX_TOTAL_BY = VALLEY_BLOCK_ROWS + VALLEY_BORDER_BLOCKS - 1;

const LAKE_MIN_X = VALLEY_LAKE_ZONE.x;
const LAKE_MAX_X = VALLEY_LAKE_ZONE.x + VALLEY_LAKE_ZONE.width;
const LAKE_MIN_Y = VALLEY_LAKE_ZONE.y;
const LAKE_MAX_Y = VALLEY_LAKE_ZONE.y + VALLEY_LAKE_ZONE.height;

// Bounding box of the central village street network for fast viewport culling
const STREET_MIN_X = VALLEY_BORDER_X + 24 * VALLEY_BLOCK_PX;
const STREET_MAX_X = VALLEY_BORDER_X + 31 * VALLEY_BLOCK_PX;
const STREET_MIN_Y = VALLEY_BORDER_Y + 46 * VALLEY_BLOCK_PX;
const STREET_MAX_Y = VALLEY_BORDER_Y + 54 * VALLEY_BLOCK_PX;

interface VisibleBlockWindow {
  readonly minBx: number;
  readonly maxBx: number;
  readonly minBy: number;
  readonly maxBy: number;
}

interface DepthSortedProp {
  readonly sortY: number;
  readonly spriteKey: TownSpriteKey;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly drawWidth: number;
  readonly shadowRx: number;
  readonly shadowRy: number;
  readonly shadowOffsetY: number;
  readonly glowRadius: number;
  readonly flipX: boolean;
}

interface TownMapCanvasProps {
  readonly season: Season;
  readonly nowMs: number;
  readonly buildings: readonly StoredValleyBuilding[];
  readonly editingBuilding: StoredValleyBuilding | null;
  readonly isEditPlacementValid: boolean;
  readonly placedPatches: readonly StoredLandPatch[];
  readonly plantedTrees: readonly ValleyPlantedTree[];
  readonly focusedVillagerIndex: number | null;
  readonly onSelectVillager: (
    villagerIndex: number | null,
    targetNodeId?: string
  ) => void;
  readonly onMoveEditingBuilding: (blockX: number, blockY: number) => void;
  readonly onTileTap: (
    blockX: number,
    blockY: number,
    tileX: number,
    tileY: number
  ) => void;
  readonly onBlockLongPress: (blockX: number, blockY: number) => void;
}

function edgeHash(a: number, b: number, c: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;

  return (n - Math.floor(n)) * 2 - 1;
}

function computeCullWindow(
  camXVal: number,
  camYVal: number,
  scaleVal: number,
  viewW: number,
  viewH: number
): VisibleBlockWindow {
  'worklet';
  const viewLeft = -camXVal / scaleVal;
  const viewTop = -camYVal / scaleVal;
  const viewRight = (viewW - camXVal) / scaleVal;
  const viewBottom = (viewH - camYVal) / scaleVal;

  const invBlock = 1 / VALLEY_BLOCK_PX;
  const visMinBx = Math.floor((viewLeft - VALLEY_BORDER_X) * invBlock);
  const visMaxBx = Math.floor((viewRight - VALLEY_BORDER_X) * invBlock);
  const visMinBy = Math.floor((viewTop - VALLEY_BORDER_Y) * invBlock);
  const visMaxBy = Math.floor((viewBottom - VALLEY_BORDER_Y) * invBlock);

  return {
    minBx: Math.max(MIN_TOTAL_BX, visMinBx - VALLEY_CULL_BUFFER_BLOCKS),
    maxBx: Math.min(MAX_TOTAL_BX, visMaxBx + VALLEY_CULL_BUFFER_BLOCKS),
    minBy: Math.max(MIN_TOTAL_BY, visMinBy - VALLEY_CULL_BUFFER_BLOCKS),
    maxBy: Math.min(MAX_TOTAL_BY, visMaxBy + VALLEY_CULL_BUFFER_BLOCKS),
  };
}

function resolveTreeVisualScale(progress: number): number {
  if (progress < 0.3) {
    return 0.42;
  }

  if (progress < 0.65) {
    return 0.68;
  }

  if (progress < 1) {
    return 0.88;
  }

  return 1.06;
}

function resolveTreeSpriteKey(season: Season, progress: number): TownSpriteKey {
  if (season === 'SUMMER') {
    return 'summerPine';
  }

  if (progress < 0.65) {
    return 'pineSapling';
  }

  return 'pineTree';
}

/**
 * Viewport-culled native C++ SkPicture recorder for the 5,600-block 800s Alpine Town.
 * Renders ONLY the visible viewport + 5 blocks buffer on all 4 sides:
 * 1. Seamless infinite Snow/Grass repeat shader + feathered Pine Forest border.
 * 2. Connected 800s Village Street Network (Winter frosted trail / Summer dirt road).
 * 3. Uncut organic Fishing Lake.
 * 4. Fused organic Loamy Soil cleared 4x4 blocks.
 * 5. Unified 2.5D depth-sorted Buildings (all 16) + Living Growing Pine Trees.
 */
function recordVisibleWorldPicture(
  cullWindow: VisibleBlockWindow,
  season: Season,
  nowMs: number,
  meadowImage: SkImage | null,
  forestImage: SkImage | null,
  streetImage: SkImage | null,
  lakeImage: SkImage | null,
  soilImage: SkImage | null,
  townAtlasImage: SkImage | null,
  buildings: readonly StoredValleyBuilding[],
  editingBuilding: StoredValleyBuilding | null,
  isEditPlacementValid: boolean,
  placedPatches: readonly StoredLandPatch[],
  plantedTrees: readonly ValleyPlantedTree[]
): SkPicture | null {
  if (meadowImage === null) {
    return null;
  }

  const winX = VALLEY_BORDER_X + cullWindow.minBx * VALLEY_BLOCK_PX;
  const winY = VALLEY_BORDER_Y + cullWindow.minBy * VALLEY_BLOCK_PX;
  const winW = (cullWindow.maxBx - cullWindow.minBx + 1) * VALLEY_BLOCK_PX;
  const winH = (cullWindow.maxBy - cullWindow.minBy + 1) * VALLEY_BLOCK_PX;
  const winRect = Skia.XYWHRect(winX, winY, winW, winH);

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(winRect);

  const meadowShader = meadowImage.makeShaderOptions(
    TileMode.Repeat,
    TileMode.Repeat,
    FilterMode.Linear,
    MipmapMode.Linear
  );

  const meadowPaint = Skia.Paint();

  meadowPaint.setAntiAlias(true);
  meadowPaint.setShader(meadowShader);

  const touchesForestEdge =
    cullWindow.minBx < 0 ||
    cullWindow.maxBx >= VALLEY_BLOCK_COLS ||
    cullWindow.minBy < 0 ||
    cullWindow.maxBy >= VALLEY_BLOCK_ROWS;

  if (touchesForestEdge && forestImage !== null) {
    const forestShader = forestImage.makeShaderOptions(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
      MipmapMode.Linear
    );

    const forestPaint = Skia.Paint();

    forestPaint.setAntiAlias(true);
    forestPaint.setShader(forestShader);

    canvas.drawRect(winRect, forestPaint);

    const clearingMaskPaint = Skia.Paint();

    clearingMaskPaint.setAntiAlias(true);
    clearingMaskPaint.setColor(Skia.Color('#FFFFFF'));
    clearingMaskPaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 26, true)
    );

    const maskedMeadowPaint = Skia.Paint();

    maskedMeadowPaint.setAntiAlias(true);
    maskedMeadowPaint.setBlendMode(BlendMode.SrcIn);
    maskedMeadowPaint.setShader(meadowShader);

    canvas.saveLayer(undefined, winRect);
    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          VALLEY_PLAYABLE_BOUNDS.x - 16,
          VALLEY_PLAYABLE_BOUNDS.y - 16,
          VALLEY_PLAYABLE_BOUNDS.width + 32,
          VALLEY_PLAYABLE_BOUNDS.height + 32
        ),
        140,
        140
      ),
      clearingMaskPaint
    );
    canvas.drawRect(winRect, maskedMeadowPaint);
    canvas.restore();
  } else {
    canvas.drawRect(winRect, meadowPaint);
  }

  // Pass 2: Connected 800s Village Streets (culled outside central town district)
  const streetsVisible =
    streetImage !== null &&
    winX < STREET_MAX_X &&
    winX + winW > STREET_MIN_X &&
    winY < STREET_MAX_Y &&
    winY + winH > STREET_MIN_Y;

  if (streetsVisible) {
    const streetLayerBounds = Skia.XYWHRect(
      Math.max(winX, STREET_MIN_X - 60),
      Math.max(winY, STREET_MIN_Y - 60),
      Math.min(winX + winW, STREET_MAX_X + 60) - Math.max(winX, STREET_MIN_X - 60),
      Math.min(winY + winH, STREET_MAX_Y + 60) - Math.max(winY, STREET_MIN_Y - 60)
    );

    const rimPaint = Skia.Paint();

    rimPaint.setAntiAlias(true);
    rimPaint.setStyle(PaintStyle.Stroke);
    rimPaint.setStrokeCap(StrokeCap.Round);
    rimPaint.setStrokeJoin(StrokeJoin.Round);
    rimPaint.setColor(
      Skia.Color(
        season === 'WINTER'
          ? 'rgba(136, 166, 206, 0.36)'
          : 'rgba(138, 108, 56, 0.38)'
      )
    );
    rimPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));

    for (let i = 0; i < VALLEY_STREET_SEGMENTS.length; i += 1) {
      const seg = VALLEY_STREET_SEGMENTS[i];

      rimPaint.setStrokeWidth(seg.width + 18);
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, rimPaint);
    }

    const streetMaskStroke = Skia.Paint();

    streetMaskStroke.setAntiAlias(true);
    streetMaskStroke.setStyle(PaintStyle.Stroke);
    streetMaskStroke.setStrokeCap(StrokeCap.Round);
    streetMaskStroke.setStrokeJoin(StrokeJoin.Round);
    streetMaskStroke.setColor(Skia.Color('#FFFFFF'));
    streetMaskStroke.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 8, true)
    );

    const streetMaskFill = Skia.Paint();

    streetMaskFill.setAntiAlias(true);
    streetMaskFill.setColor(Skia.Color('#FFFFFF'));
    streetMaskFill.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true)
    );

    canvas.saveLayer(undefined, streetLayerBounds);

    for (let i = 0; i < VALLEY_STREET_SEGMENTS.length; i += 1) {
      const seg = VALLEY_STREET_SEGMENTS[i];

      streetMaskStroke.setStrokeWidth(seg.width);
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, streetMaskStroke);
    }

    canvas.drawOval(
      Skia.XYWHRect(
        VALLEY_PLAZA_CENTER.x - VALLEY_PLAZA_CENTER.rx,
        VALLEY_PLAZA_CENTER.y - VALLEY_PLAZA_CENTER.ry,
        VALLEY_PLAZA_CENTER.rx * 2,
        VALLEY_PLAZA_CENTER.ry * 2
      ),
      streetMaskFill
    );

    const streetShader = streetImage.makeShaderOptions(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
      MipmapMode.Linear
    );

    const streetFillPaint = Skia.Paint();

    streetFillPaint.setAntiAlias(true);
    streetFillPaint.setBlendMode(BlendMode.SrcIn);
    streetFillPaint.setShader(streetShader);

    canvas.drawRect(streetLayerBounds, streetFillPaint);
    canvas.restore();
  }

  // Pass 3: Uncut Fishing Lake (drawn ONLY when cullWindow intersects the lake)
  const lakeVisible =
    lakeImage !== null &&
    winX < LAKE_MAX_X &&
    winX + winW > LAKE_MIN_X &&
    winY < LAKE_MAX_Y &&
    winY + winH > LAKE_MIN_Y;

  if (lakeVisible) {
    const lakePaint = Skia.Paint();

    lakePaint.setAntiAlias(true);

    canvas.drawImageRect(
      lakeImage,
      Skia.XYWHRect(0, 0, lakeImage.width(), lakeImage.height()),
      Skia.XYWHRect(
        VALLEY_LAKE_ZONE.x,
        VALLEY_LAKE_ZONE.y,
        VALLEY_LAKE_ZONE.width,
        VALLEY_LAKE_ZONE.height
      ),
      lakePaint
    );
  }

  // Pass 4: Viewport-culled organic Loamy Soil patches (ONLY blocks inside cullWindow)
  if (soilImage !== null && placedPatches.length > 0) {
    const occupied = new Set<number>();
    const visiblePatches: StoredLandPatch[] = [];

    let soilMinX = winX + winW;
    let soilMinY = winY + winH;
    let soilMaxX = winX;
    let soilMaxY = winY;

    for (let i = 0; i < placedPatches.length; i += 1) {
      const p = placedPatches[i];

      if (
        p.kind !== 'PLANTING' ||
        isBlockBlockedForSoil(p.blockX, p.blockY)
      ) {
        continue;
      }

      occupied.add(p.blockY * VALLEY_BLOCK_COLS + p.blockX);

      if (
        p.blockX >= cullWindow.minBx &&
        p.blockX <= cullWindow.maxBx &&
        p.blockY >= cullWindow.minBy &&
        p.blockY <= cullWindow.maxBy
      ) {
        visiblePatches.push(p);

        const bx = VALLEY_BORDER_X + p.blockX * VALLEY_BLOCK_PX;
        const by = VALLEY_BORDER_Y + p.blockY * VALLEY_BLOCK_PX;

        soilMinX = Math.min(soilMinX, bx);
        soilMinY = Math.min(soilMinY, by);
        soilMaxX = Math.max(soilMaxX, bx + VALLEY_BLOCK_PX);
        soilMaxY = Math.max(soilMaxY, by + VALLEY_BLOCK_PX);
      }
    }

    if (visiblePatches.length > 0) {
      const pad = 48;
      const layerLeft = Math.max(winX, soilMinX - pad);
      const layerTop = Math.max(winY, soilMinY - pad);
      const layerRight = Math.min(winX + winW, soilMaxX + pad);
      const layerBottom = Math.min(winY + winH, soilMaxY + pad);

      const soilLayerBounds = Skia.XYWHRect(
        layerLeft,
        layerTop,
        Math.max(1, layerRight - layerLeft),
        Math.max(1, layerBottom - layerTop)
      );

      const maskPaint = Skia.Paint();

      maskPaint.setAntiAlias(true);
      maskPaint.setColor(Skia.Color('#FFFFFF'));
      maskPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 14, true)
      );

      const corePaint = Skia.Paint();

      corePaint.setAntiAlias(true);
      corePaint.setColor(Skia.Color('#FFFFFF'));

      const hasNeighbor = (bx: number, by: number): boolean =>
        occupied.has(by * VALLEY_BLOCK_COLS + bx);

      const moundSteps = 4;
      const stepSpan = VALLEY_BLOCK_PX / moundSteps;

      canvas.saveLayer(undefined, soilLayerBounds);

      for (let i = 0; i < visiblePatches.length; i += 1) {
        const p = visiblePatches[i];
        const x = VALLEY_BORDER_X + p.blockX * VALLEY_BLOCK_PX;
        const y = VALLEY_BORDER_Y + p.blockY * VALLEY_BLOCK_PX;

        const topOpen = !hasNeighbor(p.blockX, p.blockY - 1);
        const bottomOpen = !hasNeighbor(p.blockX, p.blockY + 1);
        const leftOpen = !hasNeighbor(p.blockX - 1, p.blockY);
        const rightOpen = !hasNeighbor(p.blockX + 1, p.blockY);

        const insetTop = topOpen ? 16 : -4;
        const insetBottom = bottomOpen ? 16 : -4;
        const insetLeft = leftOpen ? 16 : -4;
        const insetRight = rightOpen ? 16 : -4;

        canvas.drawRRect(
          Skia.RRectXY(
            Skia.XYWHRect(
              x + insetLeft,
              y + insetTop,
              VALLEY_BLOCK_PX - insetLeft - insetRight,
              VALLEY_BLOCK_PX - insetTop - insetBottom
            ),
            26,
            26
          ),
          maskPaint
        );

        if (topOpen) {
          for (let m = 0; m < moundSteps; m += 1) {
            const h = edgeHash(p.blockX, p.blockY, m + 10);
            const cx = x + (m + 0.5) * stepSpan + h * 10;
            const cy = y + 18 + h * 6;
            const radX = stepSpan * 0.52 + h * 6;
            const radY = 20 + Math.abs(h) * 8;

            canvas.drawOval(
              Skia.XYWHRect(cx - radX, cy - radY, radX * 2, radY * 2),
              maskPaint
            );
          }
        }

        if (bottomOpen) {
          for (let m = 0; m < moundSteps; m += 1) {
            const h = edgeHash(p.blockX, p.blockY, m + 30);
            const cx = x + (m + 0.5) * stepSpan + h * 10;
            const cy = y + VALLEY_BLOCK_PX - 18 + h * 6;
            const radX = stepSpan * 0.52 + h * 6;
            const radY = 20 + Math.abs(h) * 8;

            canvas.drawOval(
              Skia.XYWHRect(cx - radX, cy - radY, radX * 2, radY * 2),
              maskPaint
            );
          }
        }

        if (leftOpen) {
          for (let m = 0; m < moundSteps; m += 1) {
            const h = edgeHash(p.blockX, p.blockY, m + 50);
            const cx = x + 18 + h * 6;
            const cy = y + (m + 0.5) * stepSpan + h * 10;
            const radX = 20 + Math.abs(h) * 8;
            const radY = stepSpan * 0.52 + h * 6;

            canvas.drawOval(
              Skia.XYWHRect(cx - radX, cy - radY, radX * 2, radY * 2),
              maskPaint
            );
          }
        }

        if (rightOpen) {
          for (let m = 0; m < moundSteps; m += 1) {
            const h = edgeHash(p.blockX, p.blockY, m + 70);
            const cx = x + VALLEY_BLOCK_PX - 18 + h * 6;
            const cy = y + (m + 0.5) * stepSpan + h * 10;
            const radX = 20 + Math.abs(h) * 8;
            const radY = stepSpan * 0.52 + h * 6;

            canvas.drawOval(
              Skia.XYWHRect(cx - radX, cy - radY, radX * 2, radY * 2),
              maskPaint
            );
          }
        }
      }

      for (let i = 0; i < visiblePatches.length; i += 1) {
        const p = visiblePatches[i];
        const x = VALLEY_BORDER_X + p.blockX * VALLEY_BLOCK_PX;
        const y = VALLEY_BORDER_Y + p.blockY * VALLEY_BLOCK_PX;

        const insetTop = hasNeighbor(p.blockX, p.blockY - 1) ? 0 : 28;
        const insetBottom = hasNeighbor(p.blockX, p.blockY + 1) ? 0 : 28;
        const insetLeft = hasNeighbor(p.blockX - 1, p.blockY) ? 0 : 28;
        const insetRight = hasNeighbor(p.blockX + 1, p.blockY) ? 0 : 28;

        canvas.drawRect(
          Skia.XYWHRect(
            x + insetLeft,
            y + insetTop,
            VALLEY_BLOCK_PX - insetLeft - insetRight,
            VALLEY_BLOCK_PX - insetTop - insetBottom
          ),
          corePaint
        );
      }

      const soilShader = soilImage.makeShaderOptions(
        TileMode.Repeat,
        TileMode.Repeat,
        FilterMode.Linear,
        MipmapMode.Linear
      );

      const soilPaint = Skia.Paint();

      soilPaint.setAntiAlias(true);
      soilPaint.setBlendMode(BlendMode.SrcIn);
      soilPaint.setShader(soilShader);

      canvas.drawRect(soilLayerBounds, soilPaint);
      canvas.restore();
    }
  }

  // Pass 4.5: Glowing 4x4 Placement Footprint Pad while Moving/Rotating a Building
  if (editingBuilding !== null) {
    const padX = VALLEY_BORDER_X + editingBuilding.blockX * VALLEY_BLOCK_PX;
    const padY = VALLEY_BORDER_Y + editingBuilding.blockY * VALLEY_BLOCK_PX;

    const padFillPaint = Skia.Paint();

    padFillPaint.setAntiAlias(true);
    padFillPaint.setColor(
      Skia.Color(
        isEditPlacementValid
          ? 'rgba(64, 167, 252, 0.24)'
          : 'rgba(239, 68, 68, 0.30)'
      )
    );

    const padStrokePaint = Skia.Paint();

    padStrokePaint.setAntiAlias(true);
    padStrokePaint.setStyle(PaintStyle.Stroke);
    padStrokePaint.setStrokeWidth(7);
    padStrokePaint.setColor(
      Skia.Color(isEditPlacementValid ? '#40A7FC' : '#EF4444')
    );

    const padRRect = Skia.RRectXY(
      Skia.XYWHRect(
        padX + 10,
        padY + 10,
        VALLEY_BLOCK_PX - 20,
        VALLEY_BLOCK_PX - 20
      ),
      26,
      26
    );

    canvas.drawRRect(padRRect, padFillPaint);
    canvas.drawRRect(padRRect, padStrokePaint);
  }

  // Pass 5: Unified Viewport-Culled 2.5D Depth-Sorted Buildings + Growing Pine Trees
  if (townAtlasImage !== null) {
    const props: DepthSortedProp[] = [];

    for (let i = 0; i < buildings.length; i += 1) {
      const rawBld = buildings[i];

      const isEdited =
        editingBuilding !== null && rawBld.id === editingBuilding.id;

      const bld = isEdited ? editingBuilding : rawBld;

      if (
        bld.blockX < cullWindow.minBx ||
        bld.blockX > cullWindow.maxBx ||
        bld.blockY < cullWindow.minBy ||
        bld.blockY > cullWindow.maxBy
      ) {
        continue;
      }

      const anchorX = VALLEY_BORDER_X + (bld.blockX + 0.5) * VALLEY_BLOCK_PX;
      const baseAnchorY = VALLEY_BORDER_Y + (bld.blockY + 0.88) * VALLEY_BLOCK_PX;
      const anchorY = isEdited ? baseAnchorY - 12 : baseAnchorY;
      const flipX = bld.facing === 1 || bld.facing === 3;

      props.push({
        sortY: baseAnchorY + (isEdited ? 2 : 0),
        spriteKey: bld.spriteKey,
        anchorX,
        anchorY,
        drawWidth: bld.drawWidth,
        shadowRx: bld.drawWidth * 0.43,
        shadowRy: bld.drawWidth * 0.15,
        shadowOffsetY: isEdited ? 20 : 8,
        glowRadius: 0,
        flipX,
      });
    }

    // Viewport-culled 800s Street Realism Props (Plaza Well, Glowing Lanterns, Signposts)
    for (let i = 0; i < VALLEY_STREET_PROPS.length; i += 1) {
      const sp = VALLEY_STREET_PROPS[i];

      if (
        sp.x < winX - 180 ||
        sp.x > winX + winW + 180 ||
        sp.y < winY - 180 ||
        sp.y > winY + winH + 180
      ) {
        continue;
      }

      props.push({
        sortY: sp.y,
        spriteKey: sp.spriteKey,
        anchorX: sp.x,
        anchorY: sp.y,
        drawWidth: sp.drawWidth,
        shadowRx: sp.drawWidth * 0.4,
        shadowRy: sp.drawWidth * 0.15,
        shadowOffsetY: 5,
        glowRadius: sp.glowRadius ?? 0,
        flipX: false,
      });
    }

    const minVisTx = cullWindow.minBx * BLOCK_GRID_SIZE;
    const maxVisTx = (cullWindow.maxBx + 1) * BLOCK_GRID_SIZE - 1;
    const minVisTy = cullWindow.minBy * BLOCK_GRID_SIZE;
    const maxVisTy = (cullWindow.maxBy + 1) * BLOCK_GRID_SIZE - 1;

    for (let i = 0; i < plantedTrees.length; i += 1) {
      const tree = plantedTrees[i];

      if (
        tree.tileX < minVisTx ||
        tree.tileX > maxVisTx ||
        tree.tileY < minVisTy ||
        tree.tileY > maxVisTy
      ) {
        continue;
      }

      const progress = getTreeGrowthProgress(tree, nowMs);
      const treeScale = resolveTreeVisualScale(progress);
      const drawWidth = Math.round(145 * treeScale);
      const anchorX = VALLEY_BORDER_X + (tree.tileX + 0.5) * VALLEY_TILE_PX;
      const anchorY = VALLEY_BORDER_Y + (tree.tileY + 0.82) * VALLEY_TILE_PX;

      props.push({
        sortY: anchorY,
        spriteKey: resolveTreeSpriteKey(season, progress),
        anchorX,
        anchorY,
        drawWidth,
        shadowRx: drawWidth * 0.34,
        shadowRy: drawWidth * 0.13,
        shadowOffsetY: 4,
        glowRadius: 0,
        flipX: false,
      });
    }

    if (props.length > 0) {
      props.sort((a, b) => a.sortY - b.sortY);

      const shadowPaint = Skia.Paint();

      shadowPaint.setAntiAlias(true);
      shadowPaint.setColor(
        Skia.Color(
          season === 'WINTER'
            ? 'rgba(116, 152, 206, 0.30)'
            : 'rgba(34, 72, 38, 0.24)'
        )
      );

      const lanternGlowPaint = Skia.Paint();

      lanternGlowPaint.setAntiAlias(true);
      lanternGlowPaint.setColor(
        Skia.Color(
          season === 'WINTER'
            ? 'rgba(255, 214, 102, 0.28)'
            : 'rgba(255, 224, 130, 0.18)'
        )
      );
      lanternGlowPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 18, true)
      );

      const spritePaint = Skia.Paint();

      spritePaint.setAntiAlias(true);

      for (let i = 0; i < props.length; i += 1) {
        const item = props[i];
        const frame = TOWN_ATLAS_FRAMES[item.spriteKey];
        const scale = item.drawWidth / frame.width;
        const drawHeight = frame.height * scale;
        const dstX = item.anchorX - item.drawWidth * frame.anchorX;
        const dstY = item.anchorY - drawHeight * frame.anchorY;

        if (item.glowRadius > 0) {
          canvas.drawOval(
            Skia.XYWHRect(
              item.anchorX - item.glowRadius,
              item.anchorY - item.glowRadius * 0.52,
              item.glowRadius * 2,
              item.glowRadius * 1.04
            ),
            lanternGlowPaint
          );
        }

        canvas.drawOval(
          Skia.XYWHRect(
            item.anchorX - item.shadowRx,
            item.anchorY - item.shadowRy + item.shadowOffsetY,
            item.shadowRx * 2,
            item.shadowRy * 2
          ),
          shadowPaint
        );

        const srcRect = Skia.XYWHRect(
          frame.x,
          frame.y,
          frame.width,
          frame.height
        );

        const dstRect = Skia.XYWHRect(dstX, dstY, item.drawWidth, drawHeight);

        if (item.flipX) {
          canvas.save();
          canvas.translate(item.anchorX, 0);
          canvas.scale(-1, 1);
          canvas.translate(-item.anchorX, 0);
          canvas.drawImageRect(townAtlasImage, srcRect, dstRect, spritePaint);
          canvas.restore();
        } else {
          canvas.drawImageRect(townAtlasImage, srcRect, dstRect, spritePaint);
        }
      }
    }
  }

  return recorder.finishRecordingAsPicture();
}

export function TownMapCanvas({
  season,
  nowMs,
  buildings,
  editingBuilding,
  isEditPlacementValid,
  placedPatches,
  plantedTrees,
  focusedVillagerIndex,
  onSelectVillager,
  onMoveEditingBuilding,
  onTileTap,
  onBlockLongPress,
}: TownMapCanvasProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const clock = useClock();

  const winterSnowImage = useImage(
    require('@/assets/land-asset/compiled/winter-snow-tile.webp')
  );

  const summerGrassImage = useImage(
    require('@/assets/land-asset/compiled/summer-grass-tile.webp')
  );

  const winterForestImage = useImage(
    require('@/assets/land-asset/compiled/winter-forest-tile.webp')
  );

  const summerForestImage = useImage(
    require('@/assets/land-asset/compiled/summer-forest-tile.webp')
  );

  const winterStreetImage = useImage(
    require('@/assets/land-asset/compiled/winter-street-tile.webp')
  );

  const summerStreetImage = useImage(
    require('@/assets/land-asset/compiled/summer-street-tile.webp')
  );

  const winterLakeImage = useImage(
    require('@/assets/land-asset/compiled/winter-lake.webp')
  );

  const summerLakeImage = useImage(
    require('@/assets/land-asset/compiled/summer-lake.webp')
  );

  const soilImage = useImage(
    require('@/assets/land-asset/compiled/loamy-soil.webp')
  );

  const townAtlasImage = useImage(
    require('@/assets/game_asset/compiled/town-atlas.webp')
  );

  const villagersAtlasImage = useImage(
    require('@/assets/villager-asset/compiled/villagers-atlas.webp')
  );

  const initialRoutes = useMemo(() => createInitialVillagerRoutes(), []);
  const routesRef = useRef<VillagerRouteSegment[]>(initialRoutes);
  const routeStepCounterRef = useRef<number>(1);
  const mountEpochMsRef = useRef<number>(0);

  const villagerRouteBuffer = useSharedValue<number[]>(
    packVillagerRoutesToFlatBuffer(initialRoutes)
  );

  const focusedIdxShared = useSharedValue<number>(
    focusedVillagerIndex ?? -1
  );

  const isEditingBuildingShared = useSharedValue<boolean>(
    editingBuilding !== null
  );

  useEffect(() => {
    focusedIdxShared.set(focusedVillagerIndex ?? -1);
  }, [focusedVillagerIndex, focusedIdxShared]);

  useEffect(() => {
    isEditingBuildingShared.set(editingBuilding !== null);
  }, [editingBuilding, isEditingBuildingShared]);

  // Exact-wakeup JS scheduler: wakes ONLY when a villager finishes a walk leg or pause (0 React re-renders)
  useEffect(() => {
    if (mountEpochMsRef.current === 0) {
      mountEpochMsRef.current = Date.now();
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const tickRoutes = (): void => {
      if (isCancelled) {
        return;
      }

      const nowClockMs = Date.now() - mountEpochMsRef.current;
      const current = routesRef.current;
      let changed = false;
      let nextWakeupClockMs = Number.POSITIVE_INFINITY;

      for (let i = 0; i < current.length; i += 1) {
        let seg = current[i];

        if (nowClockMs >= seg.pauseUntilClockMs) {
          routeStepCounterRef.current += 1;
          seg = advanceVillagerRoute(seg, nowClockMs, routeStepCounterRef.current);
          current[i] = seg;
          changed = true;
        }

        if (seg.pauseUntilClockMs < nextWakeupClockMs) {
          nextWakeupClockMs = seg.pauseUntilClockMs;
        }
      }

      if (changed) {
        villagerRouteBuffer.set(packVillagerRoutesToFlatBuffer(current));
      }

      const delayMs = Number.isFinite(nextWakeupClockMs)
        ? Math.max(45, Math.min(2000, nextWakeupClockMs - nowClockMs + 20))
        : 1000;

      timerId = setTimeout(tickRoutes, delayMs);
    };

    tickRoutes();

    return () => {
      isCancelled = true;

      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [villagerRouteBuffer]);

  const villagerSprites = useRectBuffer(VILLAGER_COUNT, (rect, index) => {
    'worklet';
    const buf = villagerRouteBuffer.get();
    const base = index * VILLAGER_BUFFER_STRIDE;
    const roleRow = buf[base];
    const fromX = buf[base + 1];
    const fromY = buf[base + 2];
    const toX = buf[base + 3];
    const toY = buf[base + 4];
    const departMs = buf[base + 5];
    const arriveMs = buf[base + 6];
    const facingDir = buf[base + 7];
    const phaseSeed = buf[base + 8];

    const nowClock = clock.get();
    const duration = arriveMs - departMs;

    const isMoving =
      duration > 1 && nowClock >= departMs && nowClock < arriveMs;

    let frameIdx = 0;

    if (isMoving) {
      const t = (nowClock - departMs) / duration;
      const dist = Math.hypot(toX - fromX, toY - fromY);
      const stepPhase = (t * dist) / 22 + phaseSeed;

      frameIdx = Math.floor(stepPhase) % VILLAGER_FRAMES_PER_DIR;
    }

    const sx = (facingDir * VILLAGER_FRAMES_PER_DIR + frameIdx) * VILLAGER_CELL_SIZE;
    const sy = roleRow * VILLAGER_CELL_SIZE;

    rect.setXYWH(sx, sy, VILLAGER_CELL_SIZE, VILLAGER_CELL_SIZE);
  });

  const villagerTransforms = useRSXformBuffer(VILLAGER_COUNT, (val, index) => {
    'worklet';
    const buf = villagerRouteBuffer.get();
    const base = index * VILLAGER_BUFFER_STRIDE;
    const fromX = buf[base + 1];
    const fromY = buf[base + 2];
    const toX = buf[base + 3];
    const toY = buf[base + 4];
    const departMs = buf[base + 5];
    const arriveMs = buf[base + 6];
    const phaseSeed = buf[base + 8];

    const nowClock = clock.get();
    const duration = arriveMs - departMs;

    const isMoving =
      duration > 1 && nowClock >= departMs && nowClock < arriveMs;

    const t =
      duration > 1
        ? Math.max(0, Math.min(1, (nowClock - departMs) / duration))
        : 1;

    const wx = fromX + (toX - fromX) * t;
    const wy = fromY + (toY - fromY) * t;

    let bobY = 0;

    if (isMoving) {
      const dist = Math.hypot(toX - fromX, toY - fromY);
      const stepPhase = (t * dist) / 22 + phaseSeed;

      bobY = -Math.abs(Math.sin(stepPhase * Math.PI)) * 2.8;
    }

    const spriteScale = NPC_SPRITE_SCALE;
    const tx = wx - VILLAGER_CELL_SIZE * VILLAGER_FEET_ANCHOR_X * spriteScale;
    const ty = wy + bobY - VILLAGER_CELL_SIZE * VILLAGER_FEET_ANCHOR_Y * spriteScale;

    val.set(spriteScale, 0, tx, ty);
  });

  const focusedRingRect = useDerivedValue(() => {
    const idx = focusedIdxShared.get();

    if (idx < 0 || idx >= VILLAGER_COUNT) {
      return Skia.XYWHRect(-9999, -9999, 0, 0);
    }

    const buf = villagerRouteBuffer.get();
    const base = idx * VILLAGER_BUFFER_STRIDE;
    const fromX = buf[base + 1];
    const fromY = buf[base + 2];
    const toX = buf[base + 3];
    const toY = buf[base + 4];
    const departMs = buf[base + 5];
    const arriveMs = buf[base + 6];
    const nowClock = clock.get();
    const duration = arriveMs - departMs;

    const t =
      duration > 1
        ? Math.max(0, Math.min(1, (nowClock - departMs) / duration))
        : 1;

    const wx = fromX + (toX - fromX) * t;
    const wy = fromY + (toY - fromY) * t;

    return Skia.XYWHRect(wx - 32, wy - 14, 64, 26);
  });

  const minScale = Math.max(
    width / VALLEY_WORLD_WIDTH,
    height / VALLEY_WORLD_HEIGHT,
    width / (MAX_ZOOM_OUT_HORIZONTAL_BLOCKS * VALLEY_BLOCK_PX)
  );

  const initialScale = Math.max(minScale, INITIAL_SCALE);

  const clampX = (rawX: number, scale: number): number => {
    'worklet';
    const minX = width - VALLEY_WORLD_WIDTH * scale;

    return Math.max(minX, Math.min(0, rawX));
  };

  const clampY = (rawY: number, scale: number): number => {
    'worklet';
    const minY = height - VALLEY_WORLD_HEIGHT * scale;

    return Math.max(minY, Math.min(0, rawY));
  };

  const initialX = clampX(
    width * 0.5 - VALLEY_SPAWN_FOCUS_X * initialScale,
    initialScale
  );

  const initialY = clampY(
    height * 0.5 - VALLEY_SPAWN_FOCUS_Y * initialScale,
    initialScale
  );

  const initialWindow = useMemo(
    () => computeCullWindow(initialX, initialY, initialScale, width, height),
    [initialX, initialY, initialScale, width, height]
  );

  const [cullWindow, setCullWindow] =
    useState<VisibleBlockWindow>(initialWindow);

  const camX = useSharedValue(initialX);
  const camY = useSharedValue(initialY);
  const camScale = useSharedValue(initialScale);
  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const startScale = useSharedValue(initialScale);

  const recMinBx = useSharedValue(initialWindow.minBx);
  const recMaxBx = useSharedValue(initialWindow.maxBx);
  const recMinBy = useSharedValue(initialWindow.minBy);
  const recMaxBy = useSharedValue(initialWindow.maxBy);

  const activeMeadow =
    season === 'WINTER' ? winterSnowImage : summerGrassImage;

  const activeForest =
    season === 'WINTER' ? winterForestImage : summerForestImage;

  const activeStreet =
    season === 'WINTER' ? winterStreetImage : summerStreetImage;

  const activeLake = season === 'WINTER' ? winterLakeImage : summerLakeImage;

  const worldPicture = useMemo(
    () =>
      recordVisibleWorldPicture(
        cullWindow,
        season,
        nowMs,
        activeMeadow,
        activeForest,
        activeStreet,
        activeLake,
        soilImage,
        townAtlasImage,
        buildings,
        editingBuilding,
        isEditPlacementValid,
        placedPatches,
        plantedTrees
      ),
    [
      cullWindow,
      season,
      nowMs,
      activeMeadow,
      activeForest,
      activeStreet,
      activeLake,
      soilImage,
      townAtlasImage,
      buildings,
      editingBuilding,
      isEditPlacementValid,
      placedPatches,
      plantedTrees,
    ]
  );

  const cameraTransform = useDerivedValue(() => {
    const cx = camX.get();
    const cy = camY.get();
    const sc = camScale.get();

    const viewLeft = -cx / sc;
    const viewTop = -cy / sc;
    const viewRight = (width - cx) / sc;
    const viewBottom = (height - cy) / sc;

    const invBlock = 1 / VALLEY_BLOCK_PX;
    const visMinBx = Math.floor((viewLeft - VALLEY_BORDER_X) * invBlock);
    const visMaxBx = Math.floor((viewRight - VALLEY_BORDER_X) * invBlock);
    const visMinBy = Math.floor((viewTop - VALLEY_BORDER_Y) * invBlock);
    const visMaxBy = Math.floor((viewBottom - VALLEY_BORDER_Y) * invBlock);

    const curMinBx = recMinBx.get();
    const curMaxBx = recMaxBx.get();
    const curMinBy = recMinBy.get();
    const curMaxBy = recMaxBy.get();

    const needUpdate =
      (visMinBx - HYSTERESIS_MARGIN_BLOCKS < curMinBx &&
        curMinBx > MIN_TOTAL_BX) ||
      (visMaxBx + HYSTERESIS_MARGIN_BLOCKS > curMaxBx &&
        curMaxBx < MAX_TOTAL_BX) ||
      (visMinBy - HYSTERESIS_MARGIN_BLOCKS < curMinBy &&
        curMinBy > MIN_TOTAL_BY) ||
      (visMaxBy + HYSTERESIS_MARGIN_BLOCKS > curMaxBy &&
        curMaxBy < MAX_TOTAL_BY);

    if (needUpdate) {
      const nextWin = computeCullWindow(cx, cy, sc, width, height);

      recMinBx.set(nextWin.minBx);
      recMaxBx.set(nextWin.maxBx);
      recMinBy.set(nextWin.minBy);
      recMaxBy.set(nextWin.maxBy);
      scheduleOnRN(setCullWindow, nextWin);
    }

    return [{ translateX: cx }, { translateY: cy }, { scale: sc }];
  });

  const panGesture = Gesture.Pan()
    .maxPointers(2)
    .onStart(() => {
      cancelAnimation(camX);
      cancelAnimation(camY);
      startX.set(camX.get());
      startY.set(camY.get());
    })
    .onUpdate((event) => {
      const scale = camScale.get();

      camX.set(clampX(startX.get() + event.translationX, scale));
      camY.set(clampY(startY.get() + event.translationY, scale));
    })
    .onEnd((event) => {
      if (reducedMotion) {
        return;
      }

      const scale = camScale.get();
      const minX = Math.min(0, width - VALLEY_WORLD_WIDTH * scale);
      const minY = Math.min(0, height - VALLEY_WORLD_HEIGHT * scale);

      camX.set(
        withDecay({
          velocity: event.velocityX,
          deceleration: 0.996,
          clamp: [minX, 0],
        })
      );

      camY.set(
        withDecay({
          velocity: event.velocityY,
          deceleration: 0.996,
          clamp: [minY, 0],
        })
      );
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(camX);
      cancelAnimation(camY);
      cancelAnimation(camScale);
      startScale.set(camScale.get());
      startX.set(camX.get());
      startY.set(camY.get());
    })
    .onUpdate((event) => {
      const prevScale = startScale.get();

      const nextScale = Math.max(
        minScale,
        Math.min(MAX_ZOOM, prevScale * event.scale)
      );

      const worldFocalX = (event.focalX - startX.get()) / prevScale;
      const worldFocalY = (event.focalY - startY.get()) / prevScale;

      camScale.set(nextScale);
      camX.set(clampX(event.focalX - worldFocalX * nextScale, nextScale));
      camY.set(clampY(event.focalY - worldFocalY * nextScale, nextScale));
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      const currentScale = camScale.get();

      const nextScale =
        currentScale <= minScale + 0.02 ? initialScale : minScale;

      const worldFocalX = (event.x - camX.get()) / currentScale;
      const worldFocalY = (event.y - camY.get()) / currentScale;

      const targetX = clampX(event.x - worldFocalX * nextScale, nextScale);
      const targetY = clampY(event.y - worldFocalY * nextScale, nextScale);

      if (reducedMotion) {
        camScale.set(nextScale);
        camX.set(targetX);
        camY.set(targetY);

        return;
      }

      const timingConfig = { duration: 240, easing: ZOOM_EASE };

      camScale.set(withTiming(nextScale, timingConfig));
      camX.set(withTiming(targetX, timingConfig));
      camY.set(withTiming(targetY, timingConfig));
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((event) => {
      const scale = camScale.get();
      const worldX = (event.x - camX.get()) / scale;
      const worldY = (event.y - camY.get()) / scale;

      // 0. While moving/rotating a building, tapping any playable 4x4 block repositions the draft
      if (isEditingBuildingShared.get()) {
        const nextBlockX = Math.floor(
          (worldX - VALLEY_BORDER_X) / VALLEY_BLOCK_PX
        );

        const nextBlockY = Math.floor(
          (worldY - VALLEY_BORDER_Y) / VALLEY_BLOCK_PX
        );

        if (
          nextBlockX >= 0 &&
          nextBlockX < VALLEY_BLOCK_COLS &&
          nextBlockY >= 0 &&
          nextBlockY < VALLEY_BLOCK_ROWS
        ) {
          scheduleOnRN(onMoveEditingBuilding, nextBlockX, nextBlockY);
        }

        return;
      }

      // 1. Check if the player tapped any walking villager (zoom & open Citizen Life Card)
      const buf = villagerRouteBuffer.get();
      const nowClock = clock.get();
      const hitRadius = Math.max(46, 36 / scale);
      let bestIdx = -1;
      let bestDistSq = hitRadius * hitRadius;
      let bestWx = 0;
      let bestWy = 0;

      for (let i = 0; i < VILLAGER_COUNT; i += 1) {
        const base = i * VILLAGER_BUFFER_STRIDE;
        const fromX = buf[base + 1];
        const fromY = buf[base + 2];
        const toX = buf[base + 3];
        const toY = buf[base + 4];
        const departMs = buf[base + 5];
        const arriveMs = buf[base + 6];
        const duration = arriveMs - departMs;

        const t =
          duration > 1
            ? Math.max(0, Math.min(1, (nowClock - departMs) / duration))
            : 1;

        const wx = fromX + (toX - fromX) * t;
        const wy = fromY + (toY - fromY) * t;
        const dx = worldX - wx;
        const dy = worldY - (wy - 34);
        const distSq = dx * dx + dy * dy;

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestIdx = i;
          bestWx = wx;
          bestWy = wy;
        }
      }

      if (bestIdx >= 0) {
        focusedIdxShared.set(bestIdx);

        const nextScale = Math.min(MAX_ZOOM, Math.max(scale, FOCUS_ZOOM_MIN_SCALE));
        const targetX = clampX(width * 0.5 - bestWx * nextScale, nextScale);
        const targetY = clampY(height * 0.42 - bestWy * nextScale, nextScale);

        if (reducedMotion) {
          camScale.set(nextScale);
          camX.set(targetX);
          camY.set(targetY);
        } else {
          const timingConfig = { duration: 280, easing: ZOOM_EASE };

          camScale.set(withTiming(nextScale, timingConfig));
          camX.set(withTiming(targetX, timingConfig));
          camY.set(withTiming(targetY, timingConfig));
        }

        scheduleOnRN(onSelectVillager, bestIdx);

        return;
      }

      if (focusedIdxShared.get() >= 0) {
        focusedIdxShared.set(-1);
        scheduleOnRN(onSelectVillager, null);

        return;
      }

      const blockX = Math.floor((worldX - VALLEY_BORDER_X) / VALLEY_BLOCK_PX);
      const blockY = Math.floor((worldY - VALLEY_BORDER_Y) / VALLEY_BLOCK_PX);
      const tileX = Math.floor((worldX - VALLEY_BORDER_X) / VALLEY_TILE_PX);
      const tileY = Math.floor((worldY - VALLEY_BORDER_Y) / VALLEY_TILE_PX);

      if (
        blockX >= 0 &&
        blockX < VALLEY_BLOCK_COLS &&
        blockY >= 0 &&
        blockY < VALLEY_BLOCK_ROWS &&
        tileX >= 0 &&
        tileX < VALLEY_TILE_COLS &&
        tileY >= 0 &&
        tileY < VALLEY_TILE_ROWS
      ) {
        scheduleOnRN(onTileTap, blockX, blockY, tileX, tileY);
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(420)
    .onStart((event) => {
      const scale = camScale.get();
      const worldX = (event.x - camX.get()) / scale;
      const worldY = (event.y - camY.get()) / scale;

      const blockX = Math.floor((worldX - VALLEY_BORDER_X) / VALLEY_BLOCK_PX);
      const blockY = Math.floor((worldY - VALLEY_BORDER_Y) / VALLEY_BLOCK_PX);

      if (
        blockX >= 0 &&
        blockX < VALLEY_BLOCK_COLS &&
        blockY >= 0 &&
        blockY < VALLEY_BLOCK_ROWS
      ) {
        scheduleOnRN(onBlockLongPress, blockX, blockY);
      }
    });

  const tapGestures = Gesture.Exclusive(
    longPressGesture,
    doubleTapGesture,
    singleTapGesture
  );

  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    tapGestures
  );

  return (
    <View
      style={[
        styles.wrapper,
        season === 'WINTER' ? styles.winterBg : styles.summerBg,
      ]}
    >
      <GestureDetector gesture={composedGesture}>
        <Canvas style={styles.canvas}>
          <Group transform={cameraTransform}>
            {worldPicture !== null && <Picture picture={worldPicture} />}
            <Oval
              rect={focusedRingRect}
              color="rgba(255, 255, 255, 0.92)"
              style="stroke"
              strokeWidth={3}
            />
            {villagersAtlasImage !== null && (
              <Atlas
                image={villagersAtlasImage}
                sprites={villagerSprites}
                transforms={villagerTransforms}
              />
            )}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  winterBg: {
    backgroundColor: '#EBF4FF',
  },
  summerBg: {
    backgroundColor: '#76A63E',
  },
  canvas: {
    flex: 1,
  },
});
