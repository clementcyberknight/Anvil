This is an Expo/React Native mobile application (**Anvil** — a multiplayer Yeti town-building, resource-management, and player-driven economy game on a single evolving map with an AI Mayor). Prioritize mobile-first patterns, 60fps performance, low-network resilience, strict TypeScript, and cross-platform compatibility.

## Game Domain & Architecture Context

- **Single-Map Town Gameplay:** Every player plays directly as the main Yeti character in their own town on **one map** (Village, Forest, Frozen Lake, Mountains, Caves) across 5 core loops: **Explore, Gather, Produce, Trade, and Expand**.
- **Cloud-Only AI Mayor & Economy (Remote Bun.js Server):** All AI generation runs on the remote **Bun.js** server (never on-device). The **AI Mayor** controls business taxation into the Town Treasury, dynamic resource/economy events, and whether to cushion/subsidize **2x Winter price spikes** using the Town Treasury or let citizens absorb the cost.
- **Brand Palette (Yeti Theme):** Yeti Blue `#40A7FC`, Periwinkle Ice `#C0CEF5` (splash/icon/primary soft CTA), Obsidian Black `#000000` (`#0A0A0A` UI), Pure White `#FFFFFF`, Frost Gray `#E2E2E4`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Runtime & Commands (Bun Only)

Always use **Bun** (`bun` / `bunx`) as the runtime and command runner. Do not use `npm`, `yarn`, `pnpm`, or `node`.

```bash
bunx expo install <package>  # ALWAYS use instead of bun add for Expo/RN packages — resolves SDK-compatible versions
bunx expo start              # start the dev server
bunx expo run:android        # build and install native Android app on local emulator
bunx oxlint                  # primary linter (Oxlint + anti-slop rules)
bunx expo lint               # Expo lint checks
bunx tsc --noEmit            # strict typecheck
bunx expo-doctor             # diagnose dependency and config issues
bunx expo install --fix      # fix incompatible package versions
```

Run `bunx oxlint`, `bunx tsc --noEmit`, and `bunx expo lint` before declaring any task done.

## Core Storage & Animation Stack

Always use these exact libraries for their designated roles — never substitute `AsyncStorage`, `localStorage`, or React Native's JS-thread `Animated`:

| Responsibility                   | Required Library          | Notes                                                                                      |
| :------------------------------- | :------------------------ | :----------------------------------------------------------------------------------------- |
| **Image & binary asset storage** | `expo-file-system`        | Local WebP sprites, building tiers, and seasonal map assets.                               |
| **Text / hot key-value storage** | `react-native-mmkv`       | Synchronous JSI/Nitro reads/writes for live inventory counters, season/tax flags, UI cache.|
| **Session storage**              | `react-native-mmkv`       | Auth/session metadata, onboarding state, and active gameplay session state.                |
| **Story, town & map storage**    | `expo-sqlite`             | Relational storage for single-map nodes, buildings, NPC citizen requests, and market cache.|
| **Animations & transitions**     | `react-native-reanimated` | UI-thread worklet animations and transitions (paired with `react-native-gesture-handler`). |

## Strict TypeScript & Anti-Slop Performance Rules (Oxlint)

We use **Oxlint** with **anti-slop** rules (`oxlint.config.ts`). **Never cheat TypeScript.**

- **No `any` or `unknown` escape hatches:** Never use `any`, `unknown` parameters/returns/type aliases, `object` parameters, or unsafe dictionaries (`Record<string, unknown>`, `Record<string, any>`, `{ [key: string]: object }`). Parse and validate untrusted data at I/O boundaries instead of widening or using ad hoc runtime `typeof` checks.
- **No unsafe assertions or suppressions:** Never use `@ts-ignore`, `@ts-expect-error`, chained assertions (`as object as T`), or widen-then-assert. Any unavoidable non-const `as` assertion MUST have an immediately preceding `// SAFETY: <concrete invariant>` comment.
- **No known-value widening:** Preserve literal/key inference (use `satisfies` instead of widening to `Record<string, T>`). Avoid conditional empty object spreads (`...(cond ? { a } : {})`), `Reflect.apply`, `Reflect.get`, and `shape` in locally owned symbol names.
- **Performance (hot paths & collections):**
  - No adjacent eager array passes (`arr.filter(...).map(...)` or `arr.map(...).filter(...)`) — use a single pass (`for` loop, `flatMap`, or single reducer mutating a fresh local array).
  - No accumulating spreads or accumulator copies inside `.reduce()` (`{ ...acc }`, `[...acc]`, `acc.concat()`, `acc.slice()`, `Object.assign({}, acc, ...)`).
  - Keep animations and map camera transforms on the UI thread (`react-native-reanimated` worklets) and hot state reads synchronous (`react-native-mmkv`).
- **Testing:** No module mocking (`vi.mock` / `jest.mock`); inject real dependency seams.
- **Readability:** Maintain clean spacing around top-level declarations, multiline bindings, and control-flow boundaries (`require-readable-spacing`).

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building & Native Configuration

- Configure native behavior via `app.json` and config plugins (such as `./plugins/with-short-cmake-paths` which prevents Windows 260-character CMake path errors).
- Expo Go only includes its bundled native modules. Because this project uses `react-native-mmkv` (Nitro) and native splash/icon configuration, run it on your local Android Studio emulator with `bunx expo run:android` (or `bunx eas-cli build --profile development` for cloud builds).
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
