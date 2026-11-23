import {
  BlendMode,
  BlurStyle,
  Canvas,
  FilterMode,
  Group,
  MipmapMode,
  Picture,
  Skia,
  type SkImage,
  type SkPicture,
  TileMode,
  useImage,
} from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
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

import type { StoredLandPatch } from '@/game/town-db';
import type { Season } from '@/game/types';
import {
  isBlockOverlappingLake,
  VALLEY_BLOCK_COLS,
  VALLEY_BLOCK_PX,
  VALLEY_BLOCK_ROWS,
  VALLEY_BORDER_BLOCKS,
  VALLEY_BORDER_X,
  VALLEY_BORDER_Y,
  VALLEY_CULL_BUFFER_BLOCKS,
  VALLEY_LAKE_ZONE,
  VALLEY_PLAYABLE_BOUNDS,
  VALLEY_SPAWN_FOCUS_X,
  VALLEY_SPAWN_FOCUS_Y,
  VALLEY_WORLD_HEIGHT,
  VALLEY_WORLD_WIDTH,
} from '@/game/valley-zones';

const ZOOM_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const INITIAL_SCALE = 0.54;
const MAX_ZOOM_OUT_HORIZONTAL_BLOCKS = 10;
const MAX_ZOOM = 1.9;
const HYSTERESIS_MARGIN_BLOCKS = 2;

const MIN_TOTAL_BX = -VALLEY_BORDER_BLOCKS;
const MAX_TOTAL_BX = VALLEY_BLOCK_COLS + VALLEY_BORDER_BLOCKS - 1;
const MIN_TOTAL_BY = -VALLEY_BORDER_BLOCKS;
const MAX_TOTAL_BY = VALLEY_BLOCK_ROWS + VALLEY_BORDER_BLOCKS - 1;

const LAKE_MIN_X = VALLEY_LAKE_ZONE.x;
const LAKE_MAX_X = VALLEY_LAKE_ZONE.x + VALLEY_LAKE_ZONE.width;
const LAKE_MIN_Y = VALLEY_LAKE_ZONE.y;
const LAKE_MAX_Y = VALLEY_LAKE_ZONE.y + VALLEY_LAKE_ZONE.height;

interface VisibleBlockWindow {
  readonly minBx: number;
  readonly maxBx: number;
  readonly minBy: number;
  readonly maxBy: number;
}

interface TownMapCanvasProps {
  readonly season: Season;
  readonly placedPatches: readonly StoredLandPatch[];
  readonly onBlockTap: (blockX: number, blockY: number) => void;
  readonly onBlockLongPress: (blockX: number, blockY: number) => void;
  readonly onToggleSeason: () => void;
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

  const visMinBx = Math.floor((viewLeft - VALLEY_BORDER_X) / VALLEY_BLOCK_PX);
  const visMaxBx = Math.floor((viewRight - VALLEY_BORDER_X) / VALLEY_BLOCK_PX);
  const visMinBy = Math.floor((viewTop - VALLEY_BORDER_Y) / VALLEY_BLOCK_PX);
  const visMaxBy = Math.floor((viewBottom - VALLEY_BORDER_Y) / VALLEY_BLOCK_PX);

  return {
    minBx: Math.max(MIN_TOTAL_BX, visMinBx - VALLEY_CULL_BUFFER_BLOCKS),
    maxBx: Math.min(MAX_TOTAL_BX, visMaxBx + VALLEY_CULL_BUFFER_BLOCKS),
    minBy: Math.max(MIN_TOTAL_BY, visMinBy - VALLEY_CULL_BUFFER_BLOCKS),
    maxBy: Math.min(MAX_TOTAL_BY, visMaxBy + VALLEY_CULL_BUFFER_BLOCKS),
  };
}

/**
 * Viewport-culled native C++ SkPicture recorder for the 100x (40x70 = 2,800 block) town.
 * Draws ONLY the visible viewport + 5 blocks buffer on all 4 sides:
 * 1. Infinite seamless Snow/Grass repeat shader (1 draw call).
 * 2. Organic Pine Forest perimeter ONLY when cullWindow touches a town edge.
 * 3. Uncut Fishing Lake ONLY when cullWindow overlaps the lake.
 * 4. Organic fused Loamy Soil patches ONLY for cleared blocks inside cullWindow.
 */
function recordVisibleWorldPicture(
  cullWindow: VisibleBlockWindow,
  meadowImage: SkImage | null,
  forestImage: SkImage | null,
  lakeImage: SkImage | null,
  soilImage: SkImage | null,
  placedPatches: readonly StoredLandPatch[]
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

    // Softly feathered organic treeline border where the 40x70 meadow meets the pine forest
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
    // Fast path: deep inside the 40x70 town — 1 single GPU draw call for all visible snow/grass
    canvas.drawRect(winRect, meadowPaint);
  }

  // Pass 2: Fishing Lake (drawn ONLY when cullWindow intersects the lake)
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

  // Pass 3: Viewport-culled organic Loamy Soil patches (ONLY blocks inside cullWindow)
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
        isBlockOverlappingLake(p.blockX, p.blockY)
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

      // Solidify interior bridges between touching soil blocks
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

  return recorder.finishRecordingAsPicture();
}

export function TownMapCanvas({
  season,
  placedPatches,
  onBlockTap,
  onBlockLongPress,
  onToggleSeason,
}: TownMapCanvasProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

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

  const winterLakeImage = useImage(
    require('@/assets/land-asset/compiled/winter-lake.webp')
  );

  const summerLakeImage = useImage(
    require('@/assets/land-asset/compiled/summer-lake.webp')
  );

  const soilImage = useImage(
    require('@/assets/land-asset/compiled/loamy-soil.webp')
  );

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

  // Track currently recorded cull window on the UI thread for zero-jank hysteresis updates
  const recMinBx = useSharedValue(initialWindow.minBx);
  const recMaxBx = useSharedValue(initialWindow.maxBx);
  const recMinBy = useSharedValue(initialWindow.minBy);
  const recMaxBy = useSharedValue(initialWindow.maxBy);

  const activeMeadow =
    season === 'WINTER' ? winterSnowImage : summerGrassImage;

  const activeForest =
    season === 'WINTER' ? winterForestImage : summerForestImage;

  const activeLake = season === 'WINTER' ? winterLakeImage : summerLakeImage;

  const worldPicture = useMemo(
    () =>
      recordVisibleWorldPicture(
        cullWindow,
        activeMeadow,
        activeForest,
        activeLake,
        soilImage,
        placedPatches
      ),
    [
      cullWindow,
      activeMeadow,
      activeForest,
      activeLake,
      soilImage,
      placedPatches,
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

      // Double-tap zooms out to max overview (10 horizontal blocks); if already there, returns to normal scale
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

      if (
        worldX >= LAKE_MIN_X &&
        worldX <= LAKE_MAX_X &&
        worldY >= LAKE_MIN_Y &&
        worldY <= LAKE_MAX_Y
      ) {
        scheduleOnRN(onToggleSeason);

        return;
      }

      const blockX = Math.floor((worldX - VALLEY_BORDER_X) / VALLEY_BLOCK_PX);
      const blockY = Math.floor((worldY - VALLEY_BORDER_Y) / VALLEY_BLOCK_PX);

      if (
        blockX >= 0 &&
        blockX < VALLEY_BLOCK_COLS &&
        blockY >= 0 &&
        blockY < VALLEY_BLOCK_ROWS
      ) {
        scheduleOnRN(onBlockTap, blockX, blockY);
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
