import type { GameIconKey } from '@/game/icon-atlas';
import type { OfficeHolder } from '@/game/town-governance';
import type { NpcAmbitionDrive, StreetNodeId } from '@/game/town-villagers';
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
  readonly role?: string;
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

export interface MayorContenderPayload {
  readonly npcId: string;
  readonly name: string;
  readonly role: string;
  readonly ambitionDrive: NpcAmbitionDrive;
  readonly ambitionLevel: number;
  readonly campaignSupportPct: number;
  readonly coins: number;
}

export interface LiveVillagerOverlay {
  readonly backendNpcId: string;
  readonly name?: string;
  readonly ambitionDrive?: NpcAmbitionDrive;
  readonly ambitionLevel?: number;
  readonly campaignSupportPct?: number;
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
  readonly name?: string;
  readonly role?: string;
  readonly ambitionDrive?: NpcAmbitionDrive;
  readonly ambitionLevel?: number;
  readonly campaignSupportPct?: number;
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
  readonly officeHolder?: OfficeHolder;
  readonly officeHolderNpcId?: string | null;
  readonly officeHolderName?: string;
  readonly lastElectionCycle?: number;
}

interface WireAccountPayload {
  readonly accountId: string;
  readonly displayName: string;
  readonly homeTownId: string;
  readonly visitingTownId: string;
  readonly liquidCoinsFc: number;
}

interface WireEnvelope {
  readonly packetType?: string;
  readonly reqId?: string;
  readonly seq?: number;
  readonly latestSeq?: number;
  readonly townId?: string;
  readonly npcId?: string;
  readonly ambitionDrive?: NpcAmbitionDrive;
  readonly ambitionLevel?: number;
  readonly campaignSupportPct?: number;
  readonly action?: WireActionPayload;
  readonly toTileX?: number;
  readonly toTileY?: number;
  readonly isIndoors?: boolean;
  readonly departAtMs?: number;
  readonly arriveAtMs?: number;
  readonly coinsAfter?: number;
  readonly savingsFc?: number;
  readonly loanDebtFc?: number;
  readonly creditScore?: number;
  readonly speech?: string | null;
  readonly thought?: string;
  readonly cmdId?: string;
  readonly liquidCoinsFc?: number;
  readonly event?: string;
  readonly itemName?: string;
  readonly qty?: number;
  readonly netCoinsEarnedFc?: number;
  readonly sellerCoinsAfter?: number;
  readonly buyerCoinsAfter?: number;
  readonly buyerDisplayName?: string;
  readonly npcs?: readonly WireSnapshotNpc[];
  readonly town?: WireTownHeader;
  readonly deltas?: readonly WireEnvelope[];
  readonly persona?: LivePersonaSummary;
  readonly message?: string;
  readonly error?: string;
  readonly status?: number;
  readonly residentialBuildingCount?: number;
  readonly housingCapacity?: number;
  readonly population?: number;
  readonly spawnedCount?: number;
  readonly playerCredit?: {
    readonly score: number;
    readonly ledger: BackendCreditLedgerPayload;
  };
  readonly npcCredits?: readonly BackendNpcCreditRowPayload[];
  readonly townName?: string;
  readonly officeHolder?: OfficeHolder;
  readonly officeHolderNpcId?: string | null;
  readonly officeHolderName?: string;
  readonly mayorContenders?: readonly MayorContenderPayload[];
  readonly season?: 'WINTER' | 'SUMMER';
  readonly lastElectionCycle?: number;
  readonly ok?: boolean;
  readonly nextLiquidCoinsFc?: number;
  readonly report?: { readonly ledger: BackendCreditLedgerPayload };
  readonly result?: VillagerChatTurnPayload;
  readonly verified?: boolean;
  readonly account?: WireAccountPayload;
  readonly sessionToken?: string;
  readonly suiAddress?: string;
  readonly nonce?: string;
  readonly messageToSign?: string;
  readonly expiresAtMs?: number;
  readonly towns?: readonly DirectoryTownSummary[];
  readonly orders?: readonly InterTownMarketOrder[];
  readonly order?: InterTownMarketOrder;
  readonly id?: string;
  readonly npcName?: string;
  readonly npcRole?: string;
  readonly npcTileX?: number;
  readonly npcTileY?: number;
  readonly targetTileX?: number;
  readonly targetTileY?: number;
  readonly topic?: string;
  readonly requestKind?: 'CHAT' | 'COIN_REQUEST' | 'ITEM_REQUEST';
  readonly requestCoinsFc?: number;
  readonly requestItemId?: string | null;
  readonly requestQty?: number;
  readonly rewardFc?: number;
  readonly urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly createdAtMs?: number;
}

const DEFAULT_RAILWAY_BACKEND_URL =
  'https://anvil-backend-production-cbdb6275.up.railway.app';

export function resolveBackendWsBaseUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? DEFAULT_RAILWAY_BACKEND_URL;

  const normalized =
    process.env.EXPO_OS === 'android' && configured.includes('://localhost')
      ? configured.replace('://localhost', '://10.0.2.2')
      : configured.replace(/\/+$/, '');

  if (normalized.startsWith('wss://') || normalized.startsWith('ws://')) {
    return normalized;
  }

  if (normalized.startsWith('https://')) {
    return `wss://${normalized.slice('https://'.length)}`;
  }

  if (normalized.startsWith('http://')) {
    return `ws://${normalized.slice('http://'.length)}`;
  }

  return `ws://${normalized}`;
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
  if (activeRpcDispatcher !== null) {
    return activeRpcDispatcher.authenticate(initialCoinsFc);
  }

  return false;
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

export interface IncomingNpcApproachPayload {
  readonly id: string;
  readonly npcId: string;
  readonly villagerIndex: number;
  readonly npcName: string;
  readonly npcRole: string;
  readonly message: string;
  readonly topic: string;
  readonly requestKind: 'CHAT' | 'COIN_REQUEST' | 'ITEM_REQUEST';
  readonly requestCoinsFc: number;
  readonly requestItemId: string | null;
  readonly requestQty: number;
  readonly rewardFc: number;
  readonly urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly createdAtMs: number;
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
  readonly onTownHeaderSync?: (header: {
    readonly townName: string;
    readonly officeHolder: OfficeHolder;
    readonly officeHolderNpcId: string | null;
    readonly officeHolderName: string;
    readonly mayorContenders: readonly MayorContenderPayload[];
  }) => void;
  readonly onNpcRosterSync?: (
    updates: readonly {
      readonly slotIndex: number;
      readonly npcId: string;
      readonly name: string;
      readonly ambitionDrive: NpcAmbitionDrive;
      readonly ambitionLevel: number;
      readonly campaignSupportPct: number;
      readonly coins: number;
    }[]
  ) => void;
  readonly onCreditSync?: (payload: {
    readonly playerLedger: BackendCreditLedgerPayload | null;
    readonly npcCredits: readonly BackendNpcCreditRowPayload[];
    readonly townName?: string;
    readonly officeHolder?: OfficeHolder;
    readonly officeHolderNpcId?: string | null;
    readonly officeHolderName?: string;
    readonly mayorContenders?: readonly MayorContenderPayload[];
    readonly lastElectionCycle?: number;
  }) => void;
  readonly onBankActionAck?: (ack: {
    readonly ok: boolean;
    readonly error: string | null;
    readonly nextLiquidCoinsFc: number;
    readonly ledger: BackendCreditLedgerPayload | null;
  }) => void;
  readonly onNpcIntentCredit?: (update: {
    readonly villagerIndex: number;
    readonly coinsAfter: number;
    readonly savingsFc?: number;
    readonly loanDebtFc?: number;
    readonly ambitionDrive?: NpcAmbitionDrive;
    readonly ambitionLevel?: number;
    readonly campaignSupportPct?: number;
  }) => void;
  readonly onPersonaUpdated?: (
    villagerIndex: number,
    overlay: LiveVillagerOverlay
  ) => void;
  readonly onNpcSpawned?: (info: {
    readonly residentialBuildingCount: number;
    readonly housingCapacity: number;
    readonly population: number;
    readonly spawnedCount: number;
  }) => void;
  readonly onGovernanceUpdated?: (
    officeHolder: OfficeHolder,
    lastElectionCycle?: number,
    officeHolderNpcId?: string | null,
    officeHolderName?: string
  ) => void;
  readonly onElectionRejected?: (
    error: string,
    officeHolder?: OfficeHolder
  ) => void;
  readonly onNpcApproachPlayer?: (incoming: IncomingNpcApproachPayload) => void;
}

const STREAM_QUEUE_KEY = 'mp.v1.streamQueue';

interface PendingChatWaiter {
  readonly resolve: (res: VillagerChatTurnPayload | null) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface PendingRpcWaiter {
  readonly resolve: (env: WireEnvelope) => void;
  readonly reject: (err: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface OpenWaiter {
  readonly resolve: (ready: boolean) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface RpcStreamDispatcher {
  readonly sendRpc: (
    buildFrame: (reqId: string) => string,
    timeoutMs?: number
  ) => Promise<WireEnvelope>;
  readonly authenticate: (initialCoinsFc?: number) => Promise<boolean>;
}

let activeChatStreamDispatcher:
  | ((input: SendVillagerChatInput) => Promise<VillagerChatTurnPayload | null>)
  | null = null;

let activeRpcDispatcher: RpcStreamDispatcher | null = null;

function loadStreamQueue(): string[] {
  const raw = sessionStorage.getString(STREAM_QUEUE_KEY);

  if (raw === undefined || raw.length === 0) {
    return [];
  }

  return raw.split('\n').filter((line) => line.length > 0);
}

function appendToStreamQueue(serializedFrame: string): void {
  const existing = loadStreamQueue();

  existing.push(serializedFrame);
  const capped = existing.slice(-48);

  sessionStorage.set(STREAM_QUEUE_KEY, capped.join('\n'));
}

export class AnvilMultiplexedSyncClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private initialCoinsFc = 180;
  private pendingAuthPromise: Promise<boolean> | null = null;
  private backoffMs = 1200;
  private activeTownId: string;
  private readonly callbacks: LiveSyncCallbacks;
  private readonly overlays = new Map<number, LiveVillagerOverlay>();
  private readonly pendingChats = new Map<string, PendingChatWaiter>();
  private readonly pendingRpcs = new Map<string, PendingRpcWaiter>();
  private readonly openWaiters: OpenWaiter[] = [];
  private chatReqSeq = 1;
  private rpcReqSeq = 1;

  private readonly chatDispatcher = (
    input: SendVillagerChatInput
  ): Promise<VillagerChatTurnPayload | null> =>
    this.isConnected ? this.sendChatStream(input) : Promise.resolve(null);

  private readonly rpcDispatcher: RpcStreamDispatcher = {
    sendRpc: (buildFrame, timeoutMs) => this.sendRpcFrame(buildFrame, timeoutMs),
    authenticate: (initialCoins) => this.authenticateOverActiveSocket(initialCoins),
  };

  constructor(callbacks: LiveSyncCallbacks) {
    const meta = loadStoredAccountMeta();

    this.activeTownId = meta.visitingTownId;
    this.callbacks = callbacks;
  }

  public get currentTownId(): string {
    return this.activeTownId;
  }

  public get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
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

    const updated: LiveVillagerOverlay = {
      backendNpcId: persona.npcId,
      thought: prev?.thought ?? persona.backstory,
      speech: prev?.speech ?? null,
      coinsAfter: prev?.coinsAfter ?? 180,
      actionType: prev?.actionType ?? 'IDLE_BREATHE',
      isIndoors: prev?.isIndoors ?? false,
      persona,
    };

    this.overlays.set(villagerIndex, updated);
    this.callbacks.onPersonaUpdated?.(villagerIndex, updated);
  }

  public async start(initialCoinsFc: number): Promise<void> {
    this.stopped = false;
    this.initialCoinsFc = initialCoinsFc;
    activeRpcDispatcher = this.rpcDispatcher;
    activeChatStreamDispatcher = this.chatDispatcher;
    await ensureLocalSuiWallet();
    this.openSocket();
  }

  public stop(): void {
    this.stopped = true;

    if (activeRpcDispatcher === this.rpcDispatcher) {
      activeRpcDispatcher = null;
    }

    if (activeChatStreamDispatcher === this.chatDispatcher) {
      activeChatStreamDispatcher = null;
    }

    for (let i = 0; i < this.openWaiters.length; i += 1) {
      clearTimeout(this.openWaiters[i].timer);
      this.openWaiters[i].resolve(false);
    }

    this.openWaiters.length = 0;

    for (const [, waiter] of this.pendingChats) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }

    this.pendingChats.clear();

    for (const [, rpcWaiter] of this.pendingRpcs) {
      clearTimeout(rpcWaiter.timer);
      rpcWaiter.reject(new Error('WebSocket sync client stopped'));
    }

    this.pendingRpcs.clear();

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

  private sendOrQueueStreamFrame(frameJson: string, queueWhenOffline: boolean): boolean {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frameJson);

      return true;
    }

    if (queueWhenOffline) {
      appendToStreamQueue(frameJson);
    }

    return false;
  }

  /** Streams the player's chosen Town Name + startup initialization (`START_TOWN`) over WebSocket. */
  public sendStartTownStream(
    townName: string,
    townId?: string,
    founderName?: string
  ): boolean {
    const targetTownId = townId ?? this.activeTownId;

    if (targetTownId.length > 0 && targetTownId !== this.activeTownId) {
      this.activeTownId = targetTownId;
      sessionStorage.set(SYNC_KEYS.visitingTownId, targetTownId);
    }

    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'START_TOWN',
        townId: targetTownId,
        townName: townName.trim().slice(0, 48),
        founderName,
        lastSeq: loadLastTownSeq(targetTownId),
      }),
      true
    );
  }

  private lastPlayerPosTx = -1;
  private lastPlayerPosTy = -1;
  private lastPlayerPosSentAtMs = 0;

  /** Streams the player's current 64x64 town tile coordinates (throttled & deduped) so autonomous NPCs can walk up and talk. */
  public sendPlayerPositionStream(
    tileX: number,
    tileY: number,
    displayName?: string
  ): boolean {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    const tx = Math.max(0, Math.min(63, Math.round(tileX)));
    const ty = Math.max(0, Math.min(63, Math.round(tileY)));
    const now = Date.now();

    if (
      tx === this.lastPlayerPosTx &&
      ty === this.lastPlayerPosTy &&
      now - this.lastPlayerPosSentAtMs < 15_000
    ) {
      return false;
    }

    if (now - this.lastPlayerPosSentAtMs < 1200) {
      return false;
    }

    try {
      this.ws.send(
        JSON.stringify({
          type: 'PLAYER_POSITION',
          tx,
          ty,
          displayName,
        })
      );
      this.lastPlayerPosTx = tx;
      this.lastPlayerPosTy = ty;
      this.lastPlayerPosSentAtMs = now;

      return true;
    } catch {
      return false;
    }
  }

  /** Requests fresh player + NPC credit scores over the open WebSocket stream (0 HTTP overhead). */
  public requestCreditSyncStream(playerCoins: number): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'SYNC_CREDIT',
        playerCoins: Math.max(0, Math.round(playerCoins)),
      }),
      false
    );
  }

  /** Streams a player Valley Bank action (`DEPOSIT`/`WITHDRAW`/`BORROW`/`REPAY`) over WebSocket. */
  public sendBankActionStream(
    action: 'DEPOSIT' | 'WITHDRAW' | 'BORROW' | 'REPAY',
    amountFc: number,
    currentLiquidCoinsFc: number
  ): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'BANK_ACTION',
        action,
        amountFc: Math.max(1, Math.floor(amountFc)),
        currentLiquidCoinsFc: Math.max(0, Math.round(currentLiquidCoinsFc)),
      }),
      true
    );
  }

  /** Streams an NPC bank cycle trigger over WebSocket (server broadcasts `TOWN_CREDIT_SYNC`). */
  public sendRunNpcBankCycleStream(playerCoins: number): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'RUN_NPC_BANK_CYCLE',
        playerCoins: Math.max(0, Math.round(playerCoins)),
      }),
      false
    );
  }

  /** Streams a newly built residential Cottage over WebSocket (grows NPCs on server). */
  public sendBuildResidentialStream(building: {
    readonly buildingId: string;
    readonly name: string;
    readonly doorTileX: number;
    readonly doorTileY: number;
  }): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'BUILD_RESIDENTIAL',
        buildingId: building.buildingId,
        name: building.name,
        doorTileX: building.doorTileX,
        doorTileY: building.doorTileY,
      }),
      true
    );
  }

  /** Streams a Summer-only election ballot over WebSocket. */
  public sendHoldElectionStream(
    approvalPct: number,
    season: 'WINTER' | 'SUMMER',
    cycleIndex: number
  ): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'HOLD_ELECTION',
        approvalPct,
        season,
        cycleIndex,
      }),
      true
    );
  }

  /** Streams a Player <-> NPC coin/trade delta over WebSocket so backend NPC & Player credit stay synced. */
  public sendNpcTradeDeltaStream(
    npcSlotIndex: number,
    playerCoinsDelta: number,
    villagerCoinsDelta: number,
    currentLiquidCoinsFc: number
  ): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'NPC_TRADE_DELTA',
        npcSlotIndex,
        playerCoinsDelta,
        villagerCoinsDelta,
        currentLiquidCoinsFc: Math.max(0, Math.round(currentLiquidCoinsFc)),
      }),
      true
    );
  }

  /** Streams a citizen persona lookup (`GET_PERSONA` -> `NPC_PERSONA_UPDATED`) over WebSocket. */
  public requestPersonaStream(backendNpcId: string): boolean {
    return this.sendOrQueueStreamFrame(
      JSON.stringify({
        type: 'GET_PERSONA',
        npcId: backendNpcId,
      }),
      false
    );
  }

  /** Streams 1-on-1 villager dialogue & swap verification (`NPC_CHAT` -> `NPC_CHAT_REPLY`) over WebSocket. */
  public sendChatStream(
    input: SendVillagerChatInput
  ): Promise<VillagerChatTurnPayload | null> {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.resolve(null);
    }

    const reqId = `chat_${Date.now()}_${this.chatReqSeq}`;

    this.chatReqSeq += 1;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingChats.delete(reqId);
        resolve(null);
      }, 15_000);

      this.pendingChats.set(reqId, { resolve, timer });

      this.ws?.send(
        JSON.stringify({
          type: 'NPC_CHAT',
          reqId,
          npcId: input.backendNpcId,
          payload: {
            villagerName: input.villagerName,
            villagerRole: input.villagerRole,
            villagerPersonality: input.villagerPersonality,
            villagerAmbitionDrive: input.villagerAmbitionDrive,
            villagerAmbitionLevel: input.villagerAmbitionLevel,
            villagerCampaignSupportPct: input.villagerCampaignSupportPct,
            villagerCoins: input.villagerCoins,
            villagerCreditScore: input.villagerCreditScore,
            villagerInventory: input.villagerInventory,
            playerCoins: input.playerCoins,
            playerCreditScore: input.playerCreditScore,
            playerInventory: input.playerInventory,
            playerMessage: input.playerMessage,
            history: input.history,
            proposedBarter: input.proposedBarter,
          },
        })
      );
    });
  }

  private waitForSocketOpen(timeoutMs = 3500): Promise<boolean> {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }

    if (
      this.ws === null ||
      this.ws.readyState !== WebSocket.CONNECTING ||
      this.stopped
    ) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const finish = (ready: boolean): void => {
        if (settled) {
          return;
        }

        settled = true;

        if (timer !== undefined) {
          clearTimeout(timer);
        }

        resolve(ready);
      };

      const waiter: OpenWaiter = {
        resolve: finish,
        timer: setTimeout(() => {
          const idx = this.openWaiters.indexOf(waiter);

          if (idx >= 0) {
            this.openWaiters.splice(idx, 1);
          }

          finish(false);
        }, timeoutMs),
      };

      timer = waiter.timer;
      this.openWaiters.push(waiter);
    });
  }

  public async sendRpcFrame(
    buildFrame: (reqId: string) => string,
    timeoutMs = 10_000
  ): Promise<WireEnvelope> {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      const becameReady = await this.waitForSocketOpen(3500);

      if (
        !becameReady ||
        this.ws === null ||
        this.ws.readyState !== WebSocket.OPEN
      ) {
        throw new Error('Live stream offline — reconnect to continue.');
      }
    }

    const reqId = `rpc_${Date.now()}_${this.rpcReqSeq}`;

    this.rpcReqSeq += 1;
    const frameJson = buildFrame(reqId);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRpcs.delete(reqId);
        reject(new Error('Stream request timed out'));
      }, timeoutMs);

      this.pendingRpcs.set(reqId, { resolve, reject, timer });
      this.ws?.send(frameJson);
    });
  }

  public async authenticateOverActiveSocket(
    initialCoinsFc?: number
  ): Promise<boolean> {
    if (this.pendingAuthPromise !== null) {
      return this.pendingAuthPromise;
    }

    const coins = initialCoinsFc ?? this.initialCoinsFc;

    const task = (async (): Promise<boolean> => {
      const wallet = await ensureLocalSuiWallet();
      const meta = loadStoredAccountMeta();

      try {
        const challengeEnv = await this.sendRpcFrame((reqId) =>
          JSON.stringify({
            type: 'AUTH_CHALLENGE',
            reqId,
            suiAddress: wallet.suiAddress,
          })
        );

        if (
          challengeEnv.packetType !== 'AUTH_CHALLENGE' ||
          challengeEnv.messageToSign === undefined
        ) {
          recordSyncDiagnostic(
            challengeEnv.error ?? 'Sui auth challenge failed over stream'
          );

          return false;
        }

        const signed = await signPersonalChallengeWithLocalWallet(
          challengeEnv.messageToSign
        );

        const verifyEnv = await this.sendRpcFrame((reqId) =>
          JSON.stringify({
            type: 'AUTH_VERIFY',
            reqId,
            suiAddress: signed.suiAddress,
            signature: signed.signature,
            displayName: meta.displayName,
            homeTownId: meta.homeTownId,
            initialCoinsFc: coins,
          })
        );

        if (
          verifyEnv.packetType !== 'AUTH_VERIFIED' ||
          verifyEnv.verified !== true ||
          verifyEnv.sessionToken === undefined ||
          verifyEnv.account === undefined
        ) {
          recordSyncDiagnostic(
            verifyEnv.error ?? 'Sui signature verification rejected over stream'
          );

          return false;
        }

        sessionStorage.set(SYNC_KEYS.sessionToken, verifyEnv.sessionToken);
        sessionStorage.set(SYNC_KEYS.accountId, verifyEnv.account.accountId);
        markSuiAuthVerified(true);
        recordSyncDiagnostic(null);

        return true;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Stream auth offline';

        recordSyncDiagnostic(`Stream auth deferred (${reason})`);

        return false;
      }
    })();

    this.pendingAuthPromise = task;

    try {
      return await task;
    } finally {
      this.pendingAuthPromise = null;
    }
  }

  public async reconnectWithWallet(initialCoinsFc: number): Promise<void> {
    this.stop();
    await this.start(initialCoinsFc);
  }

  private flushQueuedFrames(socket: WebSocket): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const queue = loadOutboxQueue();

    for (let i = 0; i < queue.length; i += 1) {
      this.sendOutboxEntryOverSocket(queue[i]);
    }

    const pendingFrames = loadStreamQueue();

    if (pendingFrames.length > 0) {
      sessionStorage.remove(STREAM_QUEUE_KEY);

      for (let i = 0; i < pendingFrames.length; i += 1) {
        socket.send(pendingFrames[i]);
      }
    }
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

        for (let i = 0; i < this.openWaiters.length; i += 1) {
          this.openWaiters[i].resolve(true);
        }

        this.openWaiters.length = 0;

        const queue = loadOutboxQueue();

        const cachedWallet = loadCachedSuiWalletSummarySync();
        const isWalletVerified = cachedWallet?.isAuthVerified === true;

        const savedTownName = sessionStorage.getString('town.v6.name');
        const hasStarted = sessionStorage.getBoolean('town.v6.started') === true;

        const dispatchStartTownIfReady = (): void => {
          if (
            hasStarted &&
            savedTownName !== undefined &&
            savedTownName.trim().length > 0 &&
            this.ws === socket &&
            socket.readyState === WebSocket.OPEN
          ) {
            socket.send(
              JSON.stringify({
                type: 'START_TOWN',
                townId: this.activeTownId,
                townName: savedTownName.trim().slice(0, 48),
              })
            );
          }
        };

        if (meta.sessionToken !== null && isWalletVerified) {
          dispatchStartTownIfReady();
          this.flushQueuedFrames(socket);
        } else {
          void this.authenticateOverActiveSocket(this.initialCoinsFc).then((ok) => {
            if (ok && this.ws === socket && socket.readyState === WebSocket.OPEN) {
              dispatchStartTownIfReady();
              this.flushQueuedFrames(socket);
            }
          });
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

        for (let i = 0; i < this.openWaiters.length; i += 1) {
          this.openWaiters[i].resolve(false);
        }

        this.openWaiters.length = 0;

        for (const [, rpcWaiter] of this.pendingRpcs) {
          clearTimeout(rpcWaiter.timer);
          rpcWaiter.reject(new Error('WebSocket disconnected before response'));
        }

        this.pendingRpcs.clear();

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

    if (env.reqId !== undefined && env.packetType !== 'NPC_CHAT_REPLY') {
      const rpcWaiter = this.pendingRpcs.get(env.reqId);

      if (rpcWaiter !== undefined) {
        clearTimeout(rpcWaiter.timer);
        this.pendingRpcs.delete(env.reqId);
        rpcWaiter.resolve(env);

        return;
      }
    }

    switch (env.packetType) {
      case 'TOWN_SNAPSHOT':
      case 'TOWN_SWITCHED':
      case 'TOWN_STARTED': {
        const resolvedTownName = env.townName ?? env.town?.name;
        const resolvedOfficeHolder = env.officeHolder ?? env.town?.officeHolder;

        const resolvedHolderNpcId =
          env.officeHolderNpcId !== undefined
            ? env.officeHolderNpcId
            : (env.town?.officeHolderNpcId ?? null);

        const resolvedHolderName =
          env.officeHolderName ??
          env.town?.officeHolderName ??
          (resolvedOfficeHolder === 'PLAYER' ? 'Koda (You)' : 'Elected Mayor');

        if (env.town !== undefined) {
          this.activeTownId = env.town.id;
          const pctWhole = Math.round(env.town.taxRatePct * 100);

          this.callbacks.onTownTreasurySync(env.town.treasuryFc, pctWhole);
        }

        if (resolvedTownName !== undefined || resolvedOfficeHolder !== undefined) {
          this.callbacks.onTownHeaderSync?.({
            townName: resolvedTownName ?? 'Frosthaven',
            officeHolder: resolvedOfficeHolder ?? 'PLAYER',
            officeHolderNpcId: resolvedHolderNpcId,
            officeHolderName: resolvedHolderName,
            mayorContenders: env.mayorContenders ?? [],
          });
        }

        const rosterUpdates: {
          readonly slotIndex: number;
          readonly npcId: string;
          readonly name: string;
          readonly ambitionDrive: NpcAmbitionDrive;
          readonly ambitionLevel: number;
          readonly campaignSupportPct: number;
          readonly coins: number;
        }[] = [];

        if (env.npcs !== undefined) {
          for (let i = 0; i < env.npcs.length; i += 1) {
            const n = env.npcs[i];
            const prev = this.overlays.get(i);
            const slotIdx = extractNpcSlotIndex(n.id);
            const resolvedSlot = slotIdx >= 0 ? slotIdx : i;

            this.overlays.set(resolvedSlot, {
              backendNpcId: n.id,
              name: n.name ?? prev?.name,
              ambitionDrive: n.ambitionDrive ?? prev?.ambitionDrive,
              ambitionLevel: n.ambitionLevel ?? prev?.ambitionLevel,
              campaignSupportPct: n.campaignSupportPct ?? prev?.campaignSupportPct,
              thought: n.thought ?? 'Working in the valley.',
              speech: n.speech,
              coinsAfter: n.coins,
              actionType: n.currentAction,
              isIndoors: n.isIndoors,
              persona: prev?.persona ?? null,
            });

            if (n.name !== undefined && n.name.length > 0) {
              rosterUpdates.push({
                slotIndex: resolvedSlot,
                npcId: n.id,
                name: n.name,
                ambitionDrive: n.ambitionDrive ?? 'NONE',
                ambitionLevel: n.ambitionLevel ?? 40,
                campaignSupportPct: n.campaignSupportPct ?? 0,
                coins: n.coins,
              });
            }
          }
        } else if (env.npcCredits !== undefined) {
          for (let i = 0; i < env.npcCredits.length; i += 1) {
            const c = env.npcCredits[i];
            const slotIdx = extractNpcSlotIndex(c.npcId);

            if (slotIdx >= 0 && c.name.length > 0) {
              rosterUpdates.push({
                slotIndex: slotIdx,
                npcId: c.npcId,
                name: c.name,
                ambitionDrive: c.ambitionDrive ?? 'NONE',
                ambitionLevel: c.ambitionLevel ?? 40,
                campaignSupportPct: c.campaignSupportPct ?? 0,
                coins: c.coins,
              });
            }
          }
        }

        if (rosterUpdates.length > 0) {
          this.callbacks.onNpcRosterSync?.(rosterUpdates);
        }

        if (env.playerCredit !== undefined || env.npcCredits !== undefined) {
          this.callbacks.onCreditSync?.({
            playerLedger: env.playerCredit?.ledger ?? null,
            npcCredits: env.npcCredits ?? [],
            townName: resolvedTownName,
            officeHolder: resolvedOfficeHolder,
            officeHolderNpcId: resolvedHolderNpcId,
            officeHolderName: resolvedHolderName,
            mayorContenders: env.mayorContenders,
            lastElectionCycle:
              env.lastElectionCycle ?? env.town?.lastElectionCycle,
          });
        }

        this.callbacks.onConnectionChange(
          true,
          this.activeTownId,
          env.seq ?? loadLastTownSeq(this.activeTownId),
          loadOutboxQueue().length
        );
        break;
      }

      case 'TOWN_CREDIT_SYNC': {
        if (env.townName !== undefined || env.officeHolder !== undefined) {
          this.callbacks.onTownHeaderSync?.({
            townName: env.townName ?? 'Frosthaven',
            officeHolder: env.officeHolder ?? 'PLAYER',
            officeHolderNpcId: env.officeHolderNpcId ?? null,
            officeHolderName: env.officeHolderName ?? 'Koda (You)',
            mayorContenders: env.mayorContenders ?? [],
          });
        }

        if (env.npcCredits !== undefined && env.npcCredits.length > 0) {
          const updates: {
            readonly slotIndex: number;
            readonly npcId: string;
            readonly name: string;
            readonly ambitionDrive: NpcAmbitionDrive;
            readonly ambitionLevel: number;
            readonly campaignSupportPct: number;
            readonly coins: number;
          }[] = [];

          for (let i = 0; i < env.npcCredits.length; i += 1) {
            const row = env.npcCredits[i];
            const slotIdx = extractNpcSlotIndex(row.npcId);

            if (slotIdx >= 0) {
              const prev = this.overlays.get(slotIdx);

              this.overlays.set(slotIdx, {
                backendNpcId: row.npcId,
                name: row.name,
                ambitionDrive: row.ambitionDrive ?? prev?.ambitionDrive,
                ambitionLevel: row.ambitionLevel ?? prev?.ambitionLevel,
                campaignSupportPct:
                  row.campaignSupportPct ?? prev?.campaignSupportPct,
                thought: prev?.thought ?? 'Working in the valley.',
                speech: prev?.speech ?? null,
                coinsAfter: row.coins,
                actionType: prev?.actionType ?? 'IDLE_BREATHE',
                isIndoors: prev?.isIndoors ?? false,
                persona: prev?.persona ?? null,
              });

              updates.push({
                slotIndex: slotIdx,
                npcId: row.npcId,
                name: row.name,
                ambitionDrive: row.ambitionDrive ?? 'NONE',
                ambitionLevel: row.ambitionLevel ?? 40,
                campaignSupportPct: row.campaignSupportPct ?? 0,
                coins: row.coins,
              });
            }
          }

          if (updates.length > 0) {
            this.callbacks.onNpcRosterSync?.(updates);
          }
        }

        this.callbacks.onCreditSync?.({
          playerLedger: env.playerCredit?.ledger ?? null,
          npcCredits: env.npcCredits ?? [],
          townName: env.townName,
          officeHolder: env.officeHolder,
          officeHolderNpcId: env.officeHolderNpcId,
          officeHolderName: env.officeHolderName,
          mayorContenders: env.mayorContenders,
          lastElectionCycle: env.lastElectionCycle,
        });
        break;
      }

      case 'BANK_ACTION_ACK': {
        this.callbacks.onBankActionAck?.({
          ok: env.ok === true,
          error: env.error ?? null,
          nextLiquidCoinsFc: env.nextLiquidCoinsFc ?? 0,
          ledger: env.report?.ledger ?? null,
        });

        if (env.ok === true && env.report !== undefined) {
          this.callbacks.onCreditSync?.({
            playerLedger: env.report.ledger,
            npcCredits: [],
          });
        }

        break;
      }

      case 'NPC_SPAWNED': {
        this.callbacks.onNpcSpawned?.({
          residentialBuildingCount: env.residentialBuildingCount ?? 0,
          housingCapacity: env.housingCapacity ?? 0,
          population: env.population ?? 0,
          spawnedCount: env.spawnedCount ?? 0,
        });

        if (env.npcCredits !== undefined && env.npcCredits.length > 0) {
          this.callbacks.onCreditSync?.({
            playerLedger: null,
            npcCredits: env.npcCredits,
          });
        }

        break;
      }

      case 'GOVERNANCE_UPDATED': {
        if (env.officeHolder !== undefined) {
          this.callbacks.onGovernanceUpdated?.(
            env.officeHolder,
            env.lastElectionCycle,
            env.officeHolderNpcId,
            env.officeHolderName
          );
        }

        break;
      }

      case 'ELECTION_REJECTED': {
        this.callbacks.onElectionRejected?.(
          env.error ?? 'Elections are held every Summer.',
          env.officeHolder
        );
        break;
      }

      case 'NPC_CHAT_REPLY': {
        if (env.reqId !== undefined) {
          const waiter = this.pendingChats.get(env.reqId);

          if (waiter !== undefined) {
            clearTimeout(waiter.timer);
            this.pendingChats.delete(env.reqId);
            waiter.resolve(env.ok === true && env.result !== undefined ? env.result : null);
          }
        }

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

        if (env.playerCredit !== undefined || env.npcCredits !== undefined) {
          this.callbacks.onCreditSync?.({
            playerLedger: env.playerCredit?.ledger ?? null,
            npcCredits: env.npcCredits ?? [],
            officeHolder: env.officeHolder,
            lastElectionCycle: env.lastElectionCycle,
          });
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

      case 'NPC_APPROACH_PLAYER': {
        if (env.npcId !== undefined && env.message !== undefined) {
          const idx = extractNpcSlotIndex(env.npcId);

          if (idx >= 0) {
            const prev = this.overlays.get(idx);

            this.overlays.set(idx, {
              backendNpcId: env.npcId,
              name: env.npcName ?? prev?.name,
              ambitionDrive: prev?.ambitionDrive,
              ambitionLevel: prev?.ambitionLevel,
              campaignSupportPct: prev?.campaignSupportPct,
              thought: prev?.thought ?? env.message,
              speech: env.message,
              coinsAfter: prev?.coinsAfter ?? 180,
              actionType: 'CHAT_WITH_NEIGHBOR',
              isIndoors: false,
              persona: prev?.persona ?? null,
            });

            const targetNode = mapActionAndTileToStreetNode(
              'CHAT_WITH_NEIGHBOR',
              env.targetTileX ?? 32,
              env.targetTileY ?? 32
            );

            this.callbacks.onDirectCanvasIntent(idx, targetNode, false, 4500);
          }

          this.callbacks.onNpcApproachPlayer?.({
            id: env.id ?? `approach_${env.npcId}_${Date.now()}`,
            npcId: env.npcId,
            villagerIndex: idx >= 0 ? idx : 0,
            npcName: env.npcName ?? 'Villager',
            npcRole: env.npcRole ?? 'CITIZEN',
            message: env.message,
            topic: env.topic ?? 'FRIENDLY_GREETING',
            requestKind: env.requestKind ?? 'CHAT',
            requestCoinsFc: env.requestCoinsFc ?? 0,
            requestItemId: env.requestItemId ?? null,
            requestQty: env.requestQty ?? 0,
            rewardFc: env.rewardFc ?? 0,
            urgency: env.urgency ?? 'LOW',
            createdAtMs: env.createdAtMs ?? Date.now(),
          });
        }

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

          if (env.playerCredit !== undefined) {
            this.callbacks.onCreditSync?.({
              playerLedger: env.playerCredit.ledger,
              npcCredits: [],
            });
          }

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
        sessionStorage.remove(SYNC_KEYS.sessionToken);

        if (!this.stopped) {
          void this.authenticateOverActiveSocket(this.initialCoinsFc).then(
            (ok) => {
              if (ok && this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
                this.flushQueuedFrames(this.ws);
              }
            }
          );
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
      name: prev?.name,
      ambitionDrive: env.ambitionDrive ?? prev?.ambitionDrive,
      ambitionLevel: env.ambitionLevel ?? prev?.ambitionLevel,
      campaignSupportPct: env.campaignSupportPct ?? prev?.campaignSupportPct,
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

    if (
      env.coinsAfter !== undefined ||
      env.ambitionDrive !== undefined ||
      env.campaignSupportPct !== undefined
    ) {
      this.callbacks.onNpcIntentCredit?.({
        villagerIndex: idx,
        coinsAfter: env.coinsAfter ?? prev?.coinsAfter ?? 180,
        savingsFc: env.savingsFc,
        loanDebtFc: env.loanDebtFc,
        ambitionDrive: env.ambitionDrive,
        ambitionLevel: env.ambitionLevel,
        campaignSupportPct: env.campaignSupportPct,
      });
    }
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

function requireActiveRpcDispatcher(): RpcStreamDispatcher {
  if (activeRpcDispatcher === null) {
    throw new Error('Live stream client is not initialized');
  }

  return activeRpcDispatcher;
}

export async function fetchTownsDirectory(): Promise<DirectoryTownSummary[]> {
  const dispatcher = requireActiveRpcDispatcher();

  const env = await dispatcher.sendRpc((reqId) =>
    JSON.stringify({
      type: 'GET_TOWNS_DIRECTORY',
      reqId,
      limit: 12,
    })
  );

  if (env.towns === undefined) {
    throw new Error(env.error ?? 'Failed to stream towns directory');
  }

  return [...env.towns];
}

export async function fetchInterTownOrders(): Promise<InterTownMarketOrder[]> {
  const dispatcher = requireActiveRpcDispatcher();

  const env = await dispatcher.sendRpc((reqId) =>
    JSON.stringify({
      type: 'GET_MARKET_ORDERS',
      reqId,
    })
  );

  if (env.orders === undefined) {
    throw new Error(env.error ?? 'Failed to stream marketplace orders');
  }

  return [...env.orders];
}

export async function postInterTownOrder(
  itemId: BackendPricingItemId,
  qty: number,
  unitPriceFc: number
): Promise<InterTownMarketOrder> {
  const dispatcher = requireActiveRpcDispatcher();
  let meta = loadStoredAccountMeta();

  let env = await dispatcher.sendRpc((reqId) =>
    JSON.stringify({
      type: 'POST_MARKET_ORDER',
      reqId,
      sellerAccountId: meta.accountId,
      itemId,
      qty,
      unitPriceFc,
    })
  );

  if (
    (env.status === 401 || env.packetType === 'AUTH_REQUIRED') &&
    (await dispatcher.authenticate())
  ) {
    meta = loadStoredAccountMeta();
    env = await dispatcher.sendRpc((reqId) =>
      JSON.stringify({
        type: 'POST_MARKET_ORDER',
        reqId,
        sellerAccountId: meta.accountId,
        itemId,
        qty,
        unitPriceFc,
      })
    );
  }

  if (env.ok !== true || env.order === undefined) {
    throw new Error(env.error ?? 'Order failed over live stream');
  }

  return env.order;
}

export async function fulfillInterTownOrder(
  orderId: string
): Promise<FulfillOrderResult> {
  const dispatcher = requireActiveRpcDispatcher();
  let meta = loadStoredAccountMeta();

  let env = await dispatcher.sendRpc((reqId) =>
    JSON.stringify({
      type: 'FULFILL_MARKET_ORDER',
      reqId,
      orderId,
      buyerAccountId: meta.accountId,
    })
  );

  if (
    (env.status === 401 || env.packetType === 'AUTH_REQUIRED') &&
    (await dispatcher.authenticate())
  ) {
    meta = loadStoredAccountMeta();
    env = await dispatcher.sendRpc((reqId) =>
      JSON.stringify({
        type: 'FULFILL_MARKET_ORDER',
        reqId,
        orderId,
        buyerAccountId: meta.accountId,
      })
    );
  }

  if (
    env.ok !== true ||
    env.order === undefined ||
    env.buyerCoinsAfter === undefined
  ) {
    throw new Error(env.error ?? 'Fulfill failed over live stream');
  }

  return {
    buyerCoinsAfter: env.buyerCoinsAfter,
    order: env.order,
  };
}

export async function cancelInterTownOrder(orderId: string): Promise<void> {
  const dispatcher = requireActiveRpcDispatcher();
  let meta = loadStoredAccountMeta();

  let env = await dispatcher.sendRpc((reqId) =>
    JSON.stringify({
      type: 'CANCEL_MARKET_ORDER',
      reqId,
      orderId,
      requesterAccountId: meta.accountId,
    })
  );

  if (
    (env.status === 401 || env.packetType === 'AUTH_REQUIRED') &&
    (await dispatcher.authenticate())
  ) {
    meta = loadStoredAccountMeta();
    env = await dispatcher.sendRpc((reqId) =>
      JSON.stringify({
        type: 'CANCEL_MARKET_ORDER',
        reqId,
        orderId,
        requesterAccountId: meta.accountId,
      })
    );
  }

  if (env.ok !== true) {
    throw new Error(env.error ?? 'Cancel failed over live stream');
  }
}

export interface VillagerChatCarryItem {
  readonly item: string;
  readonly qty: number;
}

export interface VillagerChatHistoryLine {
  readonly sender: 'player' | 'npc';
  readonly text: string;
}

export type VillagerChatOffer =
  | { readonly kind: 'NONE' }
  | {
      readonly kind: 'GIFT_TO_PLAYER';
      readonly coinsFc: number;
      readonly itemName: string | null;
      readonly itemQty: number;
    }
  | {
      readonly kind: 'REQUEST_FROM_PLAYER';
      readonly coinsFc: number;
      readonly reason: string;
    }
  | {
      readonly kind: 'BARTER_PROPOSAL';
      readonly npcGivesItem: string | null;
      readonly npcGivesQty: number;
      readonly npcGivesCoinsFc: number;
      readonly playerGivesItem: string | null;
      readonly playerGivesQty: number;
      readonly playerGivesCoinsFc: number;
    };

export type VillagerBarterDecision = 'NONE' | 'ACCEPT' | 'DECLINE' | 'COUNTER';

export interface VillagerChatTurnPayload {
  readonly reply: string;
  readonly offer: VillagerChatOffer;
  readonly barterDecision: VillagerBarterDecision;
  readonly usedLiveModel: boolean;
}

/** Wallet-style swap the player builds in the Barter drawer; the villager's LLM decides ACCEPT / COUNTER / DECLINE. */
export interface ProposedBarterInput {
  readonly playerGivesItem: string | null;
  readonly playerGivesQty: number;
  readonly playerGivesCoinsFc: number;
  readonly npcGivesItem: string | null;
  readonly npcGivesQty: number;
  readonly npcGivesCoinsFc: number;
  readonly playerOfferValueFc: number;
  readonly npcAskValueFc: number;
}

export interface SendVillagerChatInput {
  readonly proposedBarter?: ProposedBarterInput;
  readonly backendNpcId: string;
  readonly villagerName: string;
  readonly villagerRole: string;
  readonly villagerPersonality: string;
  readonly villagerAmbitionDrive?: NpcAmbitionDrive;
  readonly villagerAmbitionLevel?: number;
  readonly villagerCampaignSupportPct?: number;
  readonly villagerCoins: number;
  readonly villagerCreditScore: number;
  readonly villagerInventory: readonly VillagerChatCarryItem[];
  readonly playerCoins: number;
  readonly playerCreditScore: number;
  readonly playerInventory: readonly VillagerChatCarryItem[];
  readonly playerMessage: string;
  readonly history: readonly VillagerChatHistoryLine[];
}

function buildLocalHumanChatFallback(
  input: SendVillagerChatInput
): VillagerChatTurnPayload {
  // Never auto-settle a swap offline: the villager must actually review it.
  if (input.proposedBarter !== undefined) {
    return {
      reply: `Hold that thought—I can't reach the market ledger right now. Propose that swap again in a moment?`,
      offer: { kind: 'NONE' },
      barterDecision: 'NONE',
      usedLiveModel: false,
    };
  }

  const msg = input.playerMessage.toLowerCase();
  const isWealthDriven = input.villagerAmbitionDrive === 'RUTHLESS_WEALTH';
  const isMayorAspirant = input.villagerAmbitionDrive === 'MAYOR_ASPIRANT';

  const isStingy =
    isWealthDriven ||
    input.villagerRole === 'landlord' ||
    input.villagerRole === 'banker' ||
    input.villagerRole === 'criminal';

  const isBegging =
    /\b(please|beg|spare|help|broke|poor|starving|freezing|hungry|cold|need|free|gift)\b/.test(
      msg
    );

  const isBarter = /\b(trade|swap|barter|deal|exchange|buy|sell|offer)\b/.test(
    msg
  );

  const npcTop = input.villagerInventory[0] ?? null;
  const playerTop = input.playerInventory[0] ?? null;

  if (isWealthDriven && isBegging) {
    return {
      reply: `Charity doesn't build an empire! Pay full Frost Coin value or bring me extra goods—zero handouts here.`,
      offer: { kind: 'NONE' },
      barterDecision: 'NONE',
      usedLiveModel: false,
    };
  }

  if (isMayorAspirant && /\b(mayor|vote|election|campaign|tax|town hall)\b/.test(msg)) {
    return {
      reply: `My Summer ballot campaign is sitting at ${input.villagerCampaignSupportPct ?? 24}% polling! Back my war chest with 25 FC and I'll remember you at Town Hall.`,
      offer: {
        kind: 'REQUEST_FROM_PLAYER',
        coinsFc: 25,
        reason: 'Summer Mayor campaign war chest',
      },
      barterDecision: 'NONE',
      usedLiveModel: false,
    };
  }

  if (isBegging) {
    if (!isStingy && input.villagerCoins >= 85) {
      if (npcTop !== null && npcTop.qty >= 2) {
        return {
          reply: `Winters here are tough on everyone. Take 1 ${npcTop.item} on me—just help a neighbor when you're back on top.`,
          offer: {
            kind: 'GIFT_TO_PLAYER',
            coinsFc: 0,
            itemName: npcTop.item,
            itemQty: 1,
          },
          barterDecision: 'NONE',
          usedLiveModel: false,
        };
      }

      const giftFc = Math.min(
        15,
        Math.max(5, Math.floor(input.villagerCoins * 0.06))
      );

      return {
        reply: `I can't give away the whole shop, but here's ${giftFc} FC so you aren't left out in the cold.`,
        offer: {
          kind: 'GIFT_TO_PLAYER',
          coinsFc: giftFc,
          itemName: null,
          itemQty: 0,
        },
        barterDecision: 'NONE',
        usedLiveModel: false,
      };
    }

    if (npcTop !== null && playerTop !== null) {
      return {
        reply: `Nothing comes free in this valley! Swap me 1 ${playerTop.item} and I'll part with 1 ${npcTop.item}.`,
        offer: {
          kind: 'BARTER_PROPOSAL',
          npcGivesItem: npcTop.item,
          npcGivesQty: 1,
          npcGivesCoinsFc: 0,
          playerGivesItem: playerTop.item,
          playerGivesQty: 1,
          playerGivesCoinsFc: 0,
        },
        barterDecision: 'NONE',
        usedLiveModel: false,
      };
    }

    return {
      reply: `I'm stretched thin myself right now—could you actually spot me 12 FC for supplies?`,
      offer: {
        kind: 'REQUEST_FROM_PLAYER',
        coinsFc: 12,
        reason: 'Short on supplies',
      },
      barterDecision: 'NONE',
      usedLiveModel: false,
    };
  }

  if (isBarter && npcTop !== null) {
    if (playerTop !== null && playerTop.item !== npcTop.item) {
      return {
        reply: `Fair deal—give me 1 ${playerTop.item} and you can take 1 ${npcTop.item}.`,
        offer: {
          kind: 'BARTER_PROPOSAL',
          npcGivesItem: npcTop.item,
          npcGivesQty: 1,
          npcGivesCoinsFc: 0,
          playerGivesItem: playerTop.item,
          playerGivesQty: 1,
          playerGivesCoinsFc: 0,
        },
        barterDecision: 'NONE',
        usedLiveModel: false,
      };
    }

    return {
      reply: `I've got ${npcTop.qty}× ${npcTop.item} on hand. 16 FC and one is yours.`,
      offer: {
        kind: 'BARTER_PROPOSAL',
        npcGivesItem: npcTop.item,
        npcGivesQty: 1,
        npcGivesCoinsFc: 0,
        playerGivesItem: null,
        playerGivesQty: 0,
        playerGivesCoinsFc: 16,
      },
      barterDecision: 'NONE',
      usedLiveModel: false,
    };
  }

  if (input.villagerCoins < 45 && input.playerCoins >= 80) {
    return {
      reply: `Been a slow day at work. Any chance you could lend me 15 FC until tomorrow?`,
      offer: {
        kind: 'REQUEST_FROM_PLAYER',
        coinsFc: 15,
        reason: 'Needs coins for evening rations',
      },
      barterDecision: 'NONE',
      usedLiveModel: false,
    };
  }

  return {
    reply:
      npcTop !== null
        ? `Good to see you! I've got ${npcTop.qty}× ${npcTop.item} with me if you want to make a trade.`
        : `Trying to keep my savings steady and stay warm—what's on your mind?`,
    offer: { kind: 'NONE' },
    barterDecision: 'NONE',
    usedLiveModel: false,
  };
}

export async function sendVillagerChatMessage(
  input: SendVillagerChatInput
): Promise<VillagerChatTurnPayload> {
  if (activeChatStreamDispatcher !== null) {
    const wsResult = await activeChatStreamDispatcher(input);

    if (wsResult !== null) {
      return wsResult;
    }
  }

  return buildLocalHumanChatFallback(input);
}

export interface BackendCreditLedgerPayload {
  readonly liquidCoinsFc: number;
  readonly savingsFc: number;
  readonly totalEarnedFc: number;
  readonly totalSpentFc: number;
  readonly loanDebtFc: number;
  readonly totalRepaidFc: number;
  readonly loansCleared: number;
}

export interface BackendNpcCreditRowPayload {
  readonly npcId: string;
  readonly name: string;
  readonly role: string;
  readonly ambitionDrive?: NpcAmbitionDrive;
  readonly ambitionLevel?: number;
  readonly campaignSupportPct?: number;
  readonly coins: number;
  readonly savingsFc: number;
  readonly loanDebtFc: number;
  readonly totalEarnedFc?: number;
  readonly totalSpentFc?: number;
  readonly totalRepaidFc?: number;
  readonly loansCleared?: number;
  readonly score: number;
  readonly tier: 'Excellent' | 'Good' | 'Fair' | 'Building';
}
