const STORAGE_KEYS = {
  SESSION_TOKEN: "angband-town-online.session-token",
  ACCOUNT_NAME: "angband-town-online.account-name",
  ACCOUNT_ID: "angband-town-online.account-id",
  CHARACTER_ID: "angband-town-online.character-id"
};

const state = {
  socket: null,
  myPlayerId: null,
  town: { width: 20, height: 12, players: {} },
  sessionToken: localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || "",
  accountName: localStorage.getItem(STORAGE_KEYS.ACCOUNT_NAME) || "",
  accountId: localStorage.getItem(STORAGE_KEYS.ACCOUNT_ID) || "",
  selectedCharacterId: localStorage.getItem(STORAGE_KEYS.CHARACTER_ID) || "",
  characters: [],
  party: null,
  activeInstance: null
};

const KEY_TO_DIRECTION = {
  "1": "southwest",
  "2": "south",
  "3": "southeast",
  "4": "west",
  "6": "east",
  "7": "northwest",
  "8": "north",
  "9": "northeast",
  End: "southwest",
  ArrowDown: "south",
  PageDown: "southeast",
  ArrowLeft: "west",
  ArrowRight: "east",
  Home: "northwest",
  ArrowUp: "north",
  PageUp: "northeast"
};

const elements = {
  grid: document.getElementById("town-grid"),
  presence: document.getElementById("presence-list"),
  partySummary: document.getElementById("party-summary"),
  instanceSummary: document.getElementById("instance-summary"),
  chatLog: document.getElementById("chat-log"),
  connectionStatus: document.getElementById("connection-status"),
  accountName: document.getElementById("account-name"),
  loadAccountButton: document.getElementById("load-account-button"),
  characterSelect: document.getElementById("character-select"),
  newCharacterName: document.getElementById("new-character-name"),
  createCharacterButton: document.getElementById("create-character-button"),
  partyName: document.getElementById("party-name"),
  createPartyButton: document.getElementById("create-party-button"),
  joinPartyId: document.getElementById("join-party-id"),
  joinPartyButton: document.getElementById("join-party-button"),
  leavePartyButton: document.getElementById("leave-party-button"),
  launchSoloButton: document.getElementById("launch-solo-button"),
  launchPartyButton: document.getElementById("launch-party-button"),
  returnTownButton: document.getElementById("return-town-button"),
  useUpStairsButton: document.getElementById("use-up-stairs-button"),
  useDownStairsButton: document.getElementById("use-down-stairs-button"),
  loginButton: document.getElementById("login-button"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send")
};

bootstrap();

async function bootstrap() {
  elements.accountName.value = state.accountName || elements.accountName.value;
  drawWorld();
  renderPresence();
  bindEvents();

  if (elements.accountName.value.trim()) {
    await loadAccount(true);
  }

  if (state.accountId && state.selectedCharacterId) {
    connect();
  }
}

function bindEvents() {
  elements.loadAccountButton.addEventListener("click", () => {
    loadAccount(false);
  });
  elements.createCharacterButton.addEventListener("click", createCharacter);
  elements.characterSelect.addEventListener("change", () => {
    state.selectedCharacterId = elements.characterSelect.value;
    localStorage.setItem(STORAGE_KEYS.CHARACTER_ID, state.selectedCharacterId);
    refreshPartyState();
  });
  elements.createPartyButton.addEventListener("click", createParty);
  elements.joinPartyButton.addEventListener("click", joinParty);
  elements.leavePartyButton.addEventListener("click", leaveParty);
  elements.launchSoloButton.addEventListener("click", () => launchInstance("solo"));
  elements.launchPartyButton.addEventListener("click", () => launchInstance("party"));
  elements.returnTownButton.addEventListener("click", returnToTown);
  elements.useUpStairsButton.addEventListener("click", () => useStairs("up"));
  elements.useDownStairsButton.addEventListener("click", () => useStairs("down"));
  elements.loginButton.addEventListener("click", connect);
  elements.chatSend.addEventListener("click", sendChat);
  elements.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendChat();
  });
  window.addEventListener("keydown", handleMovementKeydown);

  for (const button of document.querySelectorAll("[data-direction]")) {
    button.addEventListener("click", () => {
      sendMove(button.dataset.direction);
    });
  }
}

async function loadAccount(silent) {
  const accountName = elements.accountName.value.trim();

  if (!accountName) {
    setStatus("Choose an account name first.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3001/api/account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ accountName })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load account.");
    }

    state.accountName = payload.account.name;
    state.accountId = payload.account.id;
    state.characters = payload.characters;
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_NAME, state.accountName);
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_ID, state.accountId);

    if (!state.characters.some((character) => character.id === state.selectedCharacterId)) {
      state.selectedCharacterId = state.characters[0]?.id || "";
    }

    if (state.selectedCharacterId) {
      localStorage.setItem(STORAGE_KEYS.CHARACTER_ID, state.selectedCharacterId);
    }

    renderCharacterOptions();
    await refreshPartyState();

    if (!silent) {
      appendChat({
        system: true,
        text: `Loaded account ${state.accountName}.`
      });
    }

    setStatus(`Account ready: ${state.accountName}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load account.");
  }
}

async function createCharacter() {
  if (!state.accountId) {
    setStatus("Load an account before creating a character.");
    return;
  }

  const characterName = elements.newCharacterName.value.trim();

  if (!characterName) {
    setStatus("Choose a character name first.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3001/api/characters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accountId: state.accountId,
        characterName
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to create character.");
    }

    state.characters = payload.characters;
    state.selectedCharacterId = payload.character.id;
    localStorage.setItem(STORAGE_KEYS.CHARACTER_ID, state.selectedCharacterId);
    renderCharacterOptions();
    elements.newCharacterName.value = "";
    await refreshPartyState();
    setStatus(`Created ${payload.character.name}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to create character.");
  }
}

function connect() {
  if (!state.accountId) {
    setStatus("Load an account first.");
    return;
  }

  if (!state.selectedCharacterId) {
    setStatus("Create or select a character first.");
    return;
  }

  if (state.socket && state.socket.readyState <= 1) {
    state.socket.close();
  }

  state.socket = new WebSocket("ws://localhost:3001");
  setStatus("Connecting...");

  state.socket.addEventListener("open", () => {
    setStatus("Connected. Authenticating...");
    send({
      type: "auth.login",
      accountId: state.accountId,
      characterId: state.selectedCharacterId,
      sessionToken: state.sessionToken
    });
  });

  state.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  });

  state.socket.addEventListener("close", () => {
    setStatus("Disconnected");
  });
}

function handleMessage(message) {
  switch (message.type) {
    case "session.ready":
      state.myPlayerId = message.playerId;
      state.sessionToken = message.sessionToken || "";
      state.accountId = message.account?.id || state.accountId;
      state.selectedCharacterId = message.character?.id || state.selectedCharacterId;
      if (state.sessionToken) {
        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, state.sessionToken);
      }
      localStorage.setItem(STORAGE_KEYS.ACCOUNT_ID, state.accountId);
      localStorage.setItem(STORAGE_KEYS.CHARACTER_ID, state.selectedCharacterId);
      setStatus(`Connected to town as ${message.character.name}`);
      appendChat({
        system: true,
        text: `Account ${message.account.name} loaded ${message.character.name}, level ${message.character.level}, HP ${message.character.hp}/${message.character.maxHp}.`
      });
      break;
    case "party.updated":
      state.party = message.party;
      state.activeInstance = message.activeInstance;
      renderPartySummary();
      renderInstanceSummary();
      break;
    case "presence.snapshot":
    case "town.state":
      state.town = message.town;
      drawWorld();
      renderPresence();
      break;
    case "presence.joined":
    case "presence.left":
      state.town = message.town;
      drawWorld();
      renderPresence();
      appendChat({
        system: true,
        text: message.message
      });
      break;
    case "instance.ready":
      state.activeInstance = message.instance;
      drawWorld();
      renderInstanceSummary();
      appendChat({
        system: true,
        text: `Dungeon run launched: ${message.instance.id} (${message.instance.mode}).`
      });
      break;
    case "instance.returned":
      state.activeInstance = null;
      state.town = message.town;
      drawWorld();
      renderPresence();
      renderInstanceSummary();
      appendChat({
        system: true,
        text: `Returned from dungeon run ${message.instanceId}.`
      });
      break;
    case "chat.message":
      appendChat(message);
      break;
    case "system.error":
      appendChat({
        system: true,
        text: message.message
      });
      break;
    default:
      appendChat({
        system: true,
        text: `Unhandled message: ${message.type}`
      });
  }
}

function drawWorld() {
  if (state.activeInstance?.runtime) {
    return drawInstance(state.activeInstance.runtime);
  }

  return drawTown(state.town);
}

function drawTown(town) {
  const width = Math.min(town.width || 20, 20);
  const height = Math.min(town.height || 12, 12);
  const playerByCell = new Map();

  Object.values(town.players || {}).forEach((player) => {
    playerByCell.set(`${player.x},${player.y}`, player);
  });

  drawGrid(width, height, (x, y) => {
    const player = playerByCell.get(`${x},${y}`);

    if (player) {
      return {
        className: "cell player",
        text: player.id === state.myPlayerId ? "@" : "P",
        title: `${player.name} (${player.x}, ${player.y})`
      };
    }

    return {
      className: "cell",
      text: "."
    };
  });
}

function drawInstance(runtime) {
  const playerByCell = new Map();

  Object.values(runtime.players || {}).forEach((player) => {
    playerByCell.set(`${player.x},${player.y}`, player);
  });

  drawGrid(runtime.width, runtime.height, (x, y) => {
    const player = playerByCell.get(`${x},${y}`);

    if (player) {
      return {
        className: "cell player",
        text: player.characterId === state.selectedCharacterId ? "@" : "P",
        title: `${player.name} (${player.x}, ${player.y})`
      };
    }

    const tile = runtime.tiles[y]?.[x] || ".";
    return {
      className: "cell",
      text: tile
    };
  });
}

function drawGrid(width, height, resolveCell) {
  elements.grid.innerHTML = "";

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = document.createElement("div");
      const resolved = resolveCell(x, y);

      cell.className = resolved.className;
      cell.textContent = resolved.text;
      if (resolved.title) {
        cell.title = resolved.title;
      }

      elements.grid.appendChild(cell);
    }
  }
}

function renderCharacterOptions() {
  elements.characterSelect.innerHTML = "";

  if (state.characters.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No characters yet";
    elements.characterSelect.appendChild(option);
    return;
  }

  for (const character of state.characters) {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = `${character.name} Lv.${character.level} HP ${character.hp}/${character.maxHp}`;
    option.selected = character.id === state.selectedCharacterId;
    elements.characterSelect.appendChild(option);
  }
}

function renderPresence() {
  elements.presence.innerHTML = "";
  const players = Object.values(state.town.players || {});

  if (players.length === 0) {
    elements.presence.innerHTML = "<div class='presence-item muted'>No players connected.</div>";
    return;
  }

  players
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((player) => {
      const item = document.createElement("div");
      item.className = "presence-item";
      item.textContent = `${player.name} Lv.${player.level} HP ${player.hp}/${player.maxHp} at (${player.x}, ${player.y})${player.id === state.myPlayerId ? " - you" : ""}`;
      elements.presence.appendChild(item);
    });
}

async function refreshPartyState() {
  renderPartySummary();
  renderInstanceSummary();

  if (!state.selectedCharacterId) {
    state.party = null;
    state.activeInstance = null;
    return;
  }

  try {
    const response = await fetch("http://localhost:3001/api/party/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ characterId: state.selectedCharacterId })
    });

    const payload = await response.json();
    state.party = payload.party;
    state.activeInstance = payload.activeInstance;
    renderPartySummary();
    renderInstanceSummary();
  } catch (error) {
    setStatus("Unable to load party state.");
  }
}

async function createParty() {
  if (!state.selectedCharacterId) {
    setStatus("Select a character first.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3001/api/parties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        leaderCharacterId: state.selectedCharacterId,
        partyName: elements.partyName.value.trim() || "Dungeon Party"
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to create party.");

    state.party = payload.party;
    renderPartySummary();
    setStatus(`Created party ${payload.party.name}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to create party.");
  }
}

async function joinParty() {
  if (!state.selectedCharacterId) {
    setStatus("Select a character first.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3001/api/parties/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        partyId: elements.joinPartyId.value.trim(),
        characterId: state.selectedCharacterId
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to join party.");

    state.party = payload.party;
    renderPartySummary();
    setStatus(`Joined party ${payload.party.name}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to join party.");
  }
}

async function leaveParty() {
  if (!state.selectedCharacterId) {
    setStatus("Select a character first.");
    return;
  }

  const response = await fetch("http://localhost:3001/api/parties/leave", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      characterId: state.selectedCharacterId
    })
  });

  const payload = await response.json();
  state.party = payload.party;
  renderPartySummary();
  setStatus("Left the current party.");
}

function launchInstance(mode) {
  send({
    type: "instance.create",
    mode
  });
}

function returnToTown() {
  send({
    type: "instance.return"
  });
}

function handleMovementKeydown(event) {
  if (event.repeat) return;

  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
    return;
  }

  const direction = KEY_TO_DIRECTION[event.key];
  if (!direction) {
    if (event.key === ">" || event.key === ".") {
      event.preventDefault();
      useStairs("up");
    } else if (event.key === "<" || event.key === ",") {
      event.preventDefault();
      useStairs("down");
    }
    return;
  }

  event.preventDefault();
  sendMove(direction);
}

function sendMove(direction) {
  send({
    type: "town.move",
    direction
  });
}

function useStairs(stairDirection) {
  send({
    type: "instance.use-stairs",
    stairDirection
  });
}

function renderPartySummary() {
  elements.partySummary.innerHTML = "";

  if (!state.party) {
    elements.partySummary.innerHTML = "<div class='presence-item muted'>No active party.</div>";
    return;
  }

  const summary = document.createElement("div");
  summary.className = "presence-item";
  summary.textContent = `Party ${state.party.name} (${state.party.id})`;
  elements.partySummary.appendChild(summary);

  for (const member of state.party.members) {
    const item = document.createElement("div");
    item.className = "presence-item";
    item.textContent = `${member.name}${member.characterId === state.party.leaderCharacterId ? " - leader" : ""}`;
    elements.partySummary.appendChild(item);
  }
}

function renderInstanceSummary() {
  elements.instanceSummary.innerHTML = "";

  if (!state.activeInstance) {
    elements.instanceSummary.innerHTML = "<div class='presence-item muted'>No active dungeon run.</div>";
    return;
  }

  const header = document.createElement("div");
  header.className = "presence-item";
  header.textContent = `Instance ${state.activeInstance.id} (${state.activeInstance.mode})`;
  elements.instanceSummary.appendChild(header);

  for (const member of state.activeInstance.members || []) {
    const item = document.createElement("div");
    item.className = "presence-item";
    item.textContent = `${member.name} in ${member.mapId}`;
    elements.instanceSummary.appendChild(item);
  }
}

function sendChat() {
  const text = elements.chatInput.value.trim();

  if (!text) return;

  send({
    type: "chat.send",
    channel: "town",
    text
  });

  elements.chatInput.value = "";
}

function send(payload) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    appendChat({
      system: true,
      text: "You are not connected."
    });
    return;
  }

  state.socket.send(JSON.stringify(payload));
}

function appendChat(message) {
  const entry = document.createElement("div");
  entry.className = "chat-item";

  if (message.system) {
    entry.innerHTML = `<span class="muted">${escapeHtml(message.text)}</span>`;
  } else {
    entry.innerHTML = `<strong>${escapeHtml(message.fromName || message.fromPlayerId)}</strong>: ${escapeHtml(message.text)}`;
  }

  elements.chatLog.appendChild(entry);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function setStatus(value) {
  elements.connectionStatus.textContent = value;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
