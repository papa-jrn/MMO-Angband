import { getDirectionDelta } from "./movement.js";

export function createInstanceRuntime(instance) {
  return createFloorRuntime(instance, 1);
}

export function createNextFloorRuntime(instance, previousRuntime) {
  return createFloorRuntime(instance, (previousRuntime?.floor || 1) + 1);
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
        (x === centerLeft || x === centerRight) && y >= roomTop && y <= roomBottom ||
        (y === roomTop || y === roomBottom) && x >= centerLeft && x <= centerRight;

      if (isBorder || isRoomWall) {
        row += "#";
      } else {
        row += ".";
      }
    }

    tiles.push(row);
  }

  setTile(tiles, 9, 6, ">");
  setTile(tiles, 11, 6, "<");

  instance.members.forEach((member, index) => {
    const spawn = {
      x: 6 + index * 2,
      y: 6
    };

    players[member.characterId] = {
      ...member,
      x: spawn.x,
      y: spawn.y
    };
  });

  return {
    id: instance.id,
    mode: instance.mode,
    floor,
    width,
    height,
    tiles,
    players
  };
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

  if (!player) {
    throw new Error(`Unknown instance player: ${characterId}`);
  }

  if (!delta) {
    throw new Error(`Invalid direction: ${direction}`);
  }

  const nextX = player.x + delta.x;
  const nextY = player.y + delta.y;
  const tile = runtime.tiles[nextY]?.[nextX];

  if (!tile || tile === "#") {
    return player;
  }

  player.x = nextX;
  player.y = nextY;
  return player;
}

export function getInstanceTile(runtime, characterId) {
  const player = runtime.players[characterId];
  if (!player) {
    throw new Error(`Unknown instance player: ${characterId}`);
  }

  return runtime.tiles[player.y]?.[player.x] || ".";
}

function setTile(tiles, x, y, value) {
  const row = tiles[y];
  tiles[y] = `${row.slice(0, x)}${value}${row.slice(x + 1)}`;
}
