<template>
  <Header
    :start="chain[currentTargetIndex]"
    :targets="chain[currentTargetIndex + 1]"
    :clicks="clickCount"
    :path="path"
    :encounter="encounter"
    :enemyHP="enemyHP"
    :nextEnemyAttack="nextEnemyAttack"
    :enemyNextAction="enemyNextAction"
    :message="encounterMessage"
    @action="handleCombatActionWrapper"
    @option-chosen="callHandleEncounterOption"
    @close="handleCloseEncounter"
    :playerName="playerName"
    :longRestsUsed="longRestsUsed"
    :isDarkened="bossOverlay"
    :shortRestsUsed="shortRestsUsed"
    @show-tips="showTipsModal = true"
    :game-chain="chain"
    @open-inventory-modal="openInventoryModal"
    :combatWinsSinceLastCapIncrease="combatWinsSinceLastCapIncrease"
    :formattedTitle="formattedTitle"
    @open-map-modal="isMapModalOpen = true"
  />

  <div class="main-content-wrapper">
    <div v-if="isLoadingGame" class="game-loader-overlay">
      <div class="loader-content">
        <div class="spinner"></div>
      </div>
    </div>
    <ClassSelect
      v-if="!playerClass"
      @select="handleClassSelection"
      :articleTitle="current"
      :start="chain[0]"
      :targets="chain[currentTargetIndex + 1]"
      :formattedStart="formattedStart"
      :formattedTitle="formattedTitle"
      :fullChain="chain"
      @show-tips="showTipsModal = true"
    />
    <div>
      <VictoryModal
        v-if="isGameComplete"
        :clicks="clickCount"
        :path="path"
        :timer="formattedTimer"
        :targets="chain"
        :shortcutsUsed="shortcutsUsedCount"
        :combatEncountersFought="combatEncountersFought"
        :specialsUsed="totalSpecialsUsed"
        :longRestsUsed="longRestsUsed"
        :shortRestsUsed="shortRestsUsed"
        @close="resetGame"
      />

      <DefeatModal
        v-if="defeated"
        :clicks="clickCount"
        :path="path"
        :timer="formattedTimer"
        :targets="chain"
        :shortcutsUsed="shortcutsUsedCount"
        :combatEncountersFought="combatEncountersFought"
        :specialsUsed="totalSpecialsUsed"
        :longRestsUsed="longRestsUsed"
        :shortRestsUsed="shortRestsUsed"
        @close="resetGame"
      />

      <ArticleViewer
        :articleTitle="current"
        :start="chain[0]"
        :targets="chain[currentTargetIndex + 1]"
        :inEncounter="inEncounter"
        @link-clicked="callHandleClick"
        :path="path"
        :fullChain="chain"
        :currentTargetIndex="currentTargetIndex"
        :isBlurred="blurClicksLeft > 0"
      />

      <RestModal
        :showRestModal="showRestModal"
        :shortRestsUsed="shortRestsUsed"
        :longRestsUsed="longRestsUsed"
        :restModalCount="restModalCount"
        @rest="callHandleRest"
        @assemble-upgrade="handleAssembleUpgradeWrapper"
      />

      <ShopModal
        v-show="showShopModal"
        @buy="(item) => gameStore.purchaseItem(item, { playerName: playerName })"
        @close="showShopModal = false"
        :shopItems="shopItems"
        @open-backpack="openInventoryModal"
      />
      />

      <InventoryModal
        v-if="isInventoryModalOpen"
        @close="closeInventoryModal"
        @use-item="handleUseInventoryItem"
        :is-boss-encounter="isBossEncounter"
        :enlightenment-fish-hp="enlightenmentFishAccumulatedHP"
        :amulet-of-shared-suffering-damage="AMULET_ENEMY_DAMAGE"
      />

      <MapModal
        v-if="isMapModalOpen"
        :fullChain="chain"
        :currentTargetIndex="currentTargetIndex"
        :currentArticle="current"
        :path="path"
        @close="isMapModalOpen = false"
      />
    </div>
  </div>

  <div class="dim-overlay" :class="{ 'active-overlay': bossOverlay }"></div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useGameStore } from "@/stores/game";
import { storeToRefs } from "pinia";
import { getRandomChain } from "@/utils/randomPair";
import ArticleViewer from "@/components/ArticleViewer.vue";
import Header from "@/components/Header.vue";
import VictoryModal from "@/components/VictoryModal.vue";
import ClassSelect from "@/components/ClassSelect.vue";
import { classes } from "@/utils/classes";
import DefeatModal from "@/components/DefeatModal.vue";
import { getRandomBoss, isBoss } from "@/utils/bossGenerator";
import RestModal from "@/components/RestModal.vue";
import { handleCombatAction } from "@/utils/combat";
import ShopModal from "@/components/ShopModal.vue";
import { handleRest } from "@/utils/restHandler";
import { handleClick as externalHandleClick } from "@/utils/clickHandler.js";
import { handleEncounterOption as externalHandleEncounterOption } from "@/utils/encounterHandler";
import { handleLootDrop as externalHandleLootDrop } from "@/utils/lootHandler";
import { handleEnemyTurn as externalHandleEnemyTurn } from "@/utils/enemyTurnHandler";
import { handleMiniBossLootDrop } from "@/utils/miniBossLootHandler";
import InventoryModal from "@/components/InventoryModal.vue";
import MapModal from "@/components/MapModal.vue";
import { shopItems } from "@/utils/shopItems";

const gameStore = useGameStore();
const { 
  playerGold, 
  inventory,
  playerHP,
  specialUsesLeft,
  weaponBonus,
  shieldBonus,
  blurClicksLeft,
  poisonedClicksLeft,
  isCloakActive,
  cloakClicksRemaining,
  healthRegenActive,
  gameLog,
  timer,
  formattedTimer,
  effectiveMaxHP,
  playerClass,
  hpCapBonus,
  longRestsUsed,
  shortRestsUsed,
} = storeToRefs(gameStore);

const journeyLength = ref(3);
const chain = getRandomChain(journeyLength.value);
const current = ref(chain[0]);
const formattedStart = computed(() => chain[0]?.replaceAll("_", " ") ?? "");
const formattedTitle = computed(
  () => current.value?.replaceAll("_", " ") ?? ""
);
const isPlayerPoisoned = computed(() => poisonedClicksLeft.value > 0);
const isInCombat = computed(
  () => encounter.value && encounter.value.type === "combat"
);
const isBossEncounter = computed(
  () => isInCombat.value && isBoss(encounter.value.enemy)
);

const isBlurred = computed(() => blurClicksLeft.value > 0);

const defeated = ref(false);
const currentTargetIndex = ref(0);
const clickCount = ref(0);
const shortcutsUsedCount = ref(0);
const combatEncountersFought = ref(0);
const combatWinsSinceLastCapIncrease = ref(0);
const totalSpecialsUsed = ref(0);
const path = ref([current.value]);
const encounter = ref(null);
const enemyHP = ref(25);
const nextEnemyAttack = ref(null);
const enemyNextAction = ref("attack");
const encounterMessage = ref("");
const playerName = ref("");
const DEFAULT_ENEMY_HP = 25;
const enemyStatusEffects = ref([]);
const enemyIsStunned = ref(false);
const seenLoreEncounters = ref([]);
const seenNPCEncounters = ref([]);
const currentEnemy = ref(null);
const selectedBossType = ref("");
const bossSpawned = ref(false);
const bossDefeated = ref(false);
const showRestModal = ref(false);
const hasReachedFinalArticle = ref(false);
const bossOverlay = ref(false);
const showShopModal = ref(false);
const showTipsModal = ref(false);

const enlightenmentFishAccumulatedHP = ref(0);
const AMULET_ENEMY_DAMAGE = 50;
const AMULET_PLAYER_DAMAGE = 25;

const isLoadingGame = ref(false);
const enemyDifficultyLevel = ref(0);
const isMapModalOpen = ref(false);
const restModalCount = ref(0);

const isInventoryModalOpen = ref(false);

const inEncounter = computed(() => {
  const e = encounter.value;
  if (!e || typeof e !== "object") return false;
  if (e.type === "combat") {
    return e.enemy && typeof e.enemy === "object";
  }
  if (e.type === "npc") {
    return (
      e.npc &&
      typeof e.npc.name === "string" &&
      typeof e.npc.greeting === "string"
    );
  }
  if (e.type === "lore") {
    return e.lore && typeof e.lore.text === "string";
  }
  return false;
});

watch(showRestModal, (newValue) => {
  if (newValue) {
    restModalCount.value++;
  }
});

watch(playerHP, (newVal) => {
  if (playerClass.value && newVal <= 0 && !defeated.value) {
    gameStore.log(
      `💀 <span class="player-name">${playerName.value}</span> was defeated.`
    );
    defeated.value = true;
    clearInterval(timerInterval);
    encounter.value = null;
  }
});

watch(clickCount, (newClicks) => {
  if (newClicks > 0 && newClicks % 12 === 0) {
    showRestModal.value = true;
  }
  if (newClicks > 0 && newClicks % 10 === 0 && !showRestModal.value) {
    showShopModal.value = true;
  }

  // This logic should also be moved to the store as a tick action
  // gameStore.tick(); 
});

let timerInterval;

const isGameComplete = computed(() => {
  return current.value === chain[journeyLength.value - 1] && bossDefeated.value;
});

async function callHandleClick(title) {
  const finalTarget = chain[journeyLength.value - 1];

  await externalHandleClick({
    title,
    playerState: {
      clickCount,
      path,
      currentTargetIndex,
      combatEncountersFought,
      combatWinsSinceLastCapIncrease,
    },
    gameData: {
      enemyDifficultyLevel,
      chain,
      current,
      bossSpawned,
      bossDefeated,
      selectedBossType,
      formattedTitle,
      seenLoreEncounters,
      seenNPCEncounters,
      timerInterval,
      journeyLength,
      finalTarget,
    },
    modalState: {
      inEncounter,
      showRestModal,
      showShopModal,
      showTipsModal,
      bossOverlay,
    },
    enemyState: {
      encounter,
      enemyHP,
      encounterMessage,
      nextEnemyAttack,
      enemyNextAction,
      currentEnemy,
    },
    utilityFunctions: {
      log: gameStore.log,
      logEnemyAction,
      clearInterval: (intervalId) => clearInterval(intervalId),
      isBoss,
    },
  });
}

function callHandleRest(choice) {
  const restType = handleRest({
    player: {
      playerHP,
      playerClass,
      specialUsesLeft,
      playerName,
      effectiveMaxHP: effectiveMaxHP.value,
    },
    state: {
      restChoice: choice,
      shortRestsUsed,
      longRestsUsed,
    },
    utils: {
      log: gameStore.log,
      showRestModal,
    },
  });

  if (restType === "long") {
    enemyDifficultyLevel.value = enemyDifficultyLevel.value + 1;
    gameStore.log(
      `⚔️ The world gets ${enemyDifficultyLevel.value} times more dangerous.`
    );
  }
}
const handleLoot = (defeatedEnemyData) => {
  const lootHandlerArgs = {
    playerState: {
      playerHP,
      playerName,
      playerClass,
      specialUsesLeft,
      weaponBonus,
      shieldBonus,
      playerGold,
      effectiveMaxHP: effectiveMaxHP.value,
      inventory,
    },
    utilityFunctions: {
      log: gameStore.log,
    },
    defeatedEnemyData: defeatedEnemyData,
  };

  if (isBoss(defeatedEnemyData)) {
    gameStore.log(
      `✨ The ${defeatedEnemyData.name} dissipates, leaving no worldly possessions behind.`
    );
    markBossDefeated();
  } else if (defeatedEnemyData.isMiniBoss) {
    handleMiniBossLootDrop(lootHandlerArgs);
  } else {
    externalHandleLootDrop(lootHandlerArgs);
  }
};

function handleCombatActionWrapper(playerAction) {
  const handleLoot = (defeatedEnemyData) => {
    const lootHandlerArgs = {
      playerState: {
        playerHP,
        playerName,
        playerClass,
        specialUsesLeft,
        weaponBonus,
        shieldBonus,
        playerGold,
        effectiveMaxHP: effectiveMaxHP.value,
        inventory,
      },
      utilityFunctions: {
        log: gameStore.log,
      },
      defeatedEnemyData: defeatedEnemyData,
    };

    if (isBoss(defeatedEnemyData)) {
      gameStore.log(
        `✨ The ${defeatedEnemyData.name} dissipates, leaving no worldly possessions behind.`
      );
      markBossDefeated();
    } else if (defeatedEnemyData.isMiniBoss) {
      handleMiniBossLootDrop(lootHandlerArgs);
    } else {
      externalHandleLootDrop(lootHandlerArgs);
    }
  };

  handleCombatAction({
    player: {
      playerHP,
      playerClass,
      specialUsesLeft,
      weaponBonus,
      shieldBonus,
      playerName,
      action: playerAction,
      effectiveMaxHP,
      totalSpecialsUsed,
    },
    enemy: {
      enemyHP,
      encounter,
      nextEnemyAttack,
      enemyNextAction,
      enemyStatusEffects,
      enemyIsStunned,
    },
    state: {
      log: gameStore.log,
      formattedTitle: formattedTitle.value,
      DEFAULT_ENEMY_HP,
      isBoss,
      combatWinsSinceLastCapIncrease,
      hpCapBonus,
    },
    utils: {
      clearTimer: () => clearInterval(timerInterval),
      setDefeated: () => (defeated.value = true),
      handleLootDrop: handleLoot,
      markBossDefeated,
      gotoEnemyTurn,
      bossOverlay: bossOverlay,
    },
  });
}

function gotoEnemyTurn() {
  externalHandleEnemyTurn({
    enemyState: {
      enemyStatusEffects,
      enemyHP,
      encounter,
      enemyIsStunned,
      enemyNextAction,
      nextEnemyAttack,
    },
    playerState: {
      playerName,
      playerHP,
      effectiveMaxHP: effectiveMaxHP.value,
    },
    gameData: {},
    utilityFunctions: {
      log: gameStore.log,
    },
    combatFunctions: {
      formattedTitle: formattedTitle,
      decideEnemyAction: decideEnemyAction,
      logEnemyAction: logEnemyAction,
    },
  });
}

function decideEnemyAction() {
  if (
    !isBoss(encounter.value?.enemy) &&
    enemyHP.value <= 5 &&
    Math.random() < 0.02
  ) {
    return "flee";
  }
  if (Math.random() < 0.2) return "defend";
  return "attack";
}

function logEnemyAction() {
  let message = "";
  switch (enemyNextAction.value) {
    case "attack":
      message = `🗡️ Enemy is now attacking for ${nextEnemyAttack.value} damage.`;
      break;
    case "defend":
      message = "🛡️ Enemy is defending your next attack.";
      break;
    case "flee":
      message = "🏃 Enemy is about to flee.";
      break;
    case "trip":
      message = "🤾 Enemy tripped. You get a free attack.";
      break;
    default:
      message = "";
  }
  if (message) gameStore.log(message);
}

function handleCloseEncounter() {
  encounter.value = null;

  if (bossDefeated.value) {
    current.value = chain[journeyLength.value - 1];
  }

  const lastTitle = path.value[path.value.length - 1];
  if (lastTitle === chain[currentTargetIndex.value + 1]) {
    currentTargetIndex.value++;
  }

  if (lastTitle === chain[journeyLength.value - 1]) {
    clearInterval(timerInterval);
  }
}

function handleClassSelection({ classKey, name, journeyLength: selectedLen }) {
  gameStore.playerClass = classes[classKey];
  playerHP.value = gameStore.playerClass.maxHP;
  playerName.value = name;
  journeyLength.value = selectedLen;

  const newChain = getRandomChain(journeyLength.value);
  chain.splice(0, chain.length, ...newChain);
  current.value = chain[0];
  path.value = [current.value];

  if (gameStore.playerClass.startingWeaponBonus) {
    weaponBonus.value += gameStore.playerClass.startingWeaponBonus;
    gameStore.log(
      `🗡️ <span class="player-name">${playerName.value}</span> gains +${gameStore.playerClass.startingWeaponBonus} starting Weapon Damage.`
    );
  }
  if (gameStore.playerClass.startingSpecialUses) {
    specialUsesLeft.value += gameStore.playerClass.startingSpecialUses;
    gameStore.log(
      `🎁 <span class="player-name">${playerName.value}</span> starts with +${gameStore.playerClass.startingSpecialUses} Class Ability charges.`
    );
  }
  if (gameStore.playerClass.startingShieldBonus) {
    shieldBonus.value += gameStore.playerClass.startingShieldBonus;
    gameStore.log(
      `🗡️ <span class="player-name">${playerName.value}</span> gains +${gameStore.playerClass.startingShieldBonus} starting Defense Bonus.`
    );
  }
  if (gameStore.playerClass.startingHealthPotionBonus) {
    inventory.value.healthPotions = gameStore.playerClass.startingHealthPotionBonus;
    gameStore.log(
      `🗡️ <span class="player-name">${playerName.value}</span> gains +${gameStore.playerClass.startingHealthPotionBonus} starting Health Potions.`
    );
  }
  if (gameStore.playerClass.startingInvisibilityCloaks) {
    inventory.value.invisibilityCloaks =
      gameStore.playerClass.startingInvisibilityCloaks;
    gameStore.log(
      `🗡️ <span class="player-name">${playerName.value}</span> gains +${gameStore.playerClass.startingInvisibilityCloaks} starting Invisibility Cloaks.`
    );
  }
  if (gameStore.playerClass.startingPlayerGold) {
    playerGold.value = gameStore.playerClass.startingPlayerGold;
    gameStore.log(
      `🗡️ <span class="player-name">${playerName.value}</span> gains +${gameStore.playerClass.startingPlayerGold} starting Gold.`
    );
  }
  gameStore.log(`Player name: ${playerName.value}`);
  gameStore.log(`Class selected: ${gameStore.playerClass.name}`);
  gameStore.log(`Journey length: ${journeyLength.value} articles.`);
}

function handleAssembleUpgrade({
  inventory,
  playerName,
  weaponBonus,
  shieldBonus,
  upgradeType,
  utilityFunctions,
}) {
  const { log } = utilityFunctions;

  if (upgradeType === "weapon") {
    if (inventory.weaponPieces >= 2) {
      inventory.weaponPieces -= 2;
      weaponBonus.value += 1;
      log(
        `⚔️ <span class="player-name">${playerName.value}</span> crafted a Weapon Upgrade (+1 Weapon Bonus)`
      );
      log(
        `Weapon Pieces: ${inventory.weaponPieces}, Weapon Bonus: ${weaponBonus.value}`
      );
    } else {
      log(`⛔ Not enough Weapon Pieces to craft an upgrade. You need 2.`);
    }
  } else if (upgradeType === "defense") {
    if (inventory.defensePieces >= 2) {
      inventory.defensePieces -= 2;
      shieldBonus.value += 1;
      log(
        `🛡️ <span class="player-name">${playerName.value}</span> crafted a Defense Upgrade. (+1 Defense Bonus)`
      );
      log(
        `Defense Pieces: ${inventory.defensePieces}, Defense Bonus: ${shieldBonus.value}`
      );
    } else {
      log(`⛔ Not enough Defense Pieces to craft an upgrade. You need 2.`);
    }
  } else {
    log(`Unknown upgrade type: ${upgradeType}`);
  }
}

async function callHandleEncounterOption(option) {
  await externalHandleEncounterOption({
    option,
    playerState: {
      playerHP,
      playerName,
      playerClass,
      combatEncountersFought,
      specialUsesLeft,
      weaponBonus,
      shieldBonus,
      blurClicksLeft,
      poisonedClicksLeft,
      playerGold,
      currentTargetIndex,
      path,
      clickCount,
      shortcutsUsedCount,
      inventory,
      effectiveMaxHP: effectiveMaxHP.value,
    },
    gameData: {
      chain,
      current,
      formattedTitle: formattedTitle.value,
    },
    enemyState: {
      encounter,
      enemyHP,
      encounterMessage,
      nextEnemyAttack,
      enemyNextAction,
    },
    modalState: {
      bossOverlay,
    },
    utilityFunctions: {
      log: gameStore.log,
    },
  });
}

function handleUseInventoryItem(itemType) {
  gameStore.useItem(itemType, {
    encounter: encounter.value,
    isBoss,
    closeInventoryModal,
  });
}

function markBossDefeated() {
  bossDefeated.value = true;
  current.value = chain[journeyLength.value - 1];
  clearInterval(timerInterval);
  bossOverlay.value = false;
}

function openInventoryModal() {
  isInventoryModalOpen.value = true;
}

function closeInventoryModal() {
  isInventoryModalOpen.value = false;
}

function resetGame() {
  isLoadingGame.value = true;
  location.reload();
}

onMounted(() => {
  timerInterval = setInterval(() => {
    timer.value++;
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timerInterval);
});
</script>

<style scoped>
.timer {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.player-name {
  color: rgb(160, 178, 226);
  text-transform: uppercase;
}

.dim-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0);
  pointer-events: none;
  transition: background-color 1.5s ease-in-out;
  z-index: 99;
}

.dim-overlay.active-overlay {
  background-color: rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.game-loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  color: white;
  font-size: 1.5rem;
  flex-direction: column;
}

.loader-content {
  text-align: center;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #fff;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: 600px) {
  .timer {
    font-size: 13px;
    margin-top: 0.1rem;
  }
}
</style>
