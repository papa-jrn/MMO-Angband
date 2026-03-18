import { getDirectionDelta } from "./movement.js";

const SPELL_EFFECTS = {
  "magic-missile": { type: "damage", amount: 9, range: 6, message: "A crackling missile hits" },
  "light-room": { type: "utility", message: "A warm light fills the room." },
  "phase-door": { type: "teleport", distance: 4, message: "Space bends around you." },
  bless: { type: "buff", message: "You feel righteous." },
  "minor-healing": { type: "heal", amount: 12, message: "Warm light mends your wounds." },
  "detect-monsters": { type: "utility", message: "You sense hostile creatures nearby." },
  "detect-life": { type: "utility", message: "You feel living things nearby." },
  "resist-poison": { type: "buff", message: "A bitter resilience settles in." },
  "remove-hunger": { type: "utility", message: "You feel comfortably fed." },
  "cure-poison": { type: "heal", amount: 6, message: "You feel cleaner." }
};

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
      experiencePoints: previousPlayer.experiencePoints
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
    const damage = getMeleeDamage(player);
    applyDamageToMonster(runtime, player, monster, damage, `strikes ${monster.name}`);
    return { player, acted: true, moved: false, attacked: true };
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
    experiencePoints: character.experiencePoints ?? 0
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

  const damage = getMeleeDamage(player);
  applyDamageToMonster(runtime, player, target, damage, `slashes ${target.name}`);
  return { player, target };
}

export function performRangedAttack(runtime, characterId) {
  const player = runtime.players[characterId];
  const bow = getEquippedItem(player, "ranged");
  if (!bow) {
    addLog(runtime, "You need a ranged weapon equipped.");
    return { player, target: null };
  }

  const ammo = player.inventory.find((item) => item.slot === "arrow" && item.quantity > 0);
  if (!ammo) {
    addLog(runtime, "You have no ammunition.");
    return { player, target: null };
  }

  const target = findNearestMonster(runtime, player, 7);
  if (!target) {
    addLog(runtime, "No target is within range.");
    return { player, target: null };
  }

  ammo.quantity -= 1;
  if (ammo.quantity <= 0) {
    player.inventory = player.inventory.filter((item) => item.id !== ammo.id);
  }

  const damage = 6 + getStatBonus(player.finalStats?.dexterity);
  applyDamageToMonster(runtime, player, target, damage, `shoots ${target.name}`);
  return { player, target };
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
    const target = findNearestMonster(runtime, player, effect.range);
    if (!target) {
      addLog(runtime, "No target answers your spell.");
      player.mana += spell.mana;
      return { player, spell, target: null };
    }

    applyDamageToMonster(runtime, player, target, effect.amount + getStatBonus(player.finalStats?.intelligence), `${effect.message} ${target.name}`);
    return { player, spell, target };
  }

  addLog(runtime, `${player.name} casts ${spell.name}. ${effect.message}`);
  return { player, spell };
}

export function restPlayer(runtime, characterId, turns = 10) {
  const player = runtime.players[characterId];
  if (!player) throw new Error(`Unknown instance player: ${characterId}`);

  const totalTurns = Math.max(1, Math.min(Number(turns || 10), 25));
  let turnsSpent = 0;

  for (let index = 0; index < totalTurns; index += 1) {
    if (player.hp <= 0) break;

    const hpBefore = player.hp;
    const manaBefore = player.mana ?? 0;
    player.hp = Math.min(player.maxHp, player.hp + 1);
    player.mana = Math.min(player.maxMana ?? 0, (player.mana ?? 0) + 1);
    turnsSpent += 1;

    advanceMonsters(runtime);

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

function createFloorRuntime(instance, floor) {
  const width = 20;
  const height = 12;
  const tiles = [];
  const players = {};

  for (let y = 0; y < height; y += 1) {
    let row = "";

    for (let x = 0; x < width; x += 1) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const centerLeft = 3 + (floor % 3);
      const centerRight = 16 - (floor % 2);
      const roomTop = 2 + (floor % 2);
      const roomBottom = 9 - (floor % 2);
      const isRoomWall =
        ((x === centerLeft || x === centerRight) && y >= roomTop && y <= roomBottom) ||
        ((y === roomTop || y === roomBottom) && x >= centerLeft && x <= centerRight);

      row += isBorder || isRoomWall ? "#" : ".";
    }

    tiles.push(row);
  }

  setTile(tiles, 9, 6, ">");
  setTile(tiles, 11, 6, "<");

  instance.members.forEach((member, index) => {
    const spawn = { x: 6 + index * 2, y: 6 };
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
      finalStats: structuredClone(member.finalStats || {})
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
    log: [`The air of floor ${floor} feels dangerous.`]
  };
}

function createFloorItems(floor) {
  return [
    { id: `floor_${floor}_ration`, name: "Ration of Food", slot: "food", quantity: 1, stackable: true, equipped: false, x: 7, y: 6, symbol: "!" },
    { id: `floor_${floor}_arrow`, name: "Arrow", slot: "arrow", quantity: 5 + floor, stackable: true, equipped: false, x: 13, y: 7, symbol: "/" },
    { id: `floor_${floor}_potion`, name: "Potion of Cure Light Wounds", slot: "potion", quantity: 1, stackable: false, equipped: false, x: 15, y: 4, symbol: "!" }
  ];
}

function createFloorMonsters(floor) {
  return [
    { id: `mon_${floor}_rat`, name: "Giant Rat", symbol: "r", hp: 10 + floor, maxHp: 10 + floor, damage: 2 + floor, x: 14, y: 6, experience: 5 },
    { id: `mon_${floor}_goblin`, name: "Goblin", symbol: "g", hp: 14 + floor * 2, maxHp: 14 + floor * 2, damage: 3 + floor, x: 10, y: 4, experience: 8 }
  ];
}

function findAdjacentMonster(runtime, player) {
  return runtime.monsters.find((monster) => manhattan(monster, player) === 1) || null;
}

function findNearestMonster(runtime, player, maxRange) {
  return runtime.monsters
    .map((monster) => ({ monster, distance: manhattan(monster, player) }))
    .filter((entry) => entry.distance <= maxRange)
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

function applyDamageToMonster(runtime, player, monster, damage, actionText) {
  monster.hp = Math.max(0, monster.hp - damage);
  addLog(runtime, `${player.name} ${actionText} for ${damage}.`);

  if (monster.hp <= 0) {
    player.experiencePoints = (player.experiencePoints || 0) + monster.experience;
    runtime.monsters = runtime.monsters.filter((entry) => entry.id !== monster.id);
    addLog(runtime, `${monster.name} is defeated.`);
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
  runtime.log = [...(runtime.log || []).slice(-7), message];
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

function getMeleeDamage(player) {
  const weapon = getEquippedItem(player, "weapon");
  const weaponName = weapon?.name?.toLowerCase() || "";
  const baseDamage = weaponName.includes("dagger") ? 7 : weaponName.includes("whip") ? 6 : 5;
  return baseDamage + getStatBonus(player.finalStats?.strength);
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function setTile(tiles, x, y, value) {
  const row = tiles[y];
  tiles[y] = `${row.slice(0, x)}${value}${row.slice(x + 1)}`;
}
