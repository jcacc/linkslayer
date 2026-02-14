import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { shopItems } from "@/utils/shopItems";

export const useGameStore = defineStore('game', () => {
  // === STATE ===
  const playerGold = ref(0);
  const inventory = ref({
    compass: 0,
    healthPotions: 0,
    turkeyLegs: 0,
    invisibilityCloaks: 0,
    stickItem: 0,
    herbalPoultices: 0,
    barkTea: 0,
    frenchOnionSoups: 0,
    antidotes: 0,
    smokeBombs: 0,
    adventurersRations: 0,
    enlightenmentFish: 0,
    sharedSufferingAmulets: 0,
    minorHealthPotions: 0,
    weaponPieces: 0,
    defensePieces: 0,
  });
  const playerHP = ref(0);
  const specialUsesLeft = ref(5);
  const weaponBonus = ref(0);
  const shieldBonus = ref(0);
  const blurClicksLeft = ref(0);
  const poisonedClicksLeft = ref(0);
  const poisonDamagePerClick = ref(0);
  const isCloakActive = ref(false);
  const cloakClicksRemaining = ref(0);
  const healthRegenActive = ref(false);
  const healthRegenAmount = ref(0);
  const healthRegenClicksRemaining = ref(0);
  const healthRegenMaxHeal = ref(0);
  const healthRegenHealedCount = ref(0);
  const hpCapBonus = ref(0);
  const playerClass = ref(null);
  const longRestsUsed = ref(0);
  const shortRestsUsed = ref(0);

  const gameLog = ref([]);
  const timer = ref(0);
  let logId = 0;

  // Item constants
  const HEALTH_POTION_HEAL_AMOUNT = 25;
  const TURKEY_LEG_HEAL_AMOUNT = 6;
  const BARK_TEA_HEAL_AMOUNT = 10;
  const FRENCH_ONION_SOUP_HEAL_AMOUNT = 15;
  const FRENCH_ONION_SOUP_SPECIAL_AMOUNT = 1;
  const ADVENTURERS_RATIONS_HEAL_AMOUNT = 7;
  const MINOR_HEALTH_POTION_HEAL_AMOUNT = 10;
  const CLOAK_DURATION = 10;

  // === GETTERS ===
  const formattedTimer = computed(() => {
    const minutes = Math.floor(timer.value / 60);
    const seconds = timer.value % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  });

  const effectiveMaxHP = computed(() => {
    return playerClass.value ? playerClass.value.maxHP + hpCapBonus.value : 0;
  });

  // === ACTIONS ===
  function log(message) {
    logId++;
    gameLog.value.push({
      id: logId,
      text: `[${formattedTimer.value}] ${message}`,
    });
  }

  function purchaseItem(item, { playerName }) {
    let purchased = false;
    if (item.isSpecialLoot) {
      purchased = true;
      log(
        `✨ <span class="player-name">${playerName}</span> obtained ${item.name}.`
      );
    } else if (playerGold.value >= item.cost) {
      playerGold.value -= item.cost;
      purchased = true;
      log(
        `💸 <span class="player-name">${playerName}</span> purchased ${item.name} for ${item.cost} Gold.`
      );
    } else {
      log(
        `❌ Not enough Gold for ${item.name}. (Cost: ${item.cost}, You have: ${playerGold.value})`
      );
      return;
    }

    if (purchased) {
      switch (item.effect) {
        case "health":
          playerHP.value = Math.min(
            playerHP.value + item.amount,
            effectiveMaxHP.value
          );
          log(
            `➕ ${playerName} gained ${item.amount} HP.`
          );
          break;
        case "weapon":
          weaponBonus.value += item.amount;
          log(
            `🗡️ ${playerName} gained +${item.amount} Weapon Bonus.`
          );
          break;
        case "shield":
          shieldBonus.value += item.amount;
          log(
            `🛡️ ${playerName} gained +${item.amount} Defense Bonus.`
          );
          break;
        case "special":
          specialUsesLeft.value += item.amount;
          log(
            `✨ ${playerName} gained +${item.amount} Ability charges.`
          );
          break;
        case "longRest":
          longRestsUsed.value = Math.max(
            0,
            longRestsUsed.value - item.amount
          );
          log(
            `🛌 ${playerName} refreshed ${item.amount} Long Rest(s).`
          );
          break;
        case "shortRest":
          shortRestsUsed.value = Math.max(
            0,
            shortRestsUsed.value - item.amount
          );
          log(
            `🧘 ${playerName} refreshed ${item.amount} Short Rest(s).`
          );
          break;
        case "blurCure":
          blurClicksLeft.value = 0;
          log(`🧼 ${playerName} sobered up.`);
          break;

        case "inventoryItem":
          if (item.details === "compass") {
            inventory.value.compass++;
            log(
              `🧭 ${playerName} acquired an Arcane Compass.`
            );
          } else if (item.details === "healthPotion") {
            inventory.value.healthPotions++;
            log(
              `➕ ${playerName} acquired a Health Potion.`
            );
          } else if (item.details === "turkeyLeg") {
            inventory.value.turkeyLegs++;
            log(
              `🍗 ${playerName} acquired a Turkey Leg.`
            );
          } else if (item.details === "barkTea") {
            inventory.value.barkTeas =
              Number(inventory.value.barkTeas || 0) + 1;
            log(
              `☕ ${playerName} acquired Bark Tea.`
            );
          } else if (item.details === "invisibilityCloak") {
            inventory.value.invisibilityCloaks++;
            log(
              `👻 ${playerName} acquired a Cloak of Invisibility.`
            );
          } else if (item.details === "stickItem") {
            inventory.value.stickItem++;
            log(
              `😎 ${playerName} acquired a Cool Stick.`
            );
          } else if (item.details === "herbalPoultice") {
            inventory.value.herbalPoultices++;
            log(
              `🌿 ${playerName} acquired a Herbal Poultice.`
            );
          } else if (item.details === "frenchOnionSoup") {
            inventory.value.frenchOnionSoups =
              Number(inventory.value.frenchOnionSoups || 0) + 1;
            log(
              `🥣 ${playerName} acquired French Onion Soup.`
            );
          } else if (item.details === "smokeBomb") {
            inventory.value.smokeBombs =
              Number(inventory.value.smokeBombs || 0) + 1;
            log(
              `💨 ${playerName} acquired a Smoke Bomb.`
            );
          } else if (item.details === "antidote") {
            inventory.value.antidotes =
              Number(inventory.value.antidotes || 0) + 1;
            log(
              `🧪 ${playerName} acquired an Antidote.`
            );
          } else if (item.details === "adventurersRations") {
            inventory.value.adventurersRations =
              Number(inventory.value.adventurersRations || 0) + 1;
            log(
              `🍞 ${playerName} acquired Adventurer's Rations.`
            );
          } else if (item.details === "enlightenmentFish") {
            inventory.value.enlightenmentFish = 1;
            log(
              `🐟 ${playerName} acquired The Fish of Eternal Enlightenment.`
            );
          } else if (item.details === "sharedSufferingAmulet") {
            inventory.value.sharedSufferingAmulets =
              Number(inventory.value.sharedSufferingAmulets || 0) + 1;
            log(
              `💔 ${playerName} acquired an Amulet of Shared Suffering.`
            );
          } else if (item.details === "minorHealthPotion") {
            inventory.value.minorHealthPotions =
              Number(inventory.value.minorHealthPotions || 0) + 1;
            log(
              `➕ ${playerName} acquired a Potion of Minor Health.`
            );
          }
          break;

        default:
          break;
      }
    }
  }

  function useItem(itemType, externalDependencies = {}) {
    const { 
      encounter, 
      isBoss,
      closeInventoryModal,
    } = externalDependencies;

    switch (itemType) {
      case 'healthPotion':
        if (inventory.value.healthPotions > 0) {
          inventory.value.healthPotions--;
          playerHP.value = Math.min(
            playerHP.value + HEALTH_POTION_HEAL_AMOUNT,
            effectiveMaxHP.value
          );
          log(
            `You consumed a Health Potion and recovered ${HEALTH_POTION_HEAL_AMOUNT} HP. Your HP is now ${playerHP.value}.`
          );
        } else {
          log("You don't have any Health Potions to use.");
        }
        break;
      
      case 'minorHealthPotion':
        if (inventory.value.minorHealthPotions > 0) {
          inventory.value.minorHealthPotions--;
          playerHP.value = Math.min(
            playerHP.value + MINOR_HEALTH_POTION_HEAL_AMOUNT,
            effectiveMaxHP.value
          );
          log(
            `You consumed a Potion of Minor Health and recovered ${MINOR_HEALTH_POTION_HEAL_AMOUNT} HP. Your HP is now ${playerHP.value}.`
          );
        } else {
          log("You don't have any Potions of Minor Health to use.");
        }
        break;

      case 'turkeyLeg':
        if (inventory.value.turkeyLegs > 0) {
            inventory.value.turkeyLegs--;
            playerHP.value = Math.min(
            playerHP.value + TURKEY_LEG_HEAL_AMOUNT,
            effectiveMaxHP.value
            );
            log(
            `🍖 You consumed a Turkey Leg and recovered ${TURKEY_LEG_HEAL_AMOUNT} HP. Your HP is now ${playerHP.value}.`
            );
        } else {
            log("You don't have any Turkey Legs to use.");
        }
        break;

      case 'barkTea':
        if (inventory.value.barkTeas > 0) {
            inventory.value.barkTeas--;
            playerHP.value = Math.min(
            playerHP.value + BARK_TEA_HEAL_AMOUNT,
            effectiveMaxHP.value
            );
            log(
            `☕ You drank Bark Team and recovered ${BARK_TEA_HEAL_AMOUNT} HP. Your HP is now ${playerHP.value}.`
            );
        } else {
            log("You don't have any Bark Tea to use.");
        }
        break;
      
      case 'frenchOnionSoup':
        if (inventory.value.frenchOnionSoups > 0) {
            inventory.value.frenchOnionSoups = Number(inventory.value.frenchOnionSoups || 0) - 1;

            const healedAmount = FRENCH_ONION_SOUP_HEAL_AMOUNT;
            playerHP.value = Math.min(
                playerHP.value + healedAmount,
                effectiveMaxHP.value
            );

            const specialRestored = FRENCH_ONION_SOUP_SPECIAL_AMOUNT;
            specialUsesLeft.value += specialRestored;

            log(
            `🥣 You consumed French Onion Soup and recovered ${healedAmount} HP and ${specialRestored} special use. Your HP is now ${playerHP.value}.`
            );
        } else {
            log("You don't have any French Onion Soup to use.");
        }
        break;
      
      case 'antidote':
        if (inventory.value.antidotes > 0) {
            if (poisonedClicksLeft.value > 0) {
                inventory.value.antidotes = Number(inventory.value.antidotes || 0) - 1;
                poisonedClicksLeft.value = 0;
                poisonDamagePerClick.value = 0;
                log(
                    `✅ You consumed an Antidote. The poison has been neutralized.`
                );
                closeInventoryModal?.();
            } else {
                log(
                    `🚫 You are not poisoned. You don't need to use an Antidote.`
                );
            }
        } else {
            log("You don't have any Antidotes to use.");
        }
        break;

      case 'invisibilityCloak':
        if (isCloakActive.value) {
            log(`👻 The Cloak of Invisibility is already active.`);
            return;
        }
        if (inventory.value.invisibilityCloaks > 0) {
            inventory.value.invisibilityCloaks--;
            isCloakActive.value = true;
            cloakClicksRemaining.value = CLOAK_DURATION;
            log(
                `👻 You don the Cloak of Invisibility. You will avoid non-boss encounters for ${CLOAK_DURATION} clicks.`
            );
        } else {
            log(`👻 You don't have a Cloak of Invisibility.`);
        }
        break;

      case 'herbalPoultice':
        if (healthRegenActive.value) {
            log(`🌿 A health regeneration effect is already active.`);
            return;
        }
        if (inventory.value.herbalPoultices > 0) {
            inventory.value.herbalPoultices--;

            const poulticeDetails = shopItems.find(
            (i) => i.details === "herbalPoultice"
            );
            if (poulticeDetails) {
                healthRegenActive.value = true;
                healthRegenAmount.value = poulticeDetails.amount;
                healthRegenClicksRemaining.value =
                    poulticeDetails.durationClicks;
                healthRegenMaxHeal.value = poulticeDetails.maxHeal;
                healthRegenHealedCount.value = 0;
                log(
                    `🌿 You applied a Herbal Poultice. Health will regenerate for ${poulticeDetails.durationClicks} clicks.`
                );
            } else {
                log(`Error: Herbal Poultice details not found.`);
                inventory.value.herbalPoultices++;
            }
        } else {
            log("You don't have any Herbal Poultices to use.");
        }
        break;

      case 'adventurersRations':
        if (inventory.value.adventurersRations > 0) {
            inventory.value.adventurersRations = Number(inventory.value.adventurersRations || 0) - 1;

            const healedAmount = ADVENTURERS_RATIONS_HEAL_AMOUNT;
            playerHP.value = Math.min(
                playerHP.value + healedAmount,
                effectiveMaxHP.value
            );

            if (blurClicksLeft.value > 0) {
                blurClicksLeft.value = 0;
                log(`✨ Your vision clears.`);
            }

            log(
                `🍞 You consumed Adventurer's Rations and recovered ${healedAmount} HP.`
            );
            closeInventoryModal?.();
        } else {
            log("You don't have any Adventurer's Rations to use.");
        }
        break;

      default:
        log(`❓ Don't know how to use item: ${itemType}`);
        break;
    }
  }


  return {
    playerGold,
    inventory,
    playerHP,
    specialUsesLeft,
    weaponBonus,
    shieldBonus,
    blurClicksLeft,
    poisonedClicksLeft,
    poisonDamagePerClick,
    isCloakActive,
    cloakClicksRemaining,
    healthRegenActive,
    healthRegenAmount,
    healthRegenClicksRemaining,
    healthRegenMaxHeal,
    healthRegenHealedCount,
    gameLog,
    timer,
    hpCapBonus,
    playerClass,
    longRestsUsed,
    shortRestsUsed,

    formattedTimer,
    effectiveMaxHP,

    log,
    useItem,
    purchaseItem,
  };
});
