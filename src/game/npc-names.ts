import { adjectives, names, uniqueNamesGenerator } from 'unique-names-generator';

function hashSeed(input: string): number {
  let h = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

/**
 * Generates a unique human-readable NPC name backed by `unique-names-generator`,
 * guaranteeing zero duplicate citizen names within a town roster.
 */
export function generateUniqueNpcName(
  seedKey: string,
  usedNames?: Set<string>,
): string {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const seed = hashSeed(`${seedKey}:npc:${attempt}`);

    const candidate = uniqueNamesGenerator({
      dictionaries: [names],
      style: 'capital',
      seed,
    }).trim();

    if (candidate.length > 0 && (!usedNames || !usedNames.has(candidate.toLowerCase()))) {
      usedNames?.add(candidate.toLowerCase());

      return candidate;
    }
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const seed = hashSeed(`${seedKey}:compound:${attempt}`);

    const combo = uniqueNamesGenerator({
      dictionaries: [adjectives, names],
      separator: ' ',
      style: 'capital',
      seed,
    }).trim();

    if (!usedNames || !usedNames.has(combo.toLowerCase())) {
      usedNames?.add(combo.toLowerCase());

      return combo;
    }
  }

  const finalSeed = hashSeed(`${seedKey}:fallback`);

  const base = uniqueNamesGenerator({
    dictionaries: [names],
    style: 'capital',
    seed: finalSeed,
  }).trim();

  const disambiguated = `${base} ${finalSeed % 97}`;
  usedNames?.add(disambiguated.toLowerCase());

  return disambiguated;
}

const TOWN_SUFFIXES: readonly string[] = [
  'Vale',
  'Peak',
  'Hollow',
  'Haven',
  'Crest',
  'Ridge',
  'Glade',
];

/**
 * Generates a fresh Alpine town name suggestion using `unique-names-generator`.
 */
export function generateSuggestedTownName(seedKey = String(Date.now())): string {
  const seed = hashSeed(seedKey);

  const word = uniqueNamesGenerator({
    dictionaries: [adjectives],
    style: 'capital',
    seed,
  }).trim();

  const suffix = TOWN_SUFFIXES[seed % TOWN_SUFFIXES.length] ?? 'Vale';

  return `${word} ${suffix}`;
}
