import {
  getTerrainCodeAt,
  MAP_COLS,
  MAP_ROWS,
  MAP_TOTAL_TILES,
  TERRAIN_CODE,
} from '@/game/map-data';
import type { Season, TileCoord } from '@/game/types';

const MAX_SEARCH_STEPS = 750;
const DIR_X: readonly number[] = [0, 0, -1, 1];
const DIR_Y: readonly number[] = [-1, 1, 0, 0];

// Pre-allocated zero-GC TypedArray buffers for A* pathfinding
const gCostBuffer = new Float32Array(MAP_TOTAL_TILES);
const fCostBuffer = new Float32Array(MAP_TOTAL_TILES);
const parentBuffer = new Int32Array(MAP_TOTAL_TILES);
const visitedTokenBuffer = new Uint16Array(MAP_TOTAL_TILES);
const closedTokenBuffer = new Uint16Array(MAP_TOTAL_TILES);
const heapBuffer = new Int32Array(MAP_TOTAL_TILES);
const reconstructScratch = new Int32Array(MAP_TOTAL_TILES);

let searchGeneration = 1;
let heapSize = 0;

function nextGeneration(): number {
  searchGeneration += 1;

  if (searchGeneration >= 65530) {
    visitedTokenBuffer.fill(0);
    closedTokenBuffer.fill(0);
    searchGeneration = 1;
  }

  return searchGeneration;
}

function heapPush(tileIdx: number): void {
  let i = heapSize;

  heapBuffer[i] = tileIdx;
  heapSize += 1;

  while (i > 0) {
    const parentIdx = (i - 1) >> 1;
    const childTile = heapBuffer[i];
    const parentTile = heapBuffer[parentIdx];

    if (fCostBuffer[childTile] >= fCostBuffer[parentTile]) {
      break;
    }

    heapBuffer[i] = parentTile;
    heapBuffer[parentIdx] = childTile;
    i = parentIdx;
  }
}

function heapPop(): number {
  const top = heapBuffer[0];

  heapSize -= 1;

  if (heapSize > 0) {
    heapBuffer[0] = heapBuffer[heapSize];
    let i = 0;

    while (true) {
      const left = (i << 1) + 1;
      const right = left + 1;
      let smallest = i;

      if (
        left < heapSize &&
        fCostBuffer[heapBuffer[left]] < fCostBuffer[heapBuffer[smallest]]
      ) {
        smallest = left;
      }

      if (
        right < heapSize &&
        fCostBuffer[heapBuffer[right]] < fCostBuffer[heapBuffer[smallest]]
      ) {
        smallest = right;
      }

      if (smallest === i) {
        break;
      }

      const tmp = heapBuffer[i];

      heapBuffer[i] = heapBuffer[smallest];
      heapBuffer[smallest] = tmp;
      i = smallest;
    }
  }

  return top;
}

function isTilePassable(
  gx: number,
  gy: number,
  season: Season,
  occupancy: Uint8Array,
  targetIdx: number
): boolean {
  if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) {
    return false;
  }

  const idx = gy * MAP_COLS + gx;

  if (idx === targetIdx) {
    return true;
  }

  const terrainCode = getTerrainCodeAt(gx, gy);

  if (terrainCode === TERRAIN_CODE.MOUNTAIN_ROCK) {
    return false;
  }

  if (terrainCode === TERRAIN_CODE.WATER_LAKE && season !== 'WINTER') {
    return false;
  }

  const occ = occupancy[idx];

  // Trees (1), Buildings (3), and Ore Nodes (4) block movement; Farm Crops (2) are walkable
  return occ === 0 || occ === 2;
}

export interface WalkPathResult {
  readonly destination: TileCoord;
  readonly steps: number;
}

/**
 * Zero-allocation A* pathfinder using generation tokens and a flat Int32Array binary heap.
 * Returns the final walkable destination coordinate and total path step count.
 */
export function findWalkPath(
  start: TileCoord,
  goal: TileCoord,
  season: Season,
  occupancy: Uint8Array
): WalkPathResult {
  const startIdx = start.gy * MAP_COLS + start.gx;
  const goalIdx = goal.gy * MAP_COLS + goal.gx;

  if (startIdx === goalIdx) {
    return { destination: start, steps: 0 };
  }

  const gen = nextGeneration();

  heapSize = 0;
  gCostBuffer[startIdx] = 0;
  fCostBuffer[startIdx] = Math.abs(goal.gx - start.gx) + Math.abs(goal.gy - start.gy);
  parentBuffer[startIdx] = -1;
  visitedTokenBuffer[startIdx] = gen;
  heapPush(startIdx);

  let bestIdx = startIdx;
  let bestHeuristic = fCostBuffer[startIdx];
  let stepsExplored = 0;

  while (heapSize > 0 && stepsExplored < MAX_SEARCH_STEPS) {
    const currentIdx = heapPop();

    if (closedTokenBuffer[currentIdx] === gen) {
      continue;
    }

    closedTokenBuffer[currentIdx] = gen;
    stepsExplored += 1;

    if (currentIdx === goalIdx) {
      bestIdx = goalIdx;
      break;
    }

    const cx = currentIdx % MAP_COLS;
    const cy = (currentIdx / MAP_COLS) | 0;

    for (let d = 0; d < 4; d += 1) {
      const nx = cx + DIR_X[d];
      const ny = cy + DIR_Y[d];

      if (!isTilePassable(nx, ny, season, occupancy, goalIdx)) {
        continue;
      }

      const neighborIdx = ny * MAP_COLS + nx;

      if (closedTokenBuffer[neighborIdx] === gen) {
        continue;
      }

      const tentativeG = gCostBuffer[currentIdx] + 1;
      const alreadyVisited = visitedTokenBuffer[neighborIdx] === gen;

      if (!alreadyVisited || tentativeG < gCostBuffer[neighborIdx]) {
        const h = Math.abs(goal.gx - nx) + Math.abs(goal.gy - ny);

        parentBuffer[neighborIdx] = currentIdx;
        gCostBuffer[neighborIdx] = tentativeG;
        fCostBuffer[neighborIdx] = tentativeG + h;
        visitedTokenBuffer[neighborIdx] = gen;
        heapPush(neighborIdx);

        if (h < bestHeuristic) {
          bestHeuristic = h;
          bestIdx = neighborIdx;
        }
      }
    }
  }

  let length = 0;
  let cursor = bestIdx;

  while (cursor !== -1 && cursor !== startIdx && length < MAP_TOTAL_TILES) {
    reconstructScratch[length] = cursor;
    length += 1;
    cursor = parentBuffer[cursor];
  }

  // If goal tile itself is occupied by a tree/building/rock, stop on the adjacent tile before it
  let finalIdx = bestIdx;

  if (
    finalIdx === goalIdx &&
    occupancy[goalIdx] !== 0 &&
    occupancy[goalIdx] !== 2 &&
    length > 0
  ) {
    finalIdx = parentBuffer[goalIdx] !== -1 ? parentBuffer[goalIdx] : startIdx;
    length = Math.max(0, length - 1);
  }

  return {
    destination: {
      gx: finalIdx % MAP_COLS,
      gy: (finalIdx / MAP_COLS) | 0,
    },
    steps: length,
  };
}
