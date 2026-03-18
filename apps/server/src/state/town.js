import { getDirectionDelta } from "./movement.js";

export function createTownState(id, width, height) {
  return {
    id,
    kind: "town",
    width,
    height,
    players: {}
  };
}

export function upsertPlayer(town, player) {
  town.players[player.id] = {
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    level: player.level ?? 1,
    hp: player.hp ?? 20,
    maxHp: player.maxHp ?? 20
  };

  return town.players[player.id];
}

export function removePlayer(town, playerId) {
  delete town.players[playerId];
}

export function movePlayer(town, playerId, direction) {
  const player = town.players[playerId];
  const delta = getDirectionDelta(direction);

  if (!player) {
    throw new Error(`Unknown player: ${playerId}`);
  }

  if (!delta) {
    throw new Error(`Invalid direction: ${direction}`);
  }

  player.x = clamp(player.x + delta.x, 0, town.width - 1);
  player.y = clamp(player.y + delta.y, 0, town.height - 1);

  return player;
}

export function syncTownPlayerStats(town, playerId, character) {
  const player = town.players[playerId];
  if (!player || !character) {
    return null;
  }

  player.hp = character.hp ?? player.hp;
  player.maxHp = character.maxHp ?? player.maxHp;
  player.level = character.level ?? player.level;
  return player;
}

export function serializeTown(town) {
  return {
    id: town.id,
    kind: town.kind,
    width: town.width,
    height: town.height,
    players: town.players
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
