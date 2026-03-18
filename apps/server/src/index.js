import { createServer } from "node:http";
import { URL } from "node:url";
import { WebSocketServer } from "ws";
import { ALL_DIRECTIONS, CHAT_CHANNELS, DIRECTIONS, MESSAGE_TYPES } from "@angband-town-online/protocol";
import { createChatMessage } from "./chat/chat-service.js";
import { buildCharacterTemplate, getAvailableSpellsForClass, getCharacterCreationOptions, getStartingLoadoutForClass } from "./game/angband-character-data.js";
import { sendJson, readJsonBody } from "./http/json.js";
import { createDatabase } from "./storage/database.js";
import {
  assertPlayerTurn,
  castSpell,
  createInstanceRuntime,
  createNextFloorRuntime,
  ensureEncounter,
  equipItem,
  finishPlayerTurn,
  getInstanceTile,
  moveInstancePlayer,
  performMeleeAttack,
  performRangedAttack,
  pickupItem,
  restPlayer,
  serializeInstance
  ,
  syncRuntimePlayer,
  unequipItem
} from "./state/instance-runtime.js";
import {
  createTownState,
  movePlayer,
  removePlayer,
  serializeTown,
  syncTownPlayerStats,
  upsertPlayer
} from "./state/town.js";

const PORT = Number(process.env.PORT || 3001);
const town = createTownState("town_1", 20, 12);
const db = createDatabase();
const instanceRuntimes = new Map();
const sessions = new Map();

const httpServer = createServer((request, response) => {
  handleHttpRequest(request, response).catch((error) => {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  });
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(String(raw));
      handleMessage(socket, message);
    } catch (error) {
      send(socket, {
        type: MESSAGE_TYPES.SYSTEM_ERROR,
        message: "Invalid message payload."
      });
    }
  });

  socket.on("close", () => {
    const session = sessions.get(socket);

    if (!session) return;

    removePlayer(town, session.player.id);
    sessions.delete(socket);

    broadcast({
      type: MESSAGE_TYPES.PRESENCE_LEFT,
      message: `${session.player.name} left town.`,
      town: serializeTown(town)
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Angband Town Online server listening on http://localhost:${PORT}`);
});

async function handleHttpRequest(request, response) {
  if (!request.url || !request.method) {
    return sendJson(response, 400, { error: "Invalid request." });
  }

  if (request.method === "OPTIONS") {
    return sendJson(response, 204, {});
  }

  const url = new URL(request.url, `http://localhost:${PORT}`);

  if (request.method === "GET" && url.pathname === "/") {
    return sendJson(response, 200, {
      name: "angband-town-online-server",
      status: "ok",
      websocket: `ws://localhost:${PORT}`,
      playersOnline: Object.keys(town.players).length,
      supportedMessages: Object.values(MESSAGE_TYPES),
      supportedDirections: ALL_DIRECTIONS
    });
  }

  if (request.method === "GET" && url.pathname === "/api/character-options") {
    return sendJson(response, 200, getCharacterCreationOptions());
  }

  if (request.method === "POST" && url.pathname === "/api/account") {
    try {
      const body = await readJsonBody(request);
      const account = db.getOrCreateAccount(body.accountName);
      const characters = db.listCharactersForAccount(account.id);

      return sendJson(response, 200, {
        account,
        characters
      });
    } catch (error) {
      return sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to load account."
      });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/characters") {
    const body = await readJsonBody(request);

    if (!body.accountId) {
      return sendJson(response, 400, { error: "accountId is required." });
    }

    const account = db.getAccountById(body.accountId);

    if (!account) {
      return sendJson(response, 404, { error: "Account not found." });
    }

    try {
      const template = buildCharacterTemplate({
        characterName: body.characterName,
        raceId: body.raceId,
        classId: body.classId,
        purchasedStats: body.purchasedStats
      });
      const character = db.createCharacter(account.id, template, {
        x: randomInt(0, town.width - 1),
        y: randomInt(0, town.height - 1)
      });

      return sendJson(response, 201, {
        account,
        character,
        characters: db.listCharactersForAccount(account.id)
      });
    } catch (error) {
      return sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to create character."
      });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/party/state") {
    const body = await readJsonBody(request);

    if (!body.characterId) {
      return sendJson(response, 400, { error: "characterId is required." });
    }

    return sendJson(response, 200, {
      party: db.getPartyByCharacter(body.characterId),
      activeInstance: getActiveInstancePayload(body.characterId)
    });
  }

  if (request.method === "POST" && url.pathname === "/api/parties") {
    const body = await readJsonBody(request);

    if (!body.leaderCharacterId) {
      return sendJson(response, 400, { error: "leaderCharacterId is required." });
    }

    try {
      return sendJson(response, 201, {
        party: db.createParty(body.leaderCharacterId, body.partyName || "Dungeon Party")
      });
    } catch (error) {
      return sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to create party."
      });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/parties/join") {
    const body = await readJsonBody(request);

    if (!body.partyId || !body.characterId) {
      return sendJson(response, 400, { error: "partyId and characterId are required." });
    }

    try {
      return sendJson(response, 200, {
        party: db.joinParty(body.partyId, body.characterId)
      });
    } catch (error) {
      return sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to join party."
      });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/parties/leave") {
    const body = await readJsonBody(request);

    if (!body.characterId) {
      return sendJson(response, 400, { error: "characterId is required." });
    }

    return sendJson(response, 200, {
      party: db.leaveParty(body.characterId)
    });
  }

  return sendJson(response, 404, { error: "Not found." });
}

function handleMessage(socket, message) {
  if (message.type === MESSAGE_TYPES.AUTH_LOGIN) {
    return handleLogin(socket, message);
  }

  const session = sessions.get(socket);

  if (!session) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "Login is required before sending commands."
    });
    return;
  }

  if (message.type === MESSAGE_TYPES.TOWN_MOVE) {
    return handleMove(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.TOWN_REST) {
    return handleTownRest(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.CHAT_SEND) {
    return handleChat(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_CREATE) {
    return handleInstanceCreate(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_PICKUP) {
    return handleInstancePickup(socket, session);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_ATTACK) {
    return handleInstanceAttack(socket, session);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_RANGED_ATTACK) {
    return handleInstanceRangedAttack(socket, session);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_CAST_SPELL) {
    return handleInstanceCastSpell(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_REST) {
    return handleInstanceRest(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.CHARACTER_EQUIP) {
    return handleEquip(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.CHARACTER_UNEQUIP) {
    return handleUnequip(socket, session, message);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_RETURN) {
    return handleInstanceReturn(socket, session);
  }

  if (message.type === MESSAGE_TYPES.INSTANCE_USE_STAIRS) {
    return handleUseStairs(socket, session, message);
  }

  send(socket, {
    type: MESSAGE_TYPES.SYSTEM_ERROR,
    message: `Unsupported message type: ${message.type}`
  });
}

function handleLogin(socket, message) {
  const accountId = String(message.accountId || "").trim();
  const characterId = String(message.characterId || "").trim();
  const sessionToken = String(message.sessionToken || "").trim();

  if (!accountId || !characterId) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "accountId and characterId are required."
    });
    return;
  }

  if (sessions.has(socket)) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "This connection is already authenticated."
    });
    return;
  }

  let auth;

  try {
    auth = authenticateCharacter(accountId, characterId, sessionToken);
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to authenticate character."
    });
    return;
  }

  const player = auth.character.mapId === "town_1"
    ? upsertPlayer(town, {
        id: auth.character.id,
        name: auth.character.name,
        x: auth.character.x,
        y: auth.character.y,
        level: auth.character.level,
        hp: auth.character.hp,
        maxHp: auth.character.maxHp
      })
    : {
        id: auth.character.id,
        name: auth.character.name,
        x: auth.character.x,
        y: auth.character.y,
        level: auth.character.level,
        hp: auth.character.hp,
        maxHp: auth.character.maxHp
      };

  sessions.set(socket, {
    player,
    sessionToken: auth.session.token,
    characterId: auth.character.id,
    accountId: auth.account.id,
    currentMapId: auth.character.mapId
  });

  send(socket, {
    type: MESSAGE_TYPES.SESSION_READY,
    playerId: player.id,
    username: auth.account.name,
    sessionToken: auth.session.token,
    character: auth.character,
    account: auth.account
  });

    send(socket, {
      type: MESSAGE_TYPES.PARTY_UPDATED,
      party: db.getPartyByCharacter(auth.character.id),
      activeInstance: getActiveInstancePayload(auth.character.id)
    });

  if (auth.character.mapId === "town_1") {
    send(socket, {
      type: MESSAGE_TYPES.PRESENCE_SNAPSHOT,
      town: serializeTown(town)
    });

    broadcast({
      type: MESSAGE_TYPES.PRESENCE_JOINED,
      message: `${player.name} entered town.`,
      town: serializeTown(town)
    });
  } else {
    send(socket, {
      type: MESSAGE_TYPES.INSTANCE_READY,
      instance: getActiveInstancePayload(auth.character.id)
    });
  }
}

function handleMove(socket, session, message) {
  if (!ALL_DIRECTIONS.includes(message.direction)) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "Invalid movement direction."
    });
    return;
  }

  if (session.currentMapId === "town_1") {
    const player = movePlayer(town, session.player.id, message.direction);
    let updatedCharacter = db.updateCharacterPosition(session.characterId, player.x, player.y);
    updatedCharacter = applyTownRecovery(session, updatedCharacter, 1);
    syncTownPlayerStats(town, session.player.id, updatedCharacter);

    broadcast({
      type: MESSAGE_TYPES.TOWN_STATE,
      town: serializeTown(town)
    });
    send(socket, {
      type: MESSAGE_TYPES.CHARACTER_UPDATED,
      character: updatedCharacter
    });
    return;
  }

  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;

  if (!instance || !runtime) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "No active dungeon run found for movement."
    });
    return;
  }

  try {
    assertPlayerTurn(runtime, session.characterId);
    const result = moveInstancePlayer(runtime, session.characterId, message.direction);

    if (!result.acted) {
      return broadcastInstance(instance.id, serializeInstance(instance, runtime));
    }

    if (result.moved) {
      const updatedCharacter = db.updateCharacterPosition(session.characterId, result.player.x, result.player.y);
      syncRuntimePlayer(runtime, updatedCharacter);
    }

    finishPlayerTurn(runtime, session.characterId);
    persistAllRuntimePlayers(runtime);
    broadcastInstance(instance.id, serializeInstance(instance, runtime));
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to act in the dungeon."
    });
  }
}

function handleTownRest(socket, session, message) {
  if (session.currentMapId !== "town_1") {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "No active dungeon run found."
    });
    return;
  }

  const turns = Math.max(1, Math.min(Number(message.turns || 10), 25));
  const character = db.getCharacterById(session.characterId);
  const updatedCharacter = applyTownRecovery(session, character, turns);

  send(socket, {
    type: MESSAGE_TYPES.CHARACTER_UPDATED,
    character: updatedCharacter
  });
  broadcast({
    type: MESSAGE_TYPES.TOWN_STATE,
    town: serializeTown(town)
  });
  send(socket, {
    type: MESSAGE_TYPES.CHAT_MESSAGE,
    channel: CHAT_CHANNELS.TOWN,
    fromPlayerId: "system",
    fromName: "System",
    text: `${updatedCharacter.name} rests safely in town for ${turns} turns.`
  });
}

function handleChat(socket, session, message) {
  if (message.channel !== CHAT_CHANNELS.TOWN) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "Only town chat is enabled in this prototype."
    });
    return;
  }

  try {
    const chatMessage = createChatMessage({
      channel: CHAT_CHANNELS.TOWN,
      fromPlayerId: session.player.id,
      fromName: session.player.name,
      text: message.text
    });

    broadcast({
      type: MESSAGE_TYPES.CHAT_MESSAGE,
      ...chatMessage
    });
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to send chat."
    });
  }
}

function send(socket, payload) {
  socket.send(JSON.stringify(payload));
}

function broadcast(payload) {
  const body = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(body);
    }
  }
}

function handleInstanceCreate(socket, session, message) {
  if (session.currentMapId !== "town_1") {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "This character is already in a dungeon run."
    });
    return;
  }

  const mode = message.mode === "party" ? "party" : "solo";
  const party = db.getPartyByCharacter(session.characterId);
  let memberIds = [session.characterId];
  let partyId = null;

  if (mode === "party") {
    if (!party) {
      send(socket, {
        type: MESSAGE_TYPES.SYSTEM_ERROR,
        message: "Join or create a party before launching a party run."
      });
      return;
    }

    if (party.leaderCharacterId !== session.characterId) {
      send(socket, {
        type: MESSAGE_TYPES.SYSTEM_ERROR,
        message: "Only the party leader can launch a party run."
      });
      return;
    }

    memberIds = party.members.map((member) => member.characterId);
    partyId = party.id;
  }

  const instance = db.createDungeonInstance({
    leaderCharacterId: session.characterId,
    partyId,
    mode,
    memberIds
  });
  const runtime = ensureInstanceRuntime(instance);
  const payload = serializeInstance(instance, runtime);

  for (const [clientSocket, clientSession] of sessions.entries()) {
    if (!memberIds.includes(clientSession.characterId)) continue;

    removePlayer(town, clientSession.player.id);
    clientSession.currentMapId = instance.id;

    send(clientSocket, {
      type: MESSAGE_TYPES.INSTANCE_READY,
      instance: payload
    });

    send(clientSocket, {
      type: MESSAGE_TYPES.PARTY_UPDATED,
      party: db.getPartyByCharacter(clientSession.characterId),
      activeInstance: payload
    });
  }

  broadcast({
    type: MESSAGE_TYPES.TOWN_STATE,
    town: serializeTown(town)
  });
}

function handleInstancePickup(socket, session) {
  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;
  if (!instance || !runtime) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "No active dungeon run found." });
  }

  try {
    assertPlayerTurn(runtime, session.characterId);
    pickupItem(runtime, session.characterId);
    finishPlayerTurn(runtime, session.characterId);
    persistAllRuntimePlayers(runtime);
    broadcastInstance(instance.id, serializeInstance(instance, runtime));
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to pick up the item."
    });
  }
}

function handleInstanceAttack(socket, session) {
  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;
  if (!instance || !runtime) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "No active dungeon run found." });
  }

  try {
    assertPlayerTurn(runtime, session.characterId);
    performMeleeAttack(runtime, session.characterId);
    finishPlayerTurn(runtime, session.characterId);
    persistAllRuntimePlayers(runtime);
    broadcastInstance(instance.id, serializeInstance(instance, runtime));
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to attack."
    });
  }
}

function handleInstanceRangedAttack(socket, session) {
  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;
  if (!instance || !runtime) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "No active dungeon run found." });
  }

  try {
    assertPlayerTurn(runtime, session.characterId);
    const result = performRangedAttack(runtime, session.characterId);
    if (result.acted) {
      finishPlayerTurn(runtime, session.characterId);
    }
    persistAllRuntimePlayers(runtime);
    broadcastInstance(instance.id, serializeInstance(instance, runtime));
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to make the ranged attack."
    });
  }
}

function handleInstanceCastSpell(socket, session, message) {
  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;
  if (!instance || !runtime) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "No active dungeon run found." });
  }

  try {
    assertPlayerTurn(runtime, session.characterId);
    castSpell(runtime, session.characterId, message.spellId);
    finishPlayerTurn(runtime, session.characterId);
    persistAllRuntimePlayers(runtime);
    broadcastInstance(instance.id, serializeInstance(instance, runtime));
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to cast spell."
    });
  }
}

function handleInstanceRest(socket, session, message) {
  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;
  if (!instance || !runtime) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "No active dungeon run found." });
  }

  try {
    assertPlayerTurn(runtime, session.characterId);
    restPlayer(runtime, session.characterId, message.turns);
    finishPlayerTurn(runtime, session.characterId);
    persistAllRuntimePlayers(runtime);
    broadcastInstance(instance.id, serializeInstance(instance, runtime));
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to rest."
    });
  }
}

function handleEquip(socket, session, message) {
  const character = db.getCharacterById(session.characterId);
  if (!character) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "Character not found." });
  }

  try {
    const source = session.currentMapId === "town_1"
      ? createCharacterStateProxy(character)
      : ensureInstanceRuntime(db.getActiveInstanceByCharacter(session.characterId));
    const runtimePlayerContext = source.players ? source : { players: { [session.characterId]: character }, log: [] };
    equipItem(runtimePlayerContext, session.characterId, message.itemId);
    const updatedCharacter = db.updateCharacterState(session.characterId, {
      inventory: runtimePlayerContext.players[session.characterId].inventory,
      equipmentSlots: runtimePlayerContext.players[session.characterId].equipmentSlots
    });
    if (source.players) {
      syncRuntimePlayer(source, updatedCharacter);
      broadcastInstance(session.currentMapId, serializeInstance(db.getActiveInstanceByCharacter(session.characterId), source));
    }
    send(socket, { type: MESSAGE_TYPES.CHARACTER_UPDATED, character: updatedCharacter });
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to equip item."
    });
  }
}

function handleUnequip(socket, session, message) {
  const character = db.getCharacterById(session.characterId);
  if (!character) {
    return send(socket, { type: MESSAGE_TYPES.SYSTEM_ERROR, message: "Character not found." });
  }

  try {
    const source = session.currentMapId === "town_1"
      ? createCharacterStateProxy(character)
      : ensureInstanceRuntime(db.getActiveInstanceByCharacter(session.characterId));
    const runtimePlayerContext = source.players ? source : { players: { [session.characterId]: character }, log: [] };
    unequipItem(runtimePlayerContext, session.characterId, message.slot);
    const updatedCharacter = db.updateCharacterState(session.characterId, {
      inventory: runtimePlayerContext.players[session.characterId].inventory,
      equipmentSlots: runtimePlayerContext.players[session.characterId].equipmentSlots
    });
    if (source.players) {
      syncRuntimePlayer(source, updatedCharacter);
      broadcastInstance(session.currentMapId, serializeInstance(db.getActiveInstanceByCharacter(session.characterId), source));
    }
    send(socket, { type: MESSAGE_TYPES.CHARACTER_UPDATED, character: updatedCharacter });
  } catch (error) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: error instanceof Error ? error.message : "Unable to unequip item."
    });
  }
}

function handleInstanceReturn(socket, session) {
  if (session.currentMapId === "town_1") {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "This character is already in town."
    });
    return;
  }

  const activeInstance = db.completeDungeonInstanceForCharacter(session.characterId);

  if (!activeInstance) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "No active dungeon instance found for this character."
    });
    return;
  }

  const returnedMembers = activeInstance.members.map((member) => member.characterId);
  const targetSessions = [];

  for (const [clientSocket, clientSession] of sessions.entries()) {
    if (!returnedMembers.includes(clientSession.characterId)) continue;

    const refreshedCharacter = db.getCharacterById(clientSession.characterId);
    const player = upsertPlayer(town, {
      id: refreshedCharacter.id,
      name: refreshedCharacter.name,
      x: refreshedCharacter.x,
      y: refreshedCharacter.y,
      level: refreshedCharacter.level,
      hp: refreshedCharacter.hp,
      maxHp: refreshedCharacter.maxHp
    });

    clientSession.player = player;
    clientSession.currentMapId = "town_1";
    targetSessions.push([clientSocket, clientSession]);
  }

  const townSnapshot = serializeTown(town);
  instanceRuntimes.delete(activeInstance.id);

  for (const [clientSocket, clientSession] of targetSessions) {
    send(clientSocket, {
      type: MESSAGE_TYPES.INSTANCE_RETURNED,
      instanceId: activeInstance.id,
      town: townSnapshot
    });

    send(clientSocket, {
      type: MESSAGE_TYPES.PRESENCE_SNAPSHOT,
      town: townSnapshot
    });

    send(clientSocket, {
      type: MESSAGE_TYPES.PARTY_UPDATED,
      party: db.getPartyByCharacter(clientSession.characterId),
      activeInstance: null
    });
  }

  broadcast({
    type: MESSAGE_TYPES.TOWN_STATE,
    town: townSnapshot
  });
}

function handleUseStairs(socket, session, message) {
  if (session.currentMapId === "town_1") {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "No dungeon stairs are available while in town."
    });
    return;
  }

  const stairDirection = message.stairDirection === "down" ? "down" : "up";
  const instance = db.getActiveInstanceByCharacter(session.characterId);
  const runtime = instance ? ensureInstanceRuntime(instance) : null;

  if (!instance || !runtime) {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "No active dungeon run found."
    });
    return;
  }

  const tile = getInstanceTile(runtime, session.characterId);

  if (stairDirection === "up") {
    if (tile !== ">") {
      send(socket, {
        type: MESSAGE_TYPES.SYSTEM_ERROR,
        message: "Stand on > to go up the stairs."
      });
      return;
    }

    handleInstanceReturn(socket, session);
    return;
  }

  if (tile !== "<") {
    send(socket, {
      type: MESSAGE_TYPES.SYSTEM_ERROR,
      message: "Stand on < to go down the stairs."
    });
    return;
  }

  const nextRuntime = createNextFloorRuntime(instance, runtime);
  ensureEncounter(nextRuntime);
  instanceRuntimes.set(instance.id, nextRuntime);
  const payload = serializeInstance(instance, nextRuntime);

  for (const [clientSocket, clientSession] of sessions.entries()) {
    if (clientSession.currentMapId !== instance.id) continue;
    db.updateCharacterPosition(clientSession.characterId, nextRuntime.players[clientSession.characterId].x, nextRuntime.players[clientSession.characterId].y);
    persistRuntimePlayer(clientSession.characterId, nextRuntime);
    send(clientSocket, {
      type: MESSAGE_TYPES.INSTANCE_READY,
      instance: payload
    });
  }
}

function getActiveInstancePayload(characterId) {
  const instance = db.getActiveInstanceByCharacter(characterId);
  if (!instance) return null;

  const runtime = ensureInstanceRuntime(instance);
  return serializeInstance(instance, runtime);
}

function ensureInstanceRuntime(instance) {
  if (!instanceRuntimes.has(instance.id)) {
    const runtime = createInstanceRuntime(instance);
    ensureEncounter(runtime);
    instanceRuntimes.set(instance.id, runtime);
  }

  return instanceRuntimes.get(instance.id);
}

function persistRuntimePlayer(characterId, runtime) {
  const player = runtime.players[characterId];
  if (!player) return null;

  return db.updateCharacterState(characterId, {
    hp: player.hp,
    maxHp: player.maxHp,
    mana: player.mana,
    maxMana: player.maxMana,
    experiencePoints: player.experiencePoints,
    inventory: player.inventory,
    equipmentSlots: player.equipmentSlots
  });
}

function applyTownRecovery(session, character, turns) {
  if (!character) {
    return null;
  }

  const hpGain = Math.max(1, Number(turns || 1));
  const manaGain = Math.max(1, Number(turns || 1));
  const updatedCharacter = db.updateCharacterState(session.characterId, {
    hp: Math.min(character.maxHp, character.hp + hpGain),
    maxHp: character.maxHp,
    mana: Math.min(character.maxMana ?? 0, (character.mana ?? 0) + manaGain),
    maxMana: character.maxMana ?? 0
  });

  session.player.hp = updatedCharacter.hp;
  session.player.maxHp = updatedCharacter.maxHp;
  syncTownPlayerStats(town, session.player.id, updatedCharacter);
  return updatedCharacter;
}

function persistAllRuntimePlayers(runtime) {
  for (const characterId of Object.keys(runtime.players)) {
    const updatedCharacter = persistRuntimePlayer(characterId, runtime);
    if (updatedCharacter) {
      syncRuntimePlayer(runtime, updatedCharacter);
    }
  }
}

function broadcastInstance(instanceId, payload) {
  for (const [clientSocket, clientSession] of sessions.entries()) {
    if (clientSession.currentMapId !== instanceId) continue;
    send(clientSocket, {
      type: MESSAGE_TYPES.INSTANCE_READY,
      instance: payload
    });
    send(clientSocket, {
      type: MESSAGE_TYPES.CHARACTER_UPDATED,
      character: db.getCharacterById(clientSession.characterId)
    });
  }
}

function createCharacterStateProxy(character) {
  return {
    players: {
      [character.id]: structuredClone(character)
    },
    log: []
  };
}

function authenticateCharacter(accountId, characterId, sessionToken) {
  const account = db.getAccountById(accountId);
  let character = db.getCharacterById(characterId);

  if (!account || !character || character.accountId !== account.id) {
    throw new Error("Invalid account or character.");
  }

  character = ensureCharacterStartingLoadout(character);

  if (sessionToken) {
    const persistedSession = db.getSession(sessionToken);

    if (persistedSession) {
      if (
        persistedSession.accountId === account.id &&
        persistedSession.characterId === character.id
      ) {
        const updatedSession = db.touchSession(sessionToken) || persistedSession;
        return {
          account,
          character,
          session: updatedSession
        };
      }
    }
  }

  return {
    account,
    character,
    session: db.createSession(account.id, character.id)
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ensureCharacterStartingLoadout(character) {
  if (!character) return null;
  const updates = {};

  if ((character.inventory || []).length === 0) {
    const loadout = getStartingLoadoutForClass(character.classId);
    if (loadout.inventory.length) {
      updates.inventory = loadout.inventory;
      updates.equipmentSlots = loadout.equipmentSlots;
    }
  }

  const refreshedSpells = getAvailableSpellsForClass(character.classId, character.level);
  if (refreshedSpells.length > 0) {
    updates.knownSpells = refreshedSpells;
  }

  if (Object.keys(updates).length === 0) {
    return character;
  }

  return db.updateCharacterState(character.id, updates);
}
