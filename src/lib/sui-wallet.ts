/**
 * Non-Custodial Local Sui Wallet Manager (`Ed25519` + BIP-39 12-Word Phrase)
 * --------------------------------------------------------------------------
 * - Generates a real Sui `Ed25519Keypair` (`m/44'/784'/0'/0'/0'`) on first launch
 *   using native OS hardware entropy (`expo-crypto` `getRandomValues`).
 * - Encrypts and stores the 12-word Secret Phrase and `suiprivkey1...` Private Key
 *   exclusively inside iOS Keychain / Android Keystore (`expo-secure-store`), with
 *   a web fallback for `expo start --web`.
 * - Caches only the public `0x...` Sui address in `react-native-mmkv` for `0ms`
 *   synchronous HUD reads.
 * - Signs backend authentication challenges locally on-device (`signPersonalMessage`)
 *   so the private key NEVER leaves the player's phone.
 */

import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import {
  DEFAULT_ED25519_DERIVATION_PATH,
  Ed25519Keypair,
} from '@mysten/sui/keypairs/ed25519';
import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { sessionStorage } from '@/lib/storage';

const SECURE_STORE_PRIVKEY_KEY = 'anvil_sui_v1_privkey';
const SECURE_STORE_MNEMONIC_KEY = 'anvil_sui_v1_mnemonic';

const MMKV_PUBLIC_ADDRESS_KEY = 'sui.v1.publicAddress';
const MMKV_HAS_MNEMONIC_KEY = 'sui.v1.hasMnemonic';
const MMKV_AUTH_VERIFIED_KEY = 'sui.v1.authVerified';
const MMKV_SYNC_ACCOUNT_ID_KEY = 'mp.v1.accountId';
const MMKV_SYNC_SESSION_TOKEN_KEY = 'mp.v1.sessionToken';

let inFlightEnsureWalletPromise: Promise<LocalSuiWalletSummary> | null = null;

export interface LocalSuiWalletSummary {
  readonly suiAddress: string;
  readonly shortAddress: string;
  readonly hasSecretPhrase: boolean;
  readonly isAuthVerified: boolean;
}

export interface LocalSuiWalletSecrets {
  readonly suiAddress: string;
  readonly privateKeyBech32: string;
  readonly mnemonicPhrase: string | null;
  readonly mnemonicWords: readonly string[];
  readonly derivationPath: string;
}

export interface SignedChallengePayload {
  readonly suiAddress: string;
  readonly signature: string;
}

export interface ImportSuiWalletResult {
  readonly ok: boolean;
  readonly wallet: LocalSuiWalletSummary | null;
  readonly error: string | null;
}

export function formatShortSuiAddress(address: string): string {
  if (address.length < 14) {
    return address;
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function readSecureItem(key: string): Promise<string | null> {
  if (process.env.EXPO_OS === 'web') {
    return sessionStorage.getString(`web_vault.${key}`) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function writeSecureItem(key: string, value: string): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    sessionStorage.set(`web_vault.${key}`, value);

    return;
  }

  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function removeSecureItem(key: string): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    sessionStorage.remove(`web_vault.${key}`);

    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function persistPublicWalletMetadata(
  suiAddress: string,
  hasSecretPhrase: boolean
): LocalSuiWalletSummary {
  const normalized = suiAddress.toLowerCase();

  sessionStorage.set(MMKV_PUBLIC_ADDRESS_KEY, normalized);
  sessionStorage.set(MMKV_HAS_MNEMONIC_KEY, hasSecretPhrase);
  sessionStorage.set(MMKV_SYNC_ACCOUNT_ID_KEY, normalized);

  const isAuthVerified =
    sessionStorage.getBoolean(MMKV_AUTH_VERIFIED_KEY) ?? false;

  return {
    suiAddress: normalized,
    shortAddress: formatShortSuiAddress(normalized),
    hasSecretPhrase,
    isAuthVerified,
  };
}

export function markSuiAuthVerified(verified: boolean): void {
  sessionStorage.set(MMKV_AUTH_VERIFIED_KEY, verified);
}

export function loadCachedSuiWalletSummarySync(): LocalSuiWalletSummary | null {
  const cachedAddress = sessionStorage.getString(MMKV_PUBLIC_ADDRESS_KEY);

  if (cachedAddress === undefined || !cachedAddress.startsWith('0x')) {
    return null;
  }

  const hasSecretPhrase =
    sessionStorage.getBoolean(MMKV_HAS_MNEMONIC_KEY) ?? true;

  const isAuthVerified =
    sessionStorage.getBoolean(MMKV_AUTH_VERIFIED_KEY) ?? false;

  return {
    suiAddress: cachedAddress,
    shortAddress: formatShortSuiAddress(cachedAddress),
    hasSecretPhrase,
    isAuthVerified,
  };
}

/**
 * Loads the player's existing Sui wallet from OS Keychain/Keystore, or creates
 * a brand-new 12-word BIP-39 Sui wallet on first launch.
 * Single-flight guarded so concurrent callers never race or overwrite keys.
 */
export function ensureLocalSuiWallet(): Promise<LocalSuiWalletSummary> {
  if (inFlightEnsureWalletPromise !== null) {
    return inFlightEnsureWalletPromise;
  }

  const task = ensureLocalSuiWalletInternal().finally(() => {
    inFlightEnsureWalletPromise = null;
  });

  inFlightEnsureWalletPromise = task;

  return task;
}

async function ensureLocalSuiWalletInternal(): Promise<LocalSuiWalletSummary> {
  const existingPrivKey = await readSecureItem(SECURE_STORE_PRIVKEY_KEY);
  const existingMnemonic = await readSecureItem(SECURE_STORE_MNEMONIC_KEY);

  // NEVER silently overwrite a non-empty Keychain slot!
  if (existingPrivKey !== null && existingPrivKey.trim().length > 0) {
    const keypair = Ed25519Keypair.fromSecretKey(existingPrivKey.trim());

    const hasPhrase =
      existingMnemonic !== null && existingMnemonic.trim().length > 0;

    return persistPublicWalletMetadata(keypair.toSuiAddress(), hasPhrase);
  }

  // Generate 128 bits (16 bytes) of hardware CSPRNG entropy -> 12-word BIP-39 phrase
  const entropy = new Uint8Array(16);

  Crypto.getRandomValues(entropy);

  const mnemonic = entropyToMnemonic(entropy, wordlist);

  const keypair = Ed25519Keypair.deriveKeypair(
    mnemonic,
    DEFAULT_ED25519_DERIVATION_PATH
  );

  const privKeyBech32 = keypair.getSecretKey();
  const suiAddress = keypair.toSuiAddress();

  await writeSecureItem(SECURE_STORE_PRIVKEY_KEY, privKeyBech32);
  await writeSecureItem(SECURE_STORE_MNEMONIC_KEY, mnemonic);
  markSuiAuthVerified(false);

  return persistPublicWalletMetadata(suiAddress, true);
}

/**
 * Reads the sensitive 12-word Secret Phrase and `suiprivkey1...` Private Key
 * strictly on-demand when the player taps Reveal inside Wallet Settings.
 */
export async function revealLocalSuiWalletSecrets(): Promise<LocalSuiWalletSecrets> {
  await ensureLocalSuiWallet();

  const storedPrivKey = await readSecureItem(SECURE_STORE_PRIVKEY_KEY);
  const storedMnemonic = await readSecureItem(SECURE_STORE_MNEMONIC_KEY);

  if (storedPrivKey === null) {
    throw new Error('Wallet secret key unavailable in SecureStore');
  }

  const keypair = Ed25519Keypair.fromSecretKey(storedPrivKey);

  const cleanMnemonic =
    storedMnemonic !== null && storedMnemonic.trim().length > 0
      ? storedMnemonic.trim()
      : null;

  const words = cleanMnemonic !== null ? cleanMnemonic.split(/\s+/) : [];

  return {
    suiAddress: keypair.toSuiAddress(),
    privateKeyBech32: keypair.getSecretKey(),
    mnemonicPhrase: cleanMnemonic,
    mnemonicWords: words,
    derivationPath: DEFAULT_ED25519_DERIVATION_PATH,
  };
}

/**
 * Restores / switches the local wallet from EITHER:
 *   1. A 12-word or 24-word BIP-39 Secret Recovery Phrase, OR
 *   2. A Sui Bech32 Private Key (`suiprivkey1...`).
 */
export async function importLocalSuiWallet(
  rawInput: string
): Promise<ImportSuiWalletResult> {
  const trimmed = rawInput.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      wallet: null,
      error: 'Enter a 12-word secret phrase or private key.',
    };
  }

  // Case A: Sui Bech32 Private Key (`suiprivkey1...`)
  if (trimmed.toLowerCase().startsWith('suiprivkey1')) {
    try {
      const normalizedKey = trimmed.toLowerCase();
      const parsed = decodeSuiPrivateKey(normalizedKey);

      if (parsed.scheme !== 'ED25519') {
        return {
          ok: false,
          wallet: null,
          error: 'Unsupported private key type.',
        };
      }

      const keypair = Ed25519Keypair.fromSecretKey(normalizedKey);
      const suiAddress = keypair.toSuiAddress();

      await writeSecureItem(SECURE_STORE_PRIVKEY_KEY, keypair.getSecretKey());
      await removeSecureItem(SECURE_STORE_MNEMONIC_KEY);
      sessionStorage.remove(MMKV_SYNC_SESSION_TOKEN_KEY);
      markSuiAuthVerified(false);

      const summary = persistPublicWalletMetadata(suiAddress, false);

      return { ok: true, wallet: summary, error: null };
    } catch {
      return {
        ok: false,
        wallet: null,
        error: 'Invalid private key.',
      };
    }
  }

  // Case B: 12-word or 24-word BIP-39 Secret Recovery Phrase
  const normalizedPhrase = trimmed.toLowerCase().replace(/\s+/g, ' ');
  const wordCount = normalizedPhrase.split(' ').length;

  if (wordCount !== 12 && wordCount !== 24) {
    return {
      ok: false,
      wallet: null,
      error: `Expected a 12-word secret phrase or private key.`,
    };
  }

  if (!validateMnemonic(normalizedPhrase, wordlist)) {
    return {
      ok: false,
      wallet: null,
      error: 'Invalid recovery phrase — check word spelling and order.',
    };
  }

  try {
    const keypair = Ed25519Keypair.deriveKeypair(
      normalizedPhrase,
      DEFAULT_ED25519_DERIVATION_PATH
    );

    const suiAddress = keypair.toSuiAddress();

    await writeSecureItem(SECURE_STORE_PRIVKEY_KEY, keypair.getSecretKey());
    await writeSecureItem(SECURE_STORE_MNEMONIC_KEY, normalizedPhrase);
    sessionStorage.remove(MMKV_SYNC_SESSION_TOKEN_KEY);
    markSuiAuthVerified(false);

    const summary = persistPublicWalletMetadata(suiAddress, true);

    return { ok: true, wallet: summary, error: null };
  } catch {
    return {
      ok: false,
      wallet: null,
      error: 'Could not derive Sui Ed25519 wallet from phrase.',
    };
  }
}

/**
 * Signs a server-issued challenge string on-device using Sui `PersonalMessage`
 * intent scope (`[3, 0, 0]`). Private key never leaves SecureStore/RAM.
 */
export async function signPersonalChallengeWithLocalWallet(
  messageToSign: string
): Promise<SignedChallengePayload> {
  await ensureLocalSuiWallet();

  const storedPrivKey = await readSecureItem(SECURE_STORE_PRIVKEY_KEY);

  if (storedPrivKey === null) {
    throw new Error('Missing local Sui private key');
  }

  const keypair = Ed25519Keypair.fromSecretKey(storedPrivKey);
  const messageBytes = new TextEncoder().encode(messageToSign);
  const signed = await keypair.signPersonalMessage(messageBytes);

  return {
    suiAddress: keypair.toSuiAddress(),
    signature: signed.signature,
  };
}

export async function copyPublicText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

export async function copySecretWalletText(secretText: string): Promise<void> {
  await Clipboard.setStringAsync(secretText, {
    android: { isSensitive: true },
    ios: {
      localOnly: true,
      expiresAt: new Date(Date.now() + 90_000),
    },
  });
}

export async function readClipboardText(): Promise<string> {
  return Clipboard.getStringAsync();
}
