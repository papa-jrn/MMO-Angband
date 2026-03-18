import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  POINT_BUY_BUDGET,
  STAT_KEYS,
  applyStatBonuses,
  calculateExperienceFactor,
  calculateStartingHp,
  createDefaultPurchasedStats,
  createSkillBlock,
  validatePointBuyStats
} from "../../../../packages/game-core/src/index.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../../..");
const raceFilePath = resolve(repoRoot, "Angband-4.2.6/lib/gamedata/p_race.txt");
const classFilePath = resolve(repoRoot, "Angband-4.2.6/lib/gamedata/class.txt");

const raceEntries = parseRaceEntries(readFileSync(raceFilePath, "utf8"));
const classEntries = parseClassEntries(readFileSync(classFilePath, "utf8"));

const raceMap = new Map(raceEntries.map((race) => [race.id, race]));
const classMap = new Map(classEntries.map((playerClass) => [playerClass.id, playerClass]));

export function getCharacterCreationOptions() {
  return {
    pointBuy: {
      budget: POINT_BUY_BUDGET,
      minimum: 8,
      maximum: 15,
      defaultStats: createDefaultPurchasedStats(),
      costs: {
        8: 0,
        9: 1,
        10: 2,
        11: 3,
        12: 4,
        13: 5,
        14: 7,
        15: 9
      }
    },
    races: raceEntries,
    classes: classEntries
  };
}

export function buildCharacterTemplate({ characterName, raceId, classId, purchasedStats }) {
  const race = raceMap.get(String(raceId || ""));
  const playerClass = classMap.get(String(classId || ""));

  if (!race) {
    throw new Error("Choose a valid race.");
  }

  if (!playerClass) {
    throw new Error("Choose a valid class.");
  }

  const validation = validatePointBuyStats(purchasedStats, POINT_BUY_BUDGET);

  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const finalStats = applyStatBonuses(validation.normalizedStats, race.stats);
  const skills = createSkillBlock(race.skills, playerClass.skills);
  const maxHp = calculateStartingHp({
    raceHitdie: race.hitdie,
    classHitdie: playerClass.hitdie,
    finalStats
  });

  return {
    name: characterName,
    raceId: race.id,
    raceName: race.name,
    classId: playerClass.id,
    className: playerClass.name,
    level: 1,
    experiencePoints: 0,
    experienceFactor: calculateExperienceFactor({
      raceExp: race.exp,
      classExp: playerClass.exp
    }),
    pointBuySpent: validation.pointsSpent,
    purchasedStats: validation.normalizedStats,
    raceStats: race.stats,
    classStats: playerClass.stats,
    finalStats,
    skills,
    equipment: playerClass.equipment,
    inventory: createStartingInventory(playerClass.equipment),
    equipmentSlots: createStartingEquipmentSlots(playerClass.equipment),
    knownSpells: getAvailableSpellsForClass(playerClass.id, 1),
    maxMana: calculateStartingMana(playerClass, finalStats),
    mana: calculateStartingMana(playerClass, finalStats),
    maxHp,
    hp: maxHp
  };
}

export function getAvailableSpellsForClass(classId, level = 1) {
  const playerClass = classMap.get(String(classId || ""));
  if (!playerClass) return [];

  return (playerClass.spells || [])
    .filter((spell) => Number(spell.level || 99) <= Number(level || 1))
    .map((spell) => ({ ...spell }));
}

export function getStartingManaForClass(classId, finalStats) {
  const playerClass = classMap.get(String(classId || ""));
  if (!playerClass) return 0;
  return calculateStartingMana(playerClass, finalStats);
}

function parseRaceEntries(source) {
  const entries = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("name:")) {
      if (current) entries.push(finalizeEntry(current));
      current = {
        id: slugify(line.slice(5)),
        name: line.slice(5),
        stats: createZeroStats(),
        skills: {},
        hitdie: 10,
        exp: 100
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("stats:")) {
      current.stats = parseStatLine(line.slice(6));
      continue;
    }

    if (line.startsWith("skill-")) {
      const separator = line.indexOf(":");
      current.skills[line.slice(6, separator)] = Number(line.slice(separator + 1));
      continue;
    }

    if (line.startsWith("hitdie:")) {
      current.hitdie = Number(line.slice(7));
      continue;
    }

    if (line.startsWith("exp:")) {
      current.exp = Number(line.slice(4));
    }
  }

  if (current) entries.push(finalizeEntry(current));
  return entries;
}

function parseClassEntries(source) {
  const entries = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("name:")) {
      if (current) entries.push(finalizeEntry(current));
      current = {
        id: slugify(line.slice(5)),
        name: line.slice(5),
        stats: createZeroStats(),
        skills: {},
        hitdie: 0,
        exp: 0,
        equipment: [],
        spells: [],
        currentBook: null,
        currentBookQuality: null
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("stats:")) {
      current.stats = parseStatLine(line.slice(6));
      continue;
    }

    if (line.startsWith("skill-")) {
      const [skillKey, baseValue, incrementValue] = line.split(":");
      current.skills[skillKey.slice(6)] = {
        base: Number(baseValue),
        increment: Number(incrementValue || 0)
      };
      continue;
    }

    if (line.startsWith("hitdie:")) {
      current.hitdie = Number(line.slice(7));
      continue;
    }

    if (line.startsWith("exp:")) {
      current.exp = Number(line.slice(4));
      continue;
    }

    if (line.startsWith("equip:")) {
      const [, slot, itemName, min, max, rules] = line.split(":");
      current.equipment.push({
        slot,
        itemName,
        min: Number(min),
        max: Number(max),
        rules
      });
      continue;
    }

    if (line.startsWith("book:")) {
      const [, , quality, bookName, , realm] = line.split(":");
      current.currentBook = bookName;
      current.currentBookQuality = quality;
      current.currentRealm = realm;
      continue;
    }

    if (line.startsWith("spell:")) {
      const [, spellName, level, mana, fail] = line.split(":");
      if (current.currentBookQuality === "town") {
        current.spells.push({
          id: slugify(spellName),
          name: spellName,
          level: Number(level),
          mana: Number(mana),
          fail: Number(fail || 0),
          realm: current.currentRealm || "arcane",
          bookName: current.currentBook
        });
      }
    }
  }

  if (current) entries.push(finalizeEntry(current));
  return entries;
}

function parseStatLine(value) {
  const [strength, intelligence, wisdom, dexterity, constitution] = value.split(":").map(Number);
  return {
    strength,
    intelligence,
    wisdom,
    dexterity,
    constitution
  };
}

function finalizeEntry(entry) {
  return {
    ...entry,
    statSummary: STAT_KEYS.map((key) => {
      const value = Number(entry.stats[key] || 0);
      return `${key.slice(0, 3).toUpperCase()} ${value >= 0 ? "+" : ""}${value}`;
    }).join(", ")
  };
}

function createZeroStats() {
  return {
    strength: 0,
    intelligence: 0,
    wisdom: 0,
    dexterity: 0,
    constitution: 0
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createStartingInventory(equipment) {
  return (equipment || []).map((item, index) => ({
    id: `item_${slugify(item.itemName)}_${index + 1}`,
    slot: item.slot,
    name: item.itemName,
    quantity: item.min,
    stackable: item.max > 1 || item.min > 1,
    equipped: isEquippedSlot(item.slot)
  }));
}

function isEquippedSlot(slot) {
  return ["sword", "hafted", "soft armour", "shield", "bow", "light", "prayer book", "magic book", "nature book", "shadow book"].includes(slot);
}

function createStartingEquipmentSlots(inventory) {
  const slots = {
    weapon: null,
    ranged: null,
    armour: null,
    shield: null,
    light: null,
    book: null
  };

  for (const item of createStartingInventory(inventory)) {
    if (!item.equipped) continue;
    const slot = mapInventorySlotToEquipmentSlot(item.slot);
    if (slot && !slots[slot]) {
      slots[slot] = item.id;
    }
  }

  return slots;
}

function mapInventorySlotToEquipmentSlot(slot) {
  if (["sword", "hafted"].includes(slot)) return "weapon";
  if (["bow"].includes(slot)) return "ranged";
  if (["soft armour"].includes(slot)) return "armour";
  if (["shield"].includes(slot)) return "shield";
  if (["light"].includes(slot)) return "light";
  if (["prayer book", "magic book", "nature book", "shadow book"].includes(slot)) return "book";
  return null;
}

function calculateStartingMana(playerClass, finalStats) {
  const spellStat = getSpellStat(playerClass.id);
  if (!spellStat) return 0;
  const statValue = Number(finalStats[spellStat] || 10);
  return Math.max(0, 3 + Math.floor((statValue - 10) / 2));
}

function getSpellStat(classId) {
  if (["mage", "necromancer", "rogue"].includes(classId)) return "intelligence";
  if (["priest", "paladin", "ranger", "druid", "blackguard"].includes(classId)) return "wisdom";
  return null;
}
