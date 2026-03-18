import { getDirectionDelta } from "./movement.js";
import { createFloorMonsterRoster } from "../game/angband-monster-data.js";

const SPELL_EFFECTS = {
  "magic-missile": { type: "damage", amount: 9, range: 6, message: "A crackling missile hits" },
  "light-room": { type: "utility", message: "A warm light fills the room." },
  "call-light": { type: "utility", message: "Holy light pushes back the shadows." },
  "phase-door": { type: "teleport", distance: 4, message: "Space bends around you." },
  portal: { type: "teleport", distance: 8, message: "A brief sanctuary opens in the ether." },
  bless: { type: "buff", message: "You feel righteous.", duration: 10, toHitBonus: 2, armorClassBonus: 2 },
  heroism: { type: "buff", message: "Courage surges through your veins.", duration: 10, toHitBonus: 2, temporaryHp: 6 },
  "protection-from-evil": { type: "buff", message: "A sacred ward circles you.", duration: 10, armorClassBonus: 2, againstTag: "evil" },
  "minor-healing": { type: "heal", amount: 12, message: "Warm light mends your wounds." },
  healing: { type: "heal", amount: 35, message: "Divine radiance restores you." },
  "detect-monsters": { type: "utility", message: "You sense hostile creatures nearby." },
  "detect-life": { type: "utility", message: "You feel living things nearby." },
  "detect-evil": { type: "utility", message: "You sense evil presences nearby." },
  "sense-invisible": { type: "buff", message: "Your eyes sharpen beyond sight.", duration: 10, sensesInvisible: true },
  "resist-poison": { type: "buff", message: "A bitter resilience settles in.", duration: 10, resistPoison: true },
  "remove-hunger": { type: "utility", message: "You feel comfortably fed." },
  "cure-poison": { type: "heal", amount: 6, message: "You feel cleaner.", curePoison: true },
  "orb-of-draining": { type: "damage", amount: 15, range: 6, message: "A sorrowful orb batters", bonusVsTag: "evil", bonusDamage: 6 },
  "spear-of-light": { type: "damage", amount: 13, range: 8, message: "A brilliant spear skewers" },
  "nether-bolt": { type: "damage", amount: 11, range: 6, message: "A bolt of nether scorches" },
  "stinking-cloud": { type: "damage", amount: 8, range: 5, message: "A choking cloud engulfs" },
  "lightning-strike": { type: "damage", amount: 14, range: 7, message: "Lightning lashes" },
  "confuse-monster": { type: "debuff", range: 6, duration: 3, condition: "confused", message: "Whorls of magic bewilder" },
  "slow-monster": { type: "debuff", range: 6, duration: 3, condition: "slowed", message: "Binding vines hinder" }
};

const LOG_LIMIT = 24;

export function createInstanceRuntime(instance) {
  return createFloorRuntime(instance, 1);
}

export function createNextFloorRuntime(instance, previousRuntime) {
  const runtime = createFloorRuntime(instance, (previousRuntime?.floor || 1) + 1);

  for (const member of instance.members) {
    const previousPlayer = previousRuntime?.players?.[member.characterId];
    if (!previousPlayer) continue;
    runtime.players[member.characterId] = {
      ...runtime.players[member.characterId],
      hp: previousPlayer.hp,
      mana: previousPlayer.mana,
      inventory: structuredClone(previousPlayer.inventory || []),
      equipmentSlots: structuredClone(previousPlayer.equipmentSlots || {}),
      experiencePoints: previousPlayer.experiencePoints,
      timedEffects: structuredClone(previousPlayer.timedEffects || {})
    };
  }

  return runtime;
}

export function serializeInstance(instance, runtime) {
  return {
    ...instance,
    runtime
  };
}

export function getCurrentTurn(runtime) {
  if (!runtime?.encounter?.turnOrder?.length) return null;
  const index = Math.max(0, Math.min(runtime.encounter.activeTurnIndex || 0, runtime.encounter.turnOrder.length - 1));
  return runtime.encounter.turnOrder[index] || null;
}

export function assertPlayerTurn(runtime, characterId) {
  const player = runtime.players[characterId];
  if (!player) throw new Error(`Unknown instance player: ${characterId}`);
  if (player.hp <= 0) throw new Error("You cannot act while defeated.");

  ensureEncounter(runtime);
  const currentTurn = getCurrentTurn(runtime);
  if (!currentTurn) return;

  if (currentTurn.type !== "player" || currentTurn.characterId !== characterId) {
    throw new Error(`It is ${currentTurn.name}'s turn.`);
  }
}

export function finishPlayerTurn(runtime, characterId) {
  const currentTurn = getCurrentTurn(runtime);
  if (!currentTurn || currentTurn.type !== "player" || currentTurn.characterId !== characterId) return;
  tickPlayerEffects(runtime, characterId);
  advanceEncounter(runtime);
}

export function moveInstancePlayer(runtime, characterId, direction) {
  const player = runtime.players[characterId];
  const delta = getDirectionDelta(direction);

  if (!player) throw new Error(`Unknown instance player: ${characterId}`);
  if (!delta) throw new Error(`Invalid direction: ${direction}`);

  const nextX = player.x + delta.x;
  const nextY = player.y + delta.y;
  const tile = runtime.tiles[nextY]?.[nextX];

  if (!tile || tile === "#") {
    addLog(runtime, "You bump into the dungeon wall.");
    return { player, acted: false, moved: false, attacked: false };
  }

  const monster = findMonsterAt(runtime, nextX, nextY);
  if (monster) {
    return {
      player,
      acted: true,
      moved: false,
      attacked: true,
      ...resolveMeleeAttack(runtime, player, monster, "strikes")
    };
  }

  player.x = nextX;
  player.y = nextY;
  return { player, acted: true, moved: true, attacked: false };
}

export function getInstanceTile(runtime, characterId) {
  const player = runtime.players[characterId];
  if (!player) throw new Error(`Unknown instance player: ${characterId}`);
  return runtime.tiles[player.y]?.[player.x] || ".";
}

export function syncRuntimePlayer(runtime, character) {
  if (!runtime.players[character.id]) return;

  runtime.players[character.id] = {
    ...runtime.players[character.id],
    name: character.name,
    hp: character.hp,
    maxHp: character.maxHp,
    mana: character.mana ?? 0,
    maxMana: character.maxMana ?? 0,
    finalStats: structuredClone(character.finalStats || {}),
    inventory: structuredClone(character.inventory || []),
    equipmentSlots: structuredClone(character.equipmentSlots || {}),
    knownSpells: structuredClone(character.knownSpells || []),
    experiencePoints: character.experiencePoints ?? 0,
    timedEffects: structuredClone(runtime.players[character.id].timedEffects || {})
  };
}

export function pickupItem(runtime, characterId) {
  const player = runtime.players[characterId];
  const itemIndex = runtime.items.findIndex((item) => item.x === player.x && item.y === player.y);
  if (itemIndex === -1) {
    addLog(runtime, "Nothing here to pick up.");
    return { player, pickedUp: null };
  }

  const [item] = runtime.items.splice(itemIndex, 1);
  addItemToInventory(player.inventory, { ...item, x: undefined, y: undefined });
  addLog(runtime, `${player.name} picks up ${item.name}.`);
  return { player, pickedUp: item };
}

export function equipItem(runtime, characterId, itemId) {
  const player = runtime.players[characterId];
  const item = player.inventory.find((entry) => entry.id === itemId);
  if (!item) throw new Error("Item not found in inventory.");

  const slot = mapItemToEquipmentSlot(item.slot);
  if (!slot) throw new Error("That item cannot be equipped.");

  const currentItemId = player.equipmentSlots[slot];
  if (currentItemId && currentItemId !== item.id) {
    const current = player.inventory.find((entry) => entry.id === currentItemId);
    if (current) current.equipped = false;
  }

  player.equipmentSlots[slot] = item.id;
  item.equipped = true;
  addLog(runtime, `${player.name} equips ${item.name}.`);
  return player;
}

export function unequipItem(runtime, characterId, slot) {
  const player = runtime.players[characterId];
  const itemId = player.equipmentSlots[slot];
  if (!itemId) throw new Error("Nothing is equipped in that slot.");

  const item = player.inventory.find((entry) => entry.id === itemId);
  if (item) item.equipped = false;
  player.equipmentSlots[slot] = null;
  addLog(runtime, `${player.name} stows ${item?.name || "the item"}.`);
  return player;
}

export function performMeleeAttack(runtime, characterId) {
  const player = runtime.players[characterId];
  const target = findAdjacentMonster(runtime, player);
  if (!target) {
    addLog(runtime, "No monster is close enough to strike.");
    return { player, target: null };
  }

  return {
    player,
    target,
    ...resolveMeleeAttack(runtime, player, target, "slashes")
  };
}

export function performRangedAttack(runtime, characterId) {
  const player = runtime.players[characterId];
  const maxRange = 22;
  const normalRange = 10;
  const bow = getEquippedItem(player, "ranged");
  if (!bow) {
    addLog(runtime, "You need a ranged weapon equipped.");
    return { player, target: null, acted: false, hit: false };
  }

  const ammo = player.inventory.find((item) => item.slot === "arrow" && item.quantity > 0);
  if (!ammo) {
    addLog(runtime, "You have no ammunition.");
    return { player, target: null, acted: false, hit: false };
  }

  const target = findNearestMonster(runtime, player, maxRange);
  if (!target) {
    addLog(runtime, "No target is within range.");
    return { player, target: null, acted: false, hit: false };
  }

  ammo.quantity -= 1;
  if (ammo.quantity <= 0) {
    player.inventory = player.inventory.filter((item) => item.id !== ammo.id);
  }

  const distance = manhattan(player, target);
  const rangePenalty = getRangedRangePenalty(distance, normalRange);
  const dexModifier = getStatBonus(player.finalStats?.dexterity);
  const attackRoll = rollDie(20);
  const attackBonus = getBaseAttackBonus(player) + dexModifier + getWeaponAttackBonus(player, "ranged") + getToHitBonus(player) - rangePenalty;
  const totalAttack = attackRoll + attackBonus;
  const targetArmorClass = target.armorClass || 10;

  if (attackRoll === 1 || (attackRoll !== 20 && totalAttack < targetArmorClass)) {
    addLog(runtime, `${player.name} fires at ${target.name} but misses (d20 ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${targetArmorClass}${rangePenalty > 0 ? `, range -${rangePenalty}` : ""}).`);
    return { player, target, acted: true, hit: false };
  }

  const damage = 6 + getStatBonus(player.finalStats?.dexterity);
  applyDamageToMonster(runtime, player, target, damage, `shoots ${target.name}`, `[d20 ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${targetArmorClass}]`);
  return { player, target, acted: true, hit: true };
}

export function castSpell(runtime, characterId, spellId) {
  const player = runtime.players[characterId];
  const spell = (player.knownSpells || []).find((entry) => entry.id === spellId);
  if (!spell) throw new Error("Spell not known.");
  if ((player.mana || 0) < spell.mana) throw new Error("Not enough mana.");

  player.mana -= spell.mana;
  const effect = SPELL_EFFECTS[spell.id];

  if (!effect) {
    addLog(runtime, `${player.name} invokes ${spell.name}, but nothing happens yet.`);
    return { player, spell };
  }

  if (effect.type === "heal") {
    player.hp = Math.min(player.maxHp, player.hp + effect.amount);
    if (effect.curePoison) {
      if (player.timedEffects?.poisoned) {
        delete player.timedEffects.poisoned;
      }
    }
    addLog(runtime, `${player.name} casts ${spell.name}. ${effect.message}`);
    return { player, spell };
  }

  if (effect.type === "teleport") {
    const destination = findTeleportDestination(runtime, player, effect.distance);
    player.x = destination.x;
    player.y = destination.y;
    addLog(runtime, `${player.name} casts ${spell.name}. ${effect.message}`);
    return { player, spell };
  }

  if (effect.type === "damage") {
    const target = findNearestMonster(
      runtime,
      player,
      effect.range,
      (monster) => !effect.targetFilter || monster.tags?.[effect.targetFilter] || monster.flags?.includes(String(effect.targetFilter).toUpperCase())
    );
    if (!target) {
      addLog(runtime, "No target answers your spell.");
      player.mana += spell.mana;
      return { player, spell, target: null };
    }

    const damage = effect.amount + getSpellcastingModifier(player) + (effect.bonusVsTag && target.tags?.[effect.bonusVsTag] ? Number(effect.bonusDamage || 0) : 0);
    applyDamageToMonster(runtime, player, target, damage, `${effect.message} ${target.name}`, `[spell ${spell.name}]`);
    return { player, spell, target };
  }

  if (effect.type === "buff") {
    applyTimedEffect(player, spell.id, effect);
    if (effect.temporaryHp) {
      player.hp = Math.min(player.maxHp, player.hp + effect.temporaryHp);
    }
    addLog(runtime, `${player.name} casts ${spell.name}. ${effect.message} ${formatBuffSummary(effect)}`);
    return { player, spell };
  }

  if (effect.type === "debuff") {
    const target = findNearestMonster(runtime, player, effect.range || 6);
    if (!target) {
      addLog(runtime, "No target answers your spell.");
      player.mana += spell.mana;
      return { player, spell, target: null };
    }

    applyMonsterCondition(target, effect.condition, effect.duration);
    addLog(runtime, `${player.name} casts ${spell.name}. ${effect.message} ${target.name} for ${effect.duration} turns.`);
    return { player, spell };
  }

  addLog(runtime, `${player.name} casts ${spell.name}. ${effect.message}`);
  return { player, spell };
}

export function restPlayer(runtime, characterId, turns = 10) {
  const player = runtime.players[characterId];
  if (!player) throw new Error(`Unknown instance player: ${characterId}`);

  if ((runtime.monsters || []).some((monster) => monster.hp > 0)) {
    throw new Error("You cannot rest while enemies are still in the encounter.");
  }

  const totalTurns = Math.max(1, Math.min(Number(turns || 10), 25));
  let turnsSpent = 0;

  for (let index = 0; index < totalTurns; index += 1) {
    if (player.hp <= 0) break;

    const hpBefore = player.hp;
    const manaBefore = player.mana ?? 0;
    player.hp = Math.min(player.maxHp, player.hp + 1);
    player.mana = Math.min(player.maxMana ?? 0, (player.mana ?? 0) + 1);
    turnsSpent += 1;

    if (player.hp <= 0) {
      addLog(runtime, `${player.name} is struck down while resting.`);
      break;
    }

    const fullyRecovered = player.hp >= player.maxHp && (player.mana ?? 0) >= (player.maxMana ?? 0);
    const noRecovery = player.hp === hpBefore && (player.mana ?? 0) === manaBefore;
    if (fullyRecovered || noRecovery) {
      break;
    }
  }

  addLog(runtime, `${player.name} rests for ${turnsSpent} turn${turnsSpent === 1 ? "" : "s"}.`);
  return { player, turnsSpent };
}

export function advanceMonsters(runtime) {
  for (const monster of [...runtime.monsters]) {
    const target = findNearestPlayer(runtime, monster);
    if (!target) continue;

    const distance = manhattan(monster, target);
    if (distance === 1) {
      const damage = monster.damage;
      target.hp = Math.max(0, target.hp - damage);
      addLog(runtime, `${monster.name} hits ${target.name} for ${damage}.`);
      continue;
    }

    const step = {
      x: monster.x + Math.sign(target.x - monster.x),
      y: monster.y + Math.sign(target.y - monster.y)
    };

    if (runtime.tiles[step.y]?.[step.x] === "#" || findMonsterAt(runtime, step.x, step.y) || findPlayerAt(runtime, step.x, step.y)) {
      continue;
    }

    monster.x = step.x;
    monster.y = step.y;
  }
}

export function ensureEncounter(runtime) {
  if (!hasLivingMonsters(runtime)) {
    runtime.encounter = null;
    return null;
  }

  if (runtime.encounter?.turnOrder?.length) {
    synchronizeEncounter(runtime);
    return runtime.encounter;
  }

  const turnOrder = createInitiativeOrder(runtime);
  runtime.encounter = {
    round: 1,
    activeTurnIndex: 0,
    turnOrder
  };

  const orderSummary = turnOrder
    .map((entry) => `${entry.name} (${entry.initiative})`)
    .join(", ");
  addLog(runtime, `Initiative: ${orderSummary}.`);
  resolveAutomatedTurns(runtime);
  return runtime.encounter;
}

export function advanceEncounter(runtime) {
  if (!runtime.encounter?.turnOrder?.length) return;

  synchronizeEncounter(runtime);
  if (!runtime.encounter) return;

  advanceTurnIndex(runtime);
  resolveAutomatedTurns(runtime);
}

function createFloorRuntime(instance, floor) {
  const width = 40;
  const height = 40;
  const tiles = [];
  const players = {};

  for (let y = 0; y < height; y += 1) {
    let row = "";

    for (let x = 0; x < width; x += 1) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const leftHall = x >= 4 && x <= 17 && y >= 4 && y <= 16;
      const centerHall = x >= 14 && x <= 26 && y >= 10 && y <= 30;
      const lowerHall = x >= 20 && x <= 35 && y >= 24 && y <= 35;
      const northRoom = x >= 24 && x <= 34 && y >= 4 && y <= 12;
      const openFloor = leftHall || centerHall || lowerHall || northRoom;

      row += isBorder || !openFloor ? "#" : ".";
    }

    tiles.push(row);
  }

  setTile(tiles, 8, 8, ">");
  setTile(tiles, 30, 30, "<");

  instance.members.forEach((member, index) => {
    const spawn = { x: 6 + index * 2, y: 8 };
    players[member.characterId] = {
      ...member,
      id: member.characterId,
      x: spawn.x,
      y: spawn.y,
      inventory: structuredClone(member.inventory || []),
      equipmentSlots: structuredClone(member.equipmentSlots || {}),
      knownSpells: structuredClone(member.knownSpells || []),
      mana: member.mana ?? 0,
      maxMana: member.maxMana ?? 0,
      experiencePoints: member.experiencePoints ?? 0,
      finalStats: structuredClone(member.finalStats || {}),
      timedEffects: {}
    };
  });

  return {
    id: instance.id,
    mode: instance.mode,
    floor,
    width,
    height,
    tiles,
    players,
    items: createFloorItems(floor),
    monsters: createFloorMonsters(floor),
    log: [`The air of floor ${floor} feels dangerous.`],
    encounter: null
  };
}

function createFloorItems(floor) {
  return [
    { id: `floor_${floor}_ration`, name: "Ration of Food", slot: "food", quantity: 1, stackable: true, equipped: false, x: 9, y: 8, symbol: "!" },
    { id: `floor_${floor}_arrow`, name: "Arrow", slot: "arrow", quantity: 5 + floor, stackable: true, equipped: false, x: 13, y: 9, symbol: "/" },
    { id: `floor_${floor}_potion`, name: "Potion of Cure Light Wounds", slot: "potion", quantity: 1, stackable: false, equipped: false, x: 16, y: 12, symbol: "!" }
  ];
}

function createFloorMonsters(floor) {
  return createFloorMonsterRoster(floor, [
    { x: 14, y: 8 },
    { x: 18, y: 12 },
    { x: 23, y: 16 }
  ]);
}

function findAdjacentMonster(runtime, player) {
  return runtime.monsters.find((monster) => manhattan(monster, player) === 1) || null;
}

function findNearestMonster(runtime, player, maxRange, predicate = () => true) {
  return runtime.monsters
    .map((monster) => ({ monster, distance: manhattan(monster, player) }))
    .filter((entry) => entry.distance <= maxRange && predicate(entry.monster))
    .sort((a, b) => a.distance - b.distance)[0]?.monster || null;
}

function findNearestPlayer(runtime, monster) {
  return Object.values(runtime.players)
    .map((player) => ({ player, distance: manhattan(player, monster) }))
    .filter((entry) => entry.player.hp > 0)
    .sort((a, b) => a.distance - b.distance)[0]?.player || null;
}

function findMonsterAt(runtime, x, y) {
  return runtime.monsters.find((monster) => monster.x === x && monster.y === y) || null;
}

function findPlayerAt(runtime, x, y) {
  return Object.values(runtime.players).find((player) => player.x === x && player.y === y && player.hp > 0) || null;
}

function applyDamageToMonster(runtime, player, monster, damage, actionText, detailText = "") {
  monster.hp = Math.max(0, monster.hp - damage);
  addLog(runtime, `${player.name} ${actionText} for ${damage}.${detailText ? ` ${detailText}` : ""}`);

  if (monster.hp <= 0) {
    awardMonsterExperience(runtime, player, monster.experience);
    runtime.monsters = runtime.monsters.filter((entry) => entry.id !== monster.id);
    addLog(runtime, `${monster.name} is defeated.`);
    synchronizeEncounter(runtime);
  }
}

function addItemToInventory(inventory, item) {
  const existing = inventory.find((entry) => entry.name === item.name && entry.stackable);
  if (existing) {
    existing.quantity += item.quantity;
    return;
  }
  inventory.push(item);
}

function addLog(runtime, message) {
  runtime.log = [...(runtime.log || []).slice(-(LOG_LIMIT - 1)), message];
}

function getEquippedItem(player, slot) {
  const itemId = player.equipmentSlots?.[slot];
  return player.inventory?.find((entry) => entry.id === itemId) || null;
}

function mapItemToEquipmentSlot(slot) {
  if (["sword", "hafted"].includes(slot)) return "weapon";
  if (["bow"].includes(slot)) return "ranged";
  if (["soft armour"].includes(slot)) return "armour";
  if (["shield"].includes(slot)) return "shield";
  if (["light"].includes(slot)) return "light";
  if (["prayer book", "magic book", "nature book", "shadow book"].includes(slot)) return "book";
  return null;
}

function findTeleportDestination(runtime, player, distance) {
  const candidates = [];
  for (let y = 1; y < runtime.height - 1; y += 1) {
    for (let x = 1; x < runtime.width - 1; x += 1) {
      if (runtime.tiles[y]?.[x] !== ".") continue;
      if (manhattan({ x, y }, player) > distance) continue;
      if (findMonsterAt(runtime, x, y) || findPlayerAt(runtime, x, y)) continue;
      candidates.push({ x, y });
    }
  }

  return candidates[0] || { x: player.x, y: player.y };
}

function getStatBonus(score) {
  return Math.max(0, Math.floor((Number(score || 10) - 10) / 2));
}

function getBaseAttackBonus(player) {
  const level = Math.max(1, Number(player.level || 1));
  const classId = String(player.classId || "");

  if (["fighter", "paladin", "ranger", "blackguard"].includes(classId)) return level;
  if (["rogue", "priest", "druid", "necromancer"].includes(classId)) return Math.floor(level * 0.75);
  return Math.floor(level * 0.5);
}

function getMeleeDamage(player) {
  const weapon = getEquippedItem(player, "weapon");
  const baseDamage = getWeaponDamage(weapon?.name, "weapon");
  return baseDamage + getStatBonus(player.finalStats?.strength);
}

function getWeaponDamage(itemName, slot) {
  const name = String(itemName || "").toLowerCase();
  if (slot === "ranged") {
    if (name.includes("long bow")) return 8;
    if (name.includes("short bow")) return 7;
    return 6;
  }

  if (name.includes("main gauche")) return 6;
  if (name.includes("dagger")) return 5;
  if (name.includes("long sword")) return 8;
  if (name.includes("broad sword")) return 8;
  if (name.includes("spear")) return 7;
  if (name.includes("mace")) return 7;
  if (name.includes("whip")) return 4;
  return 5;
}

function getWeaponAttackBonus(player, slot) {
  const item = getEquippedItem(player, slot);
  const name = String(item?.name || "").toLowerCase();
  if (!item) return 0;
  if (name.includes("main gauche")) return 1;
  if (name.includes("long bow")) return 2;
  if (name.includes("short bow")) return 1;
  return 0;
}

function getEquipmentArmorBonus(player) {
  const armour = getEquippedItem(player, "armour");
  const shield = getEquippedItem(player, "shield");
  const armourName = String(armour?.name || "").toLowerCase();
  const shieldName = String(shield?.name || "").toLowerCase();

  let total = 0;
  if (armourName.includes("robe")) total += 1;
  if (armourName.includes("soft leather") || armourName.includes("hard leather")) total += 2;
  if (armourName.includes("leather scale")) total += 3;
  if (armourName.includes("chain mail")) total += 5;
  if (armourName.includes("metal scale")) total += 6;

  if (shieldName.includes("shield")) total += 2;
  return total;
}

function resolveMeleeAttack(runtime, player, target, actionVerb) {
  const attackRoll = rollDie(20);
  const attackBonus = getBaseAttackBonus(player)
    + getStatBonus(player.finalStats?.strength)
    + getWeaponAttackBonus(player, "weapon")
    + getToHitBonus(player);
  const totalAttack = attackRoll + attackBonus;
  const targetArmorClass = target.armorClass || 10;

  if (attackRoll === 1 || (attackRoll !== 20 && totalAttack < targetArmorClass)) {
    addLog(runtime, `${player.name} ${actionVerb} at ${target.name} but misses (d20 ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${targetArmorClass}).`);
    return { target, hit: false };
  }

  const damage = getMeleeDamage(player);
  applyDamageToMonster(runtime, player, target, damage, `${actionVerb} ${target.name}`, `[d20 ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${targetArmorClass}]`);
  return { target, hit: true };
}

function getToHitBonus(player) {
  return Object.values(player.timedEffects || {}).reduce((total, effect) => total + Number(effect.toHitBonus || 0), 0);
}

function getArmorClass(player) {
  return 10
    + getStatBonus(player.finalStats?.dexterity)
    + getEquipmentArmorBonus(player)
    + Object.values(player.timedEffects || {}).reduce((total, effect) => {
      if (effect.againstTag) return total;
      return total + Number(effect.armorClassBonus || 0);
    }, 0);
}

function getRangedRangePenalty(distance, normalRange) {
  if (distance <= normalRange) return 0;
  return Math.ceil((distance - normalRange) / 3) * 3;
}

function awardMonsterExperience(runtime, killingPlayer, totalExperience) {
  const recipients = Object.values(runtime.players).filter((player) => player.hp > 0);
  if (recipients.length === 0) return;

  const sharedExperience = Math.floor(totalExperience / recipients.length);
  const remainder = totalExperience % recipients.length;

  for (const recipient of recipients) {
    recipient.experiencePoints = (recipient.experiencePoints || 0) + sharedExperience;
  }

  killingPlayer.experiencePoints = (killingPlayer.experiencePoints || 0) + remainder;
}

function applyTimedEffect(player, effectId, effect) {
  player.timedEffects = {
    ...(player.timedEffects || {}),
    [effectId]: {
      id: effectId,
      label: effect.label || toTitleCase(effectId.replace(/-/g, " ")),
      remainingTurns: effect.duration || 0,
      toHitBonus: effect.toHitBonus || 0,
      armorClassBonus: effect.armorClassBonus || 0,
      resistPoison: Boolean(effect.resistPoison),
      sensesInvisible: Boolean(effect.sensesInvisible),
      againstTag: effect.againstTag || null
    }
  };
}

function tickPlayerEffects(runtime, characterId) {
  const player = runtime.players[characterId];
  if (!player?.timedEffects) return;

  for (const [effectId, effectState] of Object.entries(player.timedEffects)) {
    effectState.remainingTurns = Math.max(0, Number(effectState.remainingTurns || 0) - 1);
    if (effectState.remainingTurns <= 0) {
      delete player.timedEffects[effectId];
      addLog(runtime, `${player.name}'s ${String(effectState.label || effectId).toLowerCase()} fades.`);
    }
  }
}

function hasLivingMonsters(runtime) {
  return (runtime.monsters || []).some((monster) => monster.hp > 0);
}

function synchronizeEncounter(runtime) {
  if (!runtime.encounter?.turnOrder?.length) {
    if (!hasLivingMonsters(runtime)) {
      runtime.encounter = null;
    }
    return;
  }

  const currentTurnId = runtime.encounter.turnOrder[runtime.encounter.activeTurnIndex]?.id || null;
  runtime.encounter.turnOrder = runtime.encounter.turnOrder.filter((entry) => isTurnEntryActive(runtime, entry));

  if (!runtime.encounter.turnOrder.length || !hasLivingMonsters(runtime)) {
    runtime.encounter = null;
    addLog(runtime, "The encounter ends.");
    return;
  }

  const currentTurnIndex = currentTurnId
    ? runtime.encounter.turnOrder.findIndex((entry) => entry.id === currentTurnId)
    : -1;

  if (currentTurnIndex !== -1) {
    runtime.encounter.activeTurnIndex = currentTurnIndex;
  } else if (runtime.encounter.activeTurnIndex >= runtime.encounter.turnOrder.length) {
    runtime.encounter.activeTurnIndex = 0;
  }
}

function resolveAutomatedTurns(runtime) {
  let safety = 0;

  while (runtime.encounter && safety < 50) {
    safety += 1;
    synchronizeEncounter(runtime);
    if (!runtime.encounter) return;

    const currentTurn = getCurrentTurn(runtime);
    if (!currentTurn) return;

    if (currentTurn.type === "player") {
      if (runtime.players[currentTurn.characterId]?.hp > 0) {
        addLog(runtime, `${currentTurn.name}'s turn.`);
        return;
      }

      advanceTurnIndex(runtime);
      continue;
    }

    runMonsterGroupTurn(runtime, currentTurn);
    synchronizeEncounter(runtime);
    if (!runtime.encounter) return;
    advanceTurnIndex(runtime);
  }
}

function advanceTurnIndex(runtime) {
  if (!runtime.encounter?.turnOrder?.length) return;

  runtime.encounter.activeTurnIndex += 1;

  if (runtime.encounter.activeTurnIndex >= runtime.encounter.turnOrder.length) {
    runtime.encounter.activeTurnIndex = 0;
    runtime.encounter.round += 1;
    addLog(runtime, `Round ${runtime.encounter.round} begins.`);
  }
}

function createInitiativeOrder(runtime) {
  const playerEntries = Object.values(runtime.players)
    .filter((player) => player.hp > 0)
    .map((player) => createPlayerTurnEntry(player));
  const monsterEntries = createMonsterGroups(runtime.monsters).map((group) => createMonsterTurnEntry(runtime, group));

  return [...playerEntries, ...monsterEntries].sort(compareTurnEntries);
}

function createPlayerTurnEntry(player) {
  const dexModifier = getStatBonus(player.finalStats?.dexterity);
  return {
    id: `player:${player.characterId}`,
    type: "player",
    name: player.name,
    characterId: player.characterId,
    initiative: rollInitiative(dexModifier),
    dexModifier
  };
}

function createMonsterTurnEntry(runtime, group) {
  const leadMonster = group[0];
  const dexModifier = getMonsterDexModifier(leadMonster);
  return {
    id: `monster-group:${leadMonster.name}`,
    type: "monster-group",
    name: `${leadMonster.name}${group.length > 1 ? " group" : ""}`,
    monsterName: leadMonster.name,
    initiative: rollInitiative(dexModifier),
    dexModifier
  };
}

function createMonsterGroups(monsters) {
  const groups = new Map();

  for (const monster of monsters || []) {
    if (monster.hp <= 0) continue;
    const key = monster.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(monster);
  }

  return [...groups.values()];
}

function compareTurnEntries(left, right) {
  if (right.initiative !== left.initiative) return right.initiative - left.initiative;
  if (left.type !== right.type) return left.type === "player" ? -1 : 1;
  if (right.dexModifier !== left.dexModifier) return right.dexModifier - left.dexModifier;
  return left.name.localeCompare(right.name);
}

function isTurnEntryActive(runtime, entry) {
  if (entry.type === "player") {
    return Boolean(runtime.players[entry.characterId]?.hp > 0);
  }

  return runtime.monsters.some((monster) => monster.hp > 0 && monster.name === entry.monsterName);
}

function runMonsterGroupTurn(runtime, turnEntry) {
  const monsters = runtime.monsters
    .filter((monster) => monster.hp > 0 && monster.name === turnEntry.monsterName)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (monsters.length === 0) return;

  addLog(runtime, `${turnEntry.name}'s turn.`);

  for (const monster of monsters) {
    if (monster.conditions?.confused && rollDie(100) <= 50) {
      addLog(runtime, `${monster.name} stumbles in confusion.`);
      tickMonsterConditions(monster);
      continue;
    }

    if (monster.conditions?.slowed && runtime.encounter?.round % 2 === 0) {
      addLog(runtime, `${monster.name} struggles to act while slowed.`);
      tickMonsterConditions(monster);
      continue;
    }

    const target = findNearestPlayer(runtime, monster);
    if (!target) continue;

    const distance = manhattan(monster, target);
    if (distance === 1) {
      const blow = chooseMonsterBlow(monster);
      const attackRoll = rollDie(20);
      const attackBonus = Number(monster.attackBonus || 0) - Number(monster.conditions?.slowed ? 2 : 0);
      const totalAttack = attackRoll + attackBonus;
      const targetArmorClass = getArmorClass(target) + getConditionalArmorClassBonus(target, monster);

      if (attackRoll === 1 || (attackRoll !== 20 && totalAttack < targetArmorClass)) {
        addLog(runtime, `${monster.name} attacks ${target.name} but misses (d20 ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${targetArmorClass}).`);
        tickMonsterConditions(monster);
        continue;
      }

      const damage = rollDamageDice(blow?.damage) || Number(monster.damage || 1);
      target.hp = Math.max(0, target.hp - damage);
      addLog(runtime, `${formatMonsterAttackVerb(monster, blow, target.name)} for ${damage}. [d20 ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${targetArmorClass}]`);
      tickMonsterConditions(monster);
      continue;
    }

    const step = {
      x: monster.x + Math.sign(target.x - monster.x),
      y: monster.y + Math.sign(target.y - monster.y)
    };

    if (runtime.tiles[step.y]?.[step.x] === "#" || findMonsterAt(runtime, step.x, step.y) || findPlayerAt(runtime, step.x, step.y)) {
      tickMonsterConditions(monster);
      continue;
    }

    monster.x = step.x;
    monster.y = step.y;
    addLog(runtime, `${monster.name} closes in.`);
    tickMonsterConditions(monster);
  }
}

function getConditionalArmorClassBonus(player, monster) {
  return Object.values(player.timedEffects || {}).reduce((total, effect) => {
    if (effect.againstTag && monster.tags?.[effect.againstTag]) {
      return total + Number(effect.armorClassBonus || 0);
    }
    return total;
  }, 0);
}

function chooseMonsterBlow(monster) {
  return (monster.blows || []).find((blow) => blow.damage && blow.damage !== "0d0") || monster.primaryBlow || null;
}

function formatMonsterAttackVerb(monster, blow, targetName) {
  const template = String(blow?.verb || `${monster.name} attacks {target}`);
  if (template.includes("{target}")) {
    return `${monster.name} ${template.replace("{target}", targetName)}`.replace(`${monster.name} ${monster.name}`, monster.name);
  }
  return `${monster.name} attacks ${targetName}`;
}

function applyMonsterCondition(monster, condition, duration) {
  monster.conditions = {
    ...(monster.conditions || {}),
    [condition]: Math.max(Number(monster.conditions?.[condition] || 0), Number(duration || 0))
  };
}

function tickMonsterConditions(monster) {
  for (const [condition, remaining] of Object.entries(monster.conditions || {})) {
    const next = Math.max(0, Number(remaining || 0) - 1);
    if (next <= 0) {
      delete monster.conditions[condition];
      continue;
    }
    monster.conditions[condition] = next;
  }
}

function getMonsterDexModifier(monster) {
  const baseDex = monster.name.toLowerCase().includes("rat") ? 14 : 10;
  return getStatBonus(baseDex);
}

function rollInitiative(dexModifier) {
  return rollDie(20) + dexModifier;
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDamageDice(diceExpression) {
  const match = String(diceExpression || "").match(/^(\d+)d(\d+)$/);
  if (!match) return 0;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += rollDie(sides);
  }
  return total;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getSpellcastingModifier(player) {
  const classId = String(player.classId || "");
  if (["mage", "necromancer", "rogue"].includes(classId)) {
    return getStatBonus(player.finalStats?.intelligence);
  }
  if (["priest", "paladin", "ranger", "druid", "blackguard"].includes(classId)) {
    return getStatBonus(player.finalStats?.wisdom);
  }
  return 0;
}

function formatBuffSummary(effect) {
  const parts = [];
  if (effect.toHitBonus) parts.push(`+${effect.toHitBonus} to hit`);
  if (effect.armorClassBonus) parts.push(`+${effect.armorClassBonus} AC`);
  if (effect.resistPoison) parts.push("poison resistance");
  if (effect.sensesInvisible) parts.push("see invisible");
  if (effect.duration) parts.push(`${effect.duration} turns`);
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}

function toTitleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function setTile(tiles, x, y, value) {
  const row = tiles[y];
  tiles[y] = `${row.slice(0, x)}${value}${row.slice(x + 1)}`;
}
