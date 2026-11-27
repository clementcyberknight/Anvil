import type { GameIconKey } from '@/game/icon-atlas';
import type { StreetNodeId } from '@/game/town-villagers';
import { sessionStorage } from '@/lib/storage';
import {
  ensureLocalSuiWallet,
  loadCachedSuiWalletSummarySync,
  markSuiAuthVerified,
  signPersonalChallengeWithLocalWallet,
} from '@/lib/sui-wallet';

const SYNC_KEYS = {
  accountId: 'mp.v1.accountId',
  sessionToken: 'mp.v1.sessionToken',
  displayName: 'mp.v1.displayName',
  homeTownId: 'mp.v1.homeTownId',
  visitingTownId: 'mp.v1.visitingTownId',
  outbox: 'mp.v1.outbox',
  seqPrefix: 'mp.v1.seq.',
  lastDiag: 'mp.v1.lastDiag',
} as const;

const STREET_NODE_RING: readonly StreetNodeId[] = [
  'civic_plaza',
  'west_builder',
  'west_sawmill',
  'west_blacksmith',
  'plaza_north',
  'east_harbor',
  'east_smokehouse',
  'east_main',
  'east_cottage',
  'east_ranch',
  'south_farm_mid',
  'lake_north_center',
];

export type BackendPricingItemId =
  | 'seed_maize'
  | 'seed_wheat'
  | 'seed_turnip'
  | 'seed_potato'
  | 'seed_pine'
  | 'lake_trout'
  | 'frost_carp'
  | 'pine_log'
  | 'maize_cob'
  | 'wheat_sheaf'
  | 'snow_turnip'
  | 'frost_potato'
  | 'mountain_berries'
  | 'forest_mushroom'
  | 'frost_mint'
  | 'raw_stone'
  | 'coal_chunk'
  | 'copper_ore'
  | 'iron_ore'
  | 'silver_ore'
  | 'gold_ore'
  | 'raw_diamond'
  | 'ice_crystal'
  | 'ancient_relic'
  | 'firewood'
  | 'pine_planks'
  | 'flour_sack'
  | 'iron_ingot'
  | 'gold_ingot'
  | 'fish_stew'
  | 'smoked_fish'
  | 'artisan_bread'
  | 'warmth_tea';

export interface LivePersonaSummary {
  readonly npcId: string;
  readonly source: 'SEED_PROCEDURAL' | 'AI_GENERATED';
  readonly version: number;
  readonly backstory: string;
  readonly voiceStyle: string;
  readonly coreMotivations: readonly string[];
  readonly quirksAndHabits: readonly string[];
  readonly economicPhilosophy: string;
  readonly politicalStance: string;
  readonly generatedByModel: string;
}

export interface LiveVillagerOverlay {
  readonly backendNpcId: string;
  readonly thought: string;
  readonly speech: string | null;
  readonly coinsAfter: number;
  readonly actionType: string;
  readonly isIndoors: boolean;
  readonly persona: LivePersonaSummary | null;
}

export interface DirectoryTownSummary {
  readonly id: string;
  readonly name: string;
  readonly season: 'WINTER' | 'SUMMER';
  readonly taxRatePct: number;
  readonly winterPolicy: string;
  readonly treasuryFc: number;
  readonly activeViewers: number;
  readonly visitorCount: number;
  readonly hasPeaceShield: boolean;
}

export interface InterTownMarketOrder {
  readonly orderId: string;
  readonly sellerAccountId: string;
  readonly sellerDisplayName: string;
  readonly sellerTownId: string;
  readonly itemId: BackendPricingItemId;
  readonly itemName: string;
  readonly qty: number;
  readonly unitPriceFc: number;
  readonly totalPriceFc: number;
  readonly status: 'OPEN' | 'FILLED' | 'CANCELLED';
}

export interface OutboxCommandEntry {
  readonly cmdId: string;
  readonly kind: 'HARVEST_GAIN' | 'CRAFT_DELTA' | 'LOCAL_SELL' | 'LOCAL_BUY';
  readonly itemId: BackendPricingItemId | null;
  readonly qtyDelta: number;
  readonly coinsDelta: number;
}

interface WireActionPayload {
  readonly type: string;
}

interface WireSnapshotNpc {
  readonly id: string;
  readonly coins: number;
  readonly isIndoors: boolean;
  readonly currentAction: string;
  readonly speech: string | null;
  readonly thought: string | null;
}

interface WireTownHeader {
  readonly id: string;
  readonly name: string;
  readonly season: 'WINTER' | 'SUMMER';
  readonly taxRatePct: number;
  readonly treasuryFc: number;
}

interface WireEnvelope {
  readonly packetType?: string;
  readonly seq?: number;
  readonly latestSeq?: number;
  readonly townId?: string;
  readonly npcId?: string;
  readonly action?: WireActionPayload;
  readonly toTileX?: number;
  readonly toTileY?: number;
  readonly isIndoors?: boolean;
  readonly departAtMs?: number;
  readonly arriveAtMs?: number;
  readonly coinsAfter?: number;
  readonly speech?: string | null;
  readonly thought?: string;
  readonly cmdId?: string;
  readonly liquidCoinsFc?: number;
  readonly event?: string;
  readonly itemName?: string;
  readonly qty?: number;
  readonly netCoinsEarnedFc?: number;
  readonly sellerCoinsAfter?: number;
  readonly buyerDisplayName?: string;
  readonly npcs?: readonly WireSnapshotNpc[];
  readonly town?: WireTownHeader;
  readonly deltas?: readonly WireEnvelope[];
  readonly persona?: LivePersonaSummary;
  readonly message?: string;
}

interface SessionResponsePayload {
  readonly account: {
    readonly accountId: string;
    readonly displayName: string;
    readonly homeTownId: string;
    readonly visitingTownId: string;
    readonly liquidCoinsFc: number;
  };
  readonly sessionToken: string;
}

interface SuiChallengeResponsePayload {
  readonly suiAddress: string;
  readonly nonce: string;
  readonly messageToSign: string;
  readonly expiresAtMs: number;
}

interface DirectoryResponsePayload {
  readonly towns: readonly DirectoryTownSummary[];
}

interface MarketOrdersResponsePayload {
  readonly orders: readonly InterTownMarketOrder[];
}

interface PostOrderResponsePayload {
  readonly order?: InterTownMarketOrder;
  readonly error?: string;
}

interface FulfillOrderResponsePayload {
  readonly ok?: boolean;
  readonly buyerCoinsAfter?: number;
  readonly order?: InterTownMarketOrder;
  readonly error?: string;
}

interface PersonaGenerateResponsePayload {
  readonly persona?: LivePersonaSummary;
  readonly usedLiveModel?: boolean;
}

const DEFAULT_RAILWAY_BACKEND_URL =
  'https://anvil-backend-production-cbdb6275.up.railway.app';

export function resolveBackendHttpBaseUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? DEFAULT_RAILWAY_BACKEND_URL;

  if (
    process.env.EXPO_OS === 'android' &&
    configured.includes('://localhost')
  ) {
    return configured.replace('://localhost', '://10.0.2.2');
  }

  return configured.replace(/\/+$/, '');
}

export function resolveBackendWsBaseUrl(): string {
  const httpBase = resolveBackendHttpBaseUrl();

  if (httpBase.startsWith('https://')) {
    return `wss://${httpBase.slice('https://'.length)}`;
  }

  if (httpBase.startsWith('http://')) {
    return `ws://${httpBase.slice('http://'.length)}`;
  }

  return `ws://${httpBase}`;
}

export function clientIconToBackendItem(
  icon: GameIconKey
): BackendPricingItemId | null {
  switch (icon) {
    case 'seedMaize':
      return 'seed_maize';
    case 'seedWheat':
      return 'seed_wheat';
    case 'seedTurnip':
      return 'seed_turnip';
    case 'seedPotato':
      return 'seed_potato';
    case 'seedPinecone':
      return 'seed_pine';
    case 'lakeTrout':
      return 'lake_trout';
    case 'frostCarp':
      return 'frost_carp';
    case 'pineLog':
      return 'pine_log';
    case 'maizeCob':
      return 'maize_cob';
    case 'wheatSheaf':
      return 'wheat_sheaf';
    case 'snowTurnip':
      return 'snow_turnip';
    case 'frostPotato':
      return 'frost_potato';
    case 'mountainBerries':
      return 'mountain_berries';
    case 'forestMushroom':
      return 'forest_mushroom';
    case 'frostMint':
      return 'frost_mint';
    case 'rawStone':
      return 'raw_stone';
    case 'coalChunk':
      return 'coal_chunk';
    case 'copperOre':
      return 'copper_ore';
    case 'ironOre':
      return 'iron_ore';
    case 'silverOre':
      return 'silver_ore';
    case 'goldOre':
      return 'gold_ore';
    case 'rawDiamond':
      return 'raw_diamond';
    case 'iceCrystal':
      return 'ice_crystal';
    case 'ancientRelic':
      return 'ancient_relic';
    case 'firewood':
      return 'firewood';
    case 'pinePlanks':
      return 'pine_planks';
    case 'flourSack':
      return 'flour_sack';
    case 'ironIngot':
      return 'iron_ingot';
    case 'goldIngot':
      return 'gold_ingot';
    case 'fishStew':
      return 'fish_stew';
    case 'smokedFish':
      return 'smoked_fish';
    case 'artisanBread':
      return 'artisan_bread';
    case 'warmthTea':
      return 'warmth_tea';
    default:
      return null;
  }
}

export function backendItemToClientIcon(
  itemId: BackendPricingItemId
): GameIconKey {
  switch (itemId) {
    case 'seed_maize':
      return 'seedMaize';
    case 'seed_wheat':
      return 'seedWheat';
    case 'seed_turnip':
      return 'seedTurnip';
    case 'seed_potato':
      return 'seedPotato';
    case 'seed_pine':
      return 'seedPinecone';
    case 'lake_trout':
      return 'lakeTrout';
    case 'frost_carp':
      return 'frostCarp';
    case 'pine_log':
      return 'pineLog';
    case 'maize_cob':
      return 'maizeCob';
    case 'wheat_sheaf':
      return 'wheatSheaf';
    case 'snow_turnip':
      return 'snowTurnip';
    case 'frost_potato':
      return 'frostPotato';
    case 'mountain_berries':
      return 'mountainBerries';
    case 'forest_mushroom':
      return 'forestMushroom';
    case 'frost_mint':
      return 'frostMint';
    case 'raw_stone':
      return 'rawStone';
    case 'coal_chunk':
      return 'coalChunk';
    case 'copper_ore':
      return 'copperOre';
    case 'iron_ore':
      return 'ironOre';
    case 'silver_ore':
      return 'silverOre';
    case 'gold_ore':
      return 'goldOre';
    case 'raw_diamond':
      return 'rawDiamond';
    case 'ice_crystal':
      return 'iceCrystal';
    case 'ancient_relic':
      return 'ancientRelic';
    case 'firewood':
      return 'firewood';
    case 'pine_planks':
      return 'pinePlanks';
    case 'flour_sack':
      return 'flourSack';
    case 'iron_ingot':
      return 'ironIngot';
    case 'gold_ingot':
      return 'goldIngot';
    case 'fish_stew':
      return 'fishStew';
    case 'smoked_fish':
      return 'smokedFish';
    case 'artisan_bread':
      return 'artisanBread';
    case 'warmth_tea':
      return 'warmthTea';
  }
}

export interface StoredAccountMeta {
  readonly accountId: string;
  readonly sessionToken: string | null;
  readonly displayName: string;
  readonly homeTownId: string;
  readonly visitingTownId: string;
}

export interface FulfillOrderResult {
  readonly buyerCoinsAfter: number;
  readonly order: InterTownMarketOrder;
}

export function loadStoredAccountMeta(): StoredAccountMeta {
  const cachedSui = loadCachedSuiWalletSummarySync();

  let accountId =
    cachedSui?.suiAddress ?? sessionStorage.getString(SYNC_KEYS.accountId);

  if (accountId === undefined || accountId.length === 0) {
    const suffix = Math.floor(1000 + Math.random() * 9000);

    accountId = `yeti_${suffix}_${Date.now().toString(36)}`;
    sessionStorage.set(SYNC_KEYS.accountId, accountId);
  }

  const shortTag = accountId.startsWith('0x')
    ? `${accountId.slice(0, 6)}…${accountId.slice(-4)}`
    : accountId.slice(5, 9);

  const displayName =
    sessionStorage.getString(SYNC_KEYS.displayName) ?? `Founder ${shortTag}`;

  const homeTownId = sessionStorage.getString(SYNC_KEYS.homeTownId) ?? 'town_1';

  const visitingTownId =
    sessionStorage.getString(SYNC_KEYS.visitingTownId) ?? homeTownId;

  const sessionToken = sessionStorage.getString(SYNC_KEYS.sessionToken) ?? null;

  return {
    accountId,
    sessionToken,
    displayName,
    homeTownId,
    visitingTownId,
  };
}

export function loadLastTownSeq(townId: string): number {
  return sessionStorage.getNumber(`${SYNC_KEYS.seqPrefix}${townId}`) ?? 0;
}

export function loadLastSyncDiagnostic(): string | null {
  return sessionStorage.getString(SYNC_KEYS.lastDiag) ?? null;
}

function recordSyncDiagnostic(diag: string | null): void {
  if (diag === null || diag.length === 0) {
    sessionStorage.remove(SYNC_KEYS.lastDiag);

    return;
  }

  sessionStorage.set(SYNC_KEYS.lastDiag, diag);

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[AnvilSync] ${diag}`);
  }
}

export async function authenticateSuiSession(
  initialCoinsFc?: number
): Promise<boolean> {
  const wallet = await ensureLocalSuiWallet();
  const meta = loadStoredAccountMeta();
  const baseUrl = resolveBackendHttpBaseUrl();

  try {
    const challengeRes = await fetch(`${baseUrl}/api/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suiAddress: wallet.suiAddress }),
    });

    if (challengeRes.ok) {
      // SAFETY: `/api/auth/challenge` returns `{ suiAddress, nonce, messageToSign, expiresAtMs }`
      const challenge =
        (await challengeRes.json()) as SuiChallengeResponsePayload;

      const signed = await signPersonalChallengeWithLocalWallet(
        challenge.messageToSign
      );

      const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suiAddress: signed.suiAddress,
          signature: signed.signature,
          displayName: meta.displayName,
          homeTownId: meta.homeTownId,
          initialCoinsFc,
        }),
      });

      if (verifyRes.ok) {
        // SAFETY: `/api/auth/verify` returns `{ verified, account, sessionToken }`
        const verifiedData =
          (await verifyRes.json()) as SessionResponsePayload;

        sessionStorage.set(SYNC_KEYS.sessionToken, verifiedData.sessionToken);
        sessionStorage.set(
          SYNC_KEYS.accountId,
          verifiedData.account.accountId
        );
        markSuiAuthVerified(true);
        recordSyncDiagnostic(null);

        return true;
      }

      recordSyncDiagnostic(
        `Sui signature verify rejected (HTTP ${verifyRes.status})`
      );

      return false;
    }

    // Zero-downtime rollout path only when remote server has not deployed `/api/auth/challenge` yet
    if (challengeRes.status === 404) {
      const legacyId = `yeti_${wallet.suiAddress.slice(2, 14)}`;

      const response = await fetch(`${baseUrl}/api/accounts/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: legacyId,
          displayName: meta.displayName,
          homeTownId: meta.homeTownId,
          initialCoinsFc,
        }),
      });

      if (!response.ok) {
        recordSyncDiagnostic(
          `Legacy session bootstrap failed (HTTP ${response.status})`
        );

        return false;
      }

      // SAFETY: `/api/accounts/session` returns `{ account, sessionToken }`
      const data = (await response.json()) as SessionResponsePayload;

      sessionStorage.set(SYNC_KEYS.sessionToken, data.sessionToken);
      sessionStorage.set(SYNC_KEYS.accountId, data.account.accountId);
      recordSyncDiagnostic(
        'Connected via legacy session (redeploy backend to enable Sui Ed25519 auth)'
      );

      return true;
    }

    recordSyncDiagnostic(
      `Auth challenge failed (HTTP ${challengeRes.status})`
    );

    return false;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Network unreachable';

    recordSyncDiagnostic(`Backend offline (${reason}) — queueing in MMKV outbox`);

    return false;
  }
}

export function saveLastTownSeq(townId: string, seq: number): void {
  if (seq > 0) {
    sessionStorage.set(`${SYNC_KEYS.seqPrefix}${townId}`, seq);
  }
}

export function loadOutboxQueue(): OutboxCommandEntry[] {
  const raw = sessionStorage.getString(SYNC_KEYS.outbox);

  if (raw === undefined || raw.length === 0) {
    return [];
  }

  const lines = raw.split('\n');
  const entries: OutboxCommandEntry[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const parts = lines[i].split('|');

    if (parts.length < 5) {
      continue;
    }

    const cmdId = parts[0];
    const kindRaw = parts[1];
    const itemRaw = parts[2];
    const qtyDelta = Number(parts[3]) || 0;
    const coinsDelta = Number(parts[4]) || 0;

    if (
      kindRaw !== 'HARVEST_GAIN' &&
      kindRaw !== 'CRAFT_DELTA' &&
      kindRaw !== 'LOCAL_SELL' &&
      kindRaw !== 'LOCAL_BUY'
    ) {
      continue;
    }

    // SAFETY: `itemRaw` was serialized solely from `BackendPricingItemId` or empty string
    const itemId =
      itemRaw.length > 0 ? (itemRaw as BackendPricingItemId) : null;

    entries.push({
      cmdId,
      kind: kindRaw,
      itemId,
      qtyDelta,
      coinsDelta,
    });
  }

  return entries;
}

function saveOutboxQueue(entries: readonly OutboxCommandEntry[]): void {
  if (entries.length === 0) {
    sessionStorage.remove(SYNC_KEYS.outbox);

    return;
  }

  const lines: string[] = [];
  const startIdx = Math.max(0, entries.length - 64);

  for (let i = startIdx; i < entries.length; i += 1) {
    const e = entries[i];

    lines.push(
      `${e.cmdId}|${e.kind}|${e.itemId ?? ''}|${e.qtyDelta}|${e.coinsDelta}`
    );
  }

  sessionStorage.set(SYNC_KEYS.outbox, lines.join('\n'));
}

export function enqueueOutboxCommand(entry: OutboxCommandEntry): number {
  const queue = loadOutboxQueue();

  queue.push(entry);
  saveOutboxQueue(queue);

  return queue.length;
}

export function acknowledgeOutboxCommand(cmdId: string): number {
  const queue = loadOutboxQueue();
  const remaining: OutboxCommandEntry[] = [];

  for (let i = 0; i < queue.length; i += 1) {
    if (queue[i].cmdId !== cmdId) {
      remaining.push(queue[i]);
    }
  }

  saveOutboxQueue(remaining);

  return remaining.length;
}

function mapActionAndTileToStreetNode(
  actionType: string,
  tileX: number,
  tileY: number
): StreetNodeId {
  switch (actionType) {
    case 'FISH_FROZEN_LAKE':
      return 'east_harbor';
    case 'GATHER_FOREST_TIMBER':
    case 'STROLL_FOREST_TRAIL':
      return 'west_sawmill';
    case 'CRAFT_RECIPE_BATCH':
      return tileX < 30 ? 'plaza_north' : 'west_blacksmith';
    case 'BUILD_STRUCTURAL_WORK':
      return 'west_builder';
    case 'BUY_MARKET_GOODS':
    case 'SELL_SURPLUS_GOODS':
      return 'east_main';
    case 'CAST_MAYOR_ELECTION_VOTE':
    case 'DEPOSIT_OR_BORROW_BANK':
      return 'civic_plaza';
    case 'TILL_AND_PLANT_CROP':
    case 'HARVEST_RIPE_CROP':
      return 'south_farm_end';
    default: {
      const idx = Math.abs(tileX * 3 + tileY) % STREET_NODE_RING.length;

      return STREET_NODE_RING[idx];
    }
  }
}

export interface LiveSyncCallbacks {
  readonly onDirectCanvasIntent: (
    villagerIndex: number,
    targetNode: StreetNodeId,
    isIndoors: boolean,
    durationMs: number
  ) => void;
  readonly onConnectionChange: (
    connected: boolean,
    activeTownId: string,
    seq: number,
    outboxCount: number
  ) => void;
  readonly onSaleSettled: (
    itemName: string,
    qty: number,
    netCoinsEarnedFc: number,
    buyerName: string
  ) => void;
  readonly onTownTreasurySync: (treasuryFc: number, taxRatePct: number) => void;
}

export class AnvilMultiplexedSyncClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private isReauthenticating = false;
  private backoffMs = 1200;
  private activeTownId: string;
  private readonly callbacks: LiveSyncCallbacks;
  private readonly overlays = new Map<number, LiveVillagerOverlay>();

  constructor(callbacks: LiveSyncCallbacks) {
    const meta = loadStoredAccountMeta();

    this.activeTownId = meta.visitingTownId;
    this.callbacks = callbacks;
  }

  public get currentTownId(): string {
    return this.activeTownId;
  }

  public getVillagerOverlay(
    villagerIndex: number
  ): LiveVillagerOverlay | undefined {
    return this.overlays.get(villagerIndex);
  }

  public setVillagerPersona(
    villagerIndex: number,
    persona: LivePersonaSummary
  ): void {
    const prev = this.overlays.get(villagerIndex);

    this.overlays.set(villagerIndex, {
      backendNpcId: persona.npcId,
      thought: prev?.thought ?? persona.backstory,
      speech: prev?.speech ?? null,
      coinsAfter: prev?.coinsAfter ?? 180,
      actionType: prev?.actionType ?? 'IDLE_BREATHE',
      isIndoors: prev?.isIndoors ?? false,
      persona,
    });
  }

  public async start(initialCoinsFc: number): Promise<void> {
    this.stopped = false;
    await this.bootstrapAccountSession(initialCoinsFc);
    this.openSocket();
  }

  public stop(): void {
    this.stopped = true;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws !== null) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  public dispatchOptimisticCommand(entry: OutboxCommandEntry): void {
    const pendingCount = enqueueOutboxCommand(entry);

    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.sendOutboxEntryOverSocket(entry);
    } else {
      this.callbacks.onConnectionChange(
        false,
        this.activeTownId,
        loadLastTownSeq(this.activeTownId),
        pendingCount
      );
    }
  }

  public switchTown(nextTownId: string): void {
    this.activeTownId = nextTownId;
    sessionStorage.set(SYNC_KEYS.visitingTownId, nextTownId);

    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'SWITCH_TOWN',
          townId: nextTownId,
          lastSeq: loadLastTownSeq(nextTownId),
        })
      );
    }
  }

  public async reconnectWithWallet(initialCoinsFc: number): Promise<void> {
    this.stop();
    await this.start(initialCoinsFc);
  }

  private async bootstrapAccountSession(initialCoinsFc: number): Promise<void> {
    await authenticateSuiSession(initialCoinsFc);
  }

  private openSocket(): void {
    if (this.stopped) {
      return;
    }

    const meta = loadStoredAccountMeta();
    const wsBase = resolveBackendWsBaseUrl();
    const lastSeq = loadLastTownSeq(this.activeTownId);

    const tokenPart =
      meta.sessionToken !== null
        ? `&token=${encodeURIComponent(meta.sessionToken)}`
        : `&accountId=${encodeURIComponent(meta.accountId)}`;

    const url = `${wsBase}/ws?townId=${encodeURIComponent(this.activeTownId)}${tokenPart}&lastSeq=${lastSeq}`;

    try {
      const socket = new WebSocket(url);

      this.ws = socket;

      socket.onopen = () => {
        this.backoffMs = 1200;
        const queue = loadOutboxQueue();

        for (let i = 0; i < queue.length; i += 1) {
          this.sendOutboxEntryOverSocket(queue[i]);
        }

        this.callbacks.onConnectionChange(
          true,
          this.activeTownId,
          loadLastTownSeq(this.activeTownId),
          queue.length
        );
      };

      socket.onmessage = (event) => {
        if (!event.data) {
          return;
        }

        this.handleRawFrame(String(event.data));
      };

      socket.onerror = () => {
        // Handled cleanly in `onclose` exponential backoff
      };

      socket.onclose = () => {
        this.ws = null;
        this.callbacks.onConnectionChange(
          false,
          this.activeTownId,
          loadLastTownSeq(this.activeTownId),
          loadOutboxQueue().length
        );

        if (!this.stopped) {
          const wait = this.backoffMs;

          this.backoffMs = Math.min(15_000, Math.round(this.backoffMs * 1.8));
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.openSocket();
          }, wait);
        }
      };
    } catch {
      // Retry on timer if WebSocket constructor fails
    }
  }

  private sendOutboxEntryOverSocket(entry: OutboxCommandEntry): void {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: 'PLAYER_CMD',
        cmdId: entry.cmdId,
        kind: entry.kind,
        itemId: entry.itemId ?? undefined,
        qtyDelta: entry.qtyDelta,
        coinsDelta: entry.coinsDelta,
      })
    );
  }

  private handleRawFrame(rawText: string): void {
    let env: WireEnvelope;

    try {
      // SAFETY: All WebSocket frames originate from `anvil-backend`'s typed JSON serializer
      env = JSON.parse(rawText) as WireEnvelope;
    } catch {
      return;
    }

    if (env.seq !== undefined && env.seq > 0) {
      saveLastTownSeq(this.activeTownId, env.seq);
    }

    switch (env.packetType) {
      case 'TOWN_SNAPSHOT':
      case 'TOWN_SWITCHED': {
        if (env.town !== undefined) {
          this.activeTownId = env.town.id;
          const pctWhole = Math.round(env.town.taxRatePct * 100);

          this.callbacks.onTownTreasurySync(env.town.treasuryFc, pctWhole);
        }

        if (env.npcs !== undefined) {
          for (let i = 0; i < env.npcs.length; i += 1) {
            const n = env.npcs[i];
            const prev = this.overlays.get(i);

            this.overlays.set(i, {
              backendNpcId: n.id,
              thought: n.thought ?? 'Working in the valley.',
              speech: n.speech,
              coinsAfter: n.coins,
              actionType: n.currentAction,
              isIndoors: n.isIndoors,
              persona: prev?.persona ?? null,
            });
          }
        }

        this.callbacks.onConnectionChange(
          true,
          this.activeTownId,
          env.seq ?? loadLastTownSeq(this.activeTownId),
          loadOutboxQueue().length
        );
        break;
      }

      case 'DELTA_BATCH': {
        if (env.latestSeq !== undefined) {
          saveLastTownSeq(this.activeTownId, env.latestSeq);
        }

        if (env.deltas !== undefined) {
          for (let i = 0; i < env.deltas.length; i += 1) {
            this.applySingleIntentEnvelope(env.deltas[i]);
          }
        }

        this.callbacks.onConnectionChange(
          true,
          this.activeTownId,
          loadLastTownSeq(this.activeTownId),
          loadOutboxQueue().length
        );
        break;
      }

      case 'NPC_INTENT': {
        this.applySingleIntentEnvelope(env);
        break;
      }

      case 'NPC_PERSONA_UPDATED': {
        if (env.persona !== undefined && env.npcId !== undefined) {
          const idx = extractNpcSlotIndex(env.npcId);

          if (idx >= 0) {
            this.setVillagerPersona(idx, env.persona);
          }
        }

        break;
      }

      case 'CMD_ACK': {
        if (env.cmdId !== undefined) {
          const left = acknowledgeOutboxCommand(env.cmdId);

          this.callbacks.onConnectionChange(
            true,
            this.activeTownId,
            env.seq ?? loadLastTownSeq(this.activeTownId),
            left
          );
        }

        break;
      }

      case 'ACCOUNT_EVENT': {
        if (
          env.event === 'ORDER_FILLED' &&
          env.itemName !== undefined &&
          env.netCoinsEarnedFc !== undefined
        ) {
          this.callbacks.onSaleSettled(
            env.itemName,
            env.qty ?? 1,
            env.netCoinsEarnedFc,
            env.buyerDisplayName ?? 'Valley Trader'
          );
        }

        break;
      }

      case 'AUTH_REQUIRED': {
        recordSyncDiagnostic(
          env.message ?? 'Session token expired — re-authenticating Sui wallet'
        );

        if (!this.isReauthenticating && !this.stopped) {
          this.isReauthenticating = true;
          sessionStorage.remove(SYNC_KEYS.sessionToken);

          void authenticateSuiSession()
            .then((ok) => {
              if (ok && !this.stopped) {
                this.stop();
                this.stopped = false;
                this.openSocket();
              }
            })
            .finally(() => {
              this.isReauthenticating = false;
            });
        }

        break;
      }

      case 'ERROR': {
        recordSyncDiagnostic(env.message ?? 'WebSocket server frame error');

        break;
      }

      default:
        break;
    }
  }

  private applySingleIntentEnvelope(env: WireEnvelope): void {
    if (env.npcId === undefined) {
      return;
    }

    const idx = extractNpcSlotIndex(env.npcId);

    if (idx < 0) {
      return;
    }

    const actionType = env.action?.type ?? 'WALK_TO_LANDMARK';
    const isIndoors = env.isIndoors === true;
    const prev = this.overlays.get(idx);

    this.overlays.set(idx, {
      backendNpcId: env.npcId,
      thought: env.thought ?? prev?.thought ?? 'Focused on today’s task.',
      speech: env.speech ?? null,
      coinsAfter: env.coinsAfter ?? prev?.coinsAfter ?? 180,
      actionType,
      isIndoors,
      persona: prev?.persona ?? null,
    });

    const targetNode = mapActionAndTileToStreetNode(
      actionType,
      env.toTileX ?? 32,
      env.toTileY ?? 32
    );

    const durationMs = Math.max(
      2800,
      (env.arriveAtMs ?? 0) - (env.departAtMs ?? 0)
    );

    // Zero React re-render: routes directly into Skia SharedValue flat buffer!
    this.callbacks.onDirectCanvasIntent(
      idx,
      targetNode,
      isIndoors,
      durationMs
    );
  }
}

function extractNpcSlotIndex(npcId: string): number {
  const marker = '_npc_';
  const pos = npcId.lastIndexOf(marker);

  if (pos < 0) {
    return -1;
  }

  const num = Number(npcId.slice(pos + marker.length));

  if (!Number.isFinite(num) || num < 1) {
    return -1;
  }

  return Math.floor(num) - 1;
}

export async function fetchTownsDirectory(): Promise<DirectoryTownSummary[]> {
  const baseUrl = resolveBackendHttpBaseUrl();
  const response = await fetch(`${baseUrl}/api/towns/directory?limit=12`);

  if (!response.ok) {
    throw new Error(`Directory HTTP ${response.status}`);
  }

  // SAFETY: `/api/towns/directory` returns `{ towns: DirectoryTownSummary[] }`
  const body = (await response.json()) as DirectoryResponsePayload;

  return [...body.towns];
}

export async function fetchInterTownOrders(): Promise<InterTownMarketOrder[]> {
  const baseUrl = resolveBackendHttpBaseUrl();
  const response = await fetch(`${baseUrl}/api/market/orders`);

  if (!response.ok) {
    throw new Error(`Orders HTTP ${response.status}`);
  }

  // SAFETY: `/api/market/orders` returns `{ orders: InterTownMarketOrder[] }`
  const body = (await response.json()) as MarketOrdersResponsePayload;

  return [...body.orders];
}

function buildAuthorizedJsonHeaders(sessionToken: string | null): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });

  if (sessionToken !== null && sessionToken.length > 0) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  return headers;
}

export async function postInterTownOrder(
  itemId: BackendPricingItemId,
  qty: number,
  unitPriceFc: number
): Promise<InterTownMarketOrder> {
  let meta = loadStoredAccountMeta();
  const baseUrl = resolveBackendHttpBaseUrl();

  let response = await fetch(`${baseUrl}/api/market/orders`, {
    method: 'POST',
    headers: buildAuthorizedJsonHeaders(meta.sessionToken),
    body: JSON.stringify({
      sellerAccountId: meta.accountId,
      itemId,
      qty,
      unitPriceFc,
    }),
  });

  if (response.status === 401 && (await authenticateSuiSession())) {
    meta = loadStoredAccountMeta();
    response = await fetch(`${baseUrl}/api/market/orders`, {
      method: 'POST',
      headers: buildAuthorizedJsonHeaders(meta.sessionToken),
      body: JSON.stringify({
        sellerAccountId: meta.accountId,
        itemId,
        qty,
        unitPriceFc,
      }),
    });
  }

  // SAFETY: `/api/market/orders` POST returns `{ order?, error? }`
  const body = (await response.json()) as PostOrderResponsePayload;

  if (!response.ok || body.order === undefined) {
    throw new Error(body.error ?? `Order failed (${response.status})`);
  }

  return body.order;
}

export async function fulfillInterTownOrder(
  orderId: string
): Promise<FulfillOrderResult> {
  let meta = loadStoredAccountMeta();
  const baseUrl = resolveBackendHttpBaseUrl();

  let response = await fetch(
    `${baseUrl}/api/market/orders/${encodeURIComponent(orderId)}/fulfill`,
    {
      method: 'POST',
      headers: buildAuthorizedJsonHeaders(meta.sessionToken),
      body: JSON.stringify({ buyerAccountId: meta.accountId }),
    }
  );

  if (response.status === 401 && (await authenticateSuiSession())) {
    meta = loadStoredAccountMeta();
    response = await fetch(
      `${baseUrl}/api/market/orders/${encodeURIComponent(orderId)}/fulfill`,
      {
        method: 'POST',
        headers: buildAuthorizedJsonHeaders(meta.sessionToken),
        body: JSON.stringify({ buyerAccountId: meta.accountId }),
      }
    );
  }

  // SAFETY: `/fulfill` returns `{ ok, buyerCoinsAfter, order, error }`
  const body = (await response.json()) as FulfillOrderResponsePayload;

  if (
    !response.ok ||
    body.order === undefined ||
    body.buyerCoinsAfter === undefined
  ) {
    throw new Error(body.error ?? `Fulfill failed (${response.status})`);
  }

  return {
    buyerCoinsAfter: body.buyerCoinsAfter,
    order: body.order,
  };
}

export async function cancelInterTownOrder(orderId: string): Promise<void> {
  let meta = loadStoredAccountMeta();
  const baseUrl = resolveBackendHttpBaseUrl();

  let response = await fetch(
    `${baseUrl}/api/market/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: 'POST',
      headers: buildAuthorizedJsonHeaders(meta.sessionToken),
      body: JSON.stringify({ requesterAccountId: meta.accountId }),
    }
  );

  if (response.status === 401 && (await authenticateSuiSession())) {
    meta = loadStoredAccountMeta();
    response = await fetch(
      `${baseUrl}/api/market/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: 'POST',
        headers: buildAuthorizedJsonHeaders(meta.sessionToken),
        body: JSON.stringify({ requesterAccountId: meta.accountId }),
      }
    );
  }

  if (!response.ok) {
    throw new Error(`Cancel failed (${response.status})`);
  }
}

export async function fetchVillagerPersonaFromBackend(
  backendNpcId: string
): Promise<LivePersonaSummary | null> {
  const baseUrl = resolveBackendHttpBaseUrl();

  try {
    const response = await fetch(
      `${baseUrl}/api/npc/${encodeURIComponent(backendNpcId)}/persona`
    );

    if (!response.ok) {
      return null;
    }

    // SAFETY: `GET /api/npc/:id/persona` returns `NpcPersona` matching `LivePersonaSummary`
    return (await response.json()) as LivePersonaSummary;
  } catch {
    return null;
  }
}

export async function generateLiveAiPersonaOnBackend(
  backendNpcId: string
): Promise<LivePersonaSummary | null> {
  const baseUrl = resolveBackendHttpBaseUrl();

  try {
    const response = await fetch(
      `${baseUrl}/api/npc/${encodeURIComponent(backendNpcId)}/persona/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strictSla: false }),
      }
    );

    if (!response.ok) {
      return null;
    }

    // SAFETY: `POST /api/npc/:id/persona/generate` returns `{ persona, usedLiveModel }`
    const body = (await response.json()) as PersonaGenerateResponsePayload;

    return body.persona ?? null;
  } catch {
    return null;
  }
}
