# Dev Log: Adventure Log & Encounter System Overhaul

**Date:** 2026-02-15
**Commit:** e27835f

---

## What Was Built

### 1. Adventure Log (Stats Tracking System)
Persistent progress tracking so players can see their performance over time.

**New files:**
- `src/utils/statsStorage.js` — localStorage helper (`linkslayer-run-history` key) with `loadRunHistory()`, `saveRun()`, `clearRunHistory()`
- `src/components/StatsModal.vue` — modal matching existing VictoryModal style (dark bg, pop-in animation, IBM Plex Sans)

**Lifetime stats computed from full run array:**
- Total Runs / Wins / Losses / Win Rate %
- Total Clicks / Avg Clicks per Run
- Total Play Time / Avg Run Time
- Total Combat Encounters
- Favorite Class (most used)
- Best Victory Time / Fewest Clicks (victory only)

**Run History Table** — scrollable, newest first, with color-coded results (green = win, red = loss). "Clear History" button with confirm() prompt.

**Integration:**
- `GameView.vue` saves run data on victory (`watch(isGameComplete)`) and defeat (playerHP watcher), with a `runSaved` guard to prevent duplicates
- `Header.vue` gets a "Stats" button in `.player-buttons-right` alongside Journal/Map

---

### 2. Encounter System Fixes & Improvements

**Critical bug fixed:** `isCloakActive` and `cloakClicksRemaining` were never passed from `GameView.vue` to the click handler. Since `handleClick` is `async`, accessing `.value` on `undefined` threw a silent error that aborted the entire function before encounter logic could run. Players were getting zero encounters.

**Encounter rate reworked:**
- Base rate: 85% (up from 75%)
- Scales +1% per encounter (all types: combat, NPC, lore), caps at 95%
- **Pity timer:** guaranteed encounter if 5+ clicks since the last one
- Retry loop (up to 3 attempts) when a roll lands on an exhausted NPC/lore pool

**Shop moved to checkpoints:** Shop modal no longer triggers every 10 clicks (which also caused an early `return` that skipped encounter checks). Now triggers when reaching a target article (journey milestone).

**Contextual encounter intros:** ~50% of encounters now log a flavor line referencing the current Wikipedia article (e.g. "The shadows around Roman Empire shift unexpectedly."). 8 rotating templates keep it fresh without being repetitive.

---

### 3. Content: 22 New Lore Encounters

Doubled lore encounters from 22 to 44. New entries include:
- Puzzles (broken sundial, stone chessboard, riddle-locked scrolls)
- Environmental discoveries (frozen pond, echo cave, fairy ring, mushroom circle)
- Multi-step dialogueNodes explorations (ancient fountain, underground market, collapsed library)
- Teleport encounters with routeTitle (misty harbor with boats to Wikipedia articles)
- Absurdist humor matching existing tone (barrel of bees, skeleton waiting for a bus, glowing purple potato)

---

## Architecture Decisions

- **localStorage over server storage** — game is client-only, no backend needed
- **`runSaved` guard ref** — prevents double-saving since both victory and defeat watchers could theoretically fire
- **Optional chaining on cloak refs** (`isCloakActive?.value`) — defensive coding so the handler never silently crashes again even if refs aren't passed
- **Encounter retry loop** — instead of silently failing when NPC/lore pools are empty, re-rolls up to 3 times, very likely landing on combat which always generates
- **50% contextual intro rate** — tested higher rates, felt too repetitive; 50% keeps it surprising

---

## Known Remaining Work

- NPC encounters not yet doubled (28 new entries planned, deferred)
- Cloak of Invisibility functionality may need end-to-end testing now that refs are properly passed
