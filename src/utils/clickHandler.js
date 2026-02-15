// src/utils/clickHandler.js

import { nextTick } from "vue";
import { getRandomBoss, isBoss } from "@/utils/bossGenerator";
import { rollEncounter, generateEnemy } from "@/utils/encounterGenerator";
import friendlyEncounters from "@/assets/data/friendlyEncounters.json";
import loreEncounters from "@/assets/data/loreEncounters.json";

export async function handleClick({
  title,
  playerState,
  gameData,
  modalState,
  enemyState,
  utilityFunctions,
  isCloakActive,
  cloakClicksRemaining,
}) {
  const { journeyLength, enemyDifficultyLevel } = gameData;

  if (
    modalState.inEncounter.value ||
    modalState.showRestModal.value ||
    modalState.showShopModal.value ||
    modalState.showTipsModal.value
  ) {
    return;
  }

  utilityFunctions.log(`📍 ARTICLE: ${title}`);

  const finalTarget = gameData.chain[journeyLength.value - 1];

  gameData.current.value = title;
  playerState.clickCount.value++;
  playerState.path.value.push(title);

  if (title === gameData.chain[playerState.currentTargetIndex.value + 1]) {
    playerState.currentTargetIndex.value++;
    utilityFunctions.log(`🎯 You have reached ${title.replaceAll("_", " ")}.`);
  }

  let encounterPreventedByCloak = false;

  if (isCloakActive?.value && title !== finalTarget) {
    utilityFunctions.log(
      `✨ Cloak of Invisibility active: ${cloakClicksRemaining?.value ?? 0} clicks remaining.`
    );
    utilityFunctions.log(
      "👻 You slip past unseen thanks to the Cloak of Invisibility."
    );
    encounterPreventedByCloak = true;
  }

  if (
    title === finalTarget &&
    playerState.currentTargetIndex.value === journeyLength.value - 1 &&
    !gameData.bossSpawned.value &&
    !gameData.bossDefeated.value
  ) {
    modalState.showRestModal.value = false;
    modalState.showShopModal.value = false;
    modalState.bossOverlay.value = true;

    const boss = getRandomBoss(enemyDifficultyLevel.value);
    gameData.selectedBossType.value = boss.type;

    enemyState.encounter.value = {
      type: "combat",
      enemy: boss,
    };
    enemyState.enemyHP.value = boss.hp;
    enemyState.encounterMessage.value = `💀 A terrifying ${boss.name} rises to defend ${gameData.formattedTitle.value}. Time to roll some true damage.`;

    enemyState.nextEnemyAttack.value =
      Math.floor(Math.random() * (boss.maxDamage - boss.minDamage + 1)) +
      boss.minDamage;
    enemyState.enemyNextAction.value = "attack";

    gameData.bossSpawned.value = true;
    playerState.combatEncountersFought.value++;

    utilityFunctions.log(
      `💀 <strong>BOSS ENCOUNTER:</strong> ${boss.name}.<br><br>${
        boss.message || "Roll for damage."
      }`
    );

    utilityFunctions.logEnemyAction();

    return;
  }

  // Rest checkpoint every 12 clicks (doesn't block encounter pity timer)
  const isRestClick =
    playerState.clickCount.value > 0 &&
    playerState.clickCount.value % 12 === 0 &&
    !encounterPreventedByCloak;

  if (isRestClick) {
    modalState.showRestModal.value = true;
  }

  // Encounter rate: starts at 0.85, scales +0.01 per encounter (any type), caps at 0.95.
  // Pity timer: guaranteed encounter if 5+ clicks since the last one.
  const clicksSinceLast = playerState.clickCount.value - (playerState.lastEncounterClick?.value ?? 0);
  const baseRate = Math.min(0.85 + (playerState.totalEncounters?.value ?? 0) * 0.01, 0.95);
  const shouldEncounter = clicksSinceLast >= 5 || Math.random() < baseRate;

  const locationName = gameData.formattedTitle.value;

  const CONTEXT_INTROS = [
    (loc) => `While reading about <strong>${loc}</strong>, something catches your eye...`,
    (loc) => `The path near <strong>${loc}</strong> grows quiet. Too quiet.`,
    (loc) => `A rustling in the brush around <strong>${loc}</strong> stops you in your tracks.`,
    (loc) => `Somewhere between the lines of <strong>${loc}</strong>, you sense a presence.`,
    (loc) => `The shadows around <strong>${loc}</strong> shift unexpectedly.`,
    (loc) => `As you study <strong>${loc}</strong>, a voice calls out from nearby.`,
    (loc) => `Something stirs in the margins of <strong>${loc}</strong>.`,
    (loc) => `Your journey through <strong>${loc}</strong> takes an unexpected turn.`,
  ];

  if (
    title !== finalTarget &&
    !encounterPreventedByCloak &&
    !isRestClick &&
    shouldEncounter
  ) {
    let fullEncounter = null;

    // Try up to 3 rolls to avoid silent failures when NPC/lore pools are exhausted
    for (let attempt = 0; attempt < 3 && !fullEncounter; attempt++) {
      const roll = rollEncounter(enemyDifficultyLevel.value);

      if (roll.type === "npc") {
        const availableNPCs = friendlyEncounters.filter(
          (npc) => !gameData.seenNPCEncounters.value.includes(npc.id)
        );
        if (availableNPCs.length > 0) {
          const npc =
            availableNPCs[Math.floor(Math.random() * availableNPCs.length)];
          gameData.seenNPCEncounters.value.push(npc.id);
          fullEncounter = { type: "npc", npc };
          utilityFunctions.log(`${npc.greeting}`);
        }
      } else if (roll.type === "lore") {
        const availableLore = loreEncounters.filter(
          (lore) => !gameData.seenLoreEncounters.value.includes(lore.id)
        );
        if (availableLore.length > 0) {
          const lore =
            availableLore[Math.floor(Math.random() * availableLore.length)];
          gameData.seenLoreEncounters.value.push(lore.id);
          fullEncounter = { type: "lore", lore };
          utilityFunctions.log(`${lore.text}`);
        }
      } else if (roll.type === "combat") {
        const enemy = roll.enemy;
        if (enemy) {
          fullEncounter = roll;
          enemyState.enemyHP.value = enemy.currentHP;
          enemyState.currentEnemy.value = enemy;
          playerState.combatEncountersFought.value++;

          enemyState.nextEnemyAttack.value =
            Math.floor(Math.random() * (enemy.maxDamage - enemy.minDamage + 1)) +
            enemy.minDamage;
          enemyState.enemyNextAction.value = "attack";
        }
      }
    }

    if (fullEncounter) {
      // ~50% chance to log a contextual intro referencing the current article
      if (Math.random() < 0.5) {
        const intro = CONTEXT_INTROS[Math.floor(Math.random() * CONTEXT_INTROS.length)];
        utilityFunctions.log(intro(locationName));
      }
      if (playerState.lastEncounterClick) playerState.lastEncounterClick.value = playerState.clickCount.value;
      if (playerState.totalEncounters) playerState.totalEncounters.value++;
      enemyState.encounter.value = fullEncounter;

      if (fullEncounter.type === "combat") {
        utilityFunctions.log(
          `🗡️ You've been attacked by <strong>${
            gameData.formattedTitle.value
          }</strong> ${fullEncounter.enemy.name ?? ""}. What do you do?`
        );
        utilityFunctions.logEnemyAction();
      }

      return;
    }
  }

  if (encounterPreventedByCloak) {
    enemyState.encounter.value = null;
  }

  if (title === finalTarget && gameData.bossDefeated.value) {
    utilityFunctions.clearInterval(gameData.timerInterval);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}
