const STORAGE_KEYS = {
  SESSION_TOKEN: "angband-town-online.session-token",
  ACCOUNT_NAME: "angband-town-online.account-name",
  ACCOUNT_ID: "angband-town-online.account-id",
  CHARACTER_ID: "angband-town-online.character-id"
};

const STAT_KEYS = ["strength", "intelligence", "wisdom", "dexterity", "constitution"];
const STAT_LABELS = {
  strength: "STR",
  intelligence: "INT",
  wisdom: "WIS",
  dexterity: "DEX",
  constitution: "CON"
};
const POINT_BUY_COSTS = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9
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
  characterOptions: null,
  creation: {
    raceId: "",
    classId: "",
    purchasedStats: {
      strength: 8,
      intelligence: 8,
      wisdom: 8,
      dexterity: 8,
      constitution: 8
    }
  },
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
  partyModalSummary: document.getElementById("party-modal-summary"),
  instanceSummary: document.getElementById("instance-summary"),
  chatLog: document.getElementById("chat-log"),
  connectionStatus: document.getElementById("connection-status"),
  accountName: document.getElementById("account-name"),
  loadAccountButton: document.getElementById("load-account-button"),
  characterSelect: document.getElementById("character-select"),
  openCharacterModalButton: document.getElementById("open-character-modal-button"),
  closeCharacterModalButton: document.getElementById("close-character-modal-button"),
  openPartyModalButton: document.getElementById("open-party-modal-button"),
  closePartyModalButton: document.getElementById("close-party-modal-button"),
  characterModal: document.getElementById("character-modal"),
  partyModal: document.getElementById("party-modal"),
  newCharacterName: document.getElementById("new-character-name"),
  raceSelect: document.getElementById("race-select"),
  classSelect: document.getElementById("class-select"),
  pointBuySummary: document.getElementById("point-buy-summary"),
  creationSummary: document.getElementById("creation-summary"),
  selectedCharacterSummary: document.getElementById("selected-character-summary"),
  inventoryList: document.getElementById("inventory-list"),
  equipmentList: document.getElementById("equipment-list"),
  dungeonLog: document.getElementById("dungeon-log"),
  spellList: document.getElementById("spell-list"),
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
  pickupItemButton: document.getElementById("pickup-item-button"),
  meleeAttackButton: document.getElementById("melee-attack-button"),
  rangedAttackButton: document.getElementById("ranged-attack-button"),
  restButton: document.getElementById("rest-button"),
  loginButton: document.getElementById("login-button"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send")
};

for (const key of STAT_KEYS) {
  elements[`stat${capitalize(key)}`] = document.getElementById(`stat-${key}`);
  elements[`final${capitalize(key)}`] = document.getElementById(`final-${key}`);
}

bootstrap();

async function bootstrap() {
  elements.accountName.value = state.accountName || elements.accountName.value;
  await loadCharacterOptions();
  drawWorld();
  renderPresence();
  bindEvents();

  if (elements.accountName.value.trim()) {
    await loadAccount(true);
  }
}

function bindEvents() {
  elements.loadAccountButton.addEventListener("click", () => {
    loadAccount(false);
  });
  elements.openCharacterModalButton.addEventListener("click", openCharacterModal);
  elements.closeCharacterModalButton.addEventListener("click", closeCharacterModal);
  elements.openPartyModalButton.addEventListener("click", openPartyModal);
  elements.closePartyModalButton.addEventListener("click", closePartyModal);
  elements.characterModal.addEventListener("click", (event) => {
    if (event.target === elements.characterModal) {
      closeCharacterModal();
    }
  });
  elements.partyModal.addEventListener("click", (event) => {
    if (event.target === elements.partyModal) {
      closePartyModal();
    }
  });
  elements.raceSelect.addEventListener("change", () => {
    state.creation.raceId = elements.raceSelect.value;
    renderCreationSummary();
  });
  elements.classSelect.addEventListener("change", () => {
    state.creation.classId = elements.classSelect.value;
    renderCreationSummary();
  });
  elements.createCharacterButton.addEventListener("click", createCharacter);
  elements.characterSelect.addEventListener("change", () => {
    state.selectedCharacterId = elements.characterSelect.value;
    localStorage.setItem(STORAGE_KEYS.CHARACTER_ID, state.selectedCharacterId);
    renderSelectedCharacter();
    renderInventory();
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
  elements.pickupItemButton.addEventListener("click", pickupItem);
  elements.meleeAttackButton.addEventListener("click", meleeAttack);
  elements.rangedAttackButton.addEventListener("click", rangedAttack);
  elements.restButton.addEventListener("click", restPlayer);
  elements.loginButton.addEventListener("click", connect);
  elements.chatSend.addEventListener("click", sendChat);
  elements.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendChat();
  });
  window.addEventListener("keydown", handleMovementKeydown);

  for (const key of STAT_KEYS) {
    elements[`stat${capitalize(key)}`].addEventListener("input", () => {
      state.creation.purchasedStats[key] = Number(elements[`stat${capitalize(key)}`].value || 8);
      renderCreationSummary();
    });
  }

  for (const button of document.querySelectorAll("[data-direction]")) {
    button.addEventListener("click", () => {
      sendMove(button.dataset.direction);
    });
  }

  elements.inventoryList.addEventListener("click", handleInventoryClick);
  elements.spellList.addEventListener("click", handleSpellClick);
}

async function loadCharacterOptions() {
  const response = await fetch("http://localhost:3001/api/character-options");
  const payload = await response.json();
  state.characterOptions = payload;
  state.creation.raceId = payload.races[0]?.id || "";
  state.creation.classId = payload.classes[0]?.id || "";
  renderCharacterCreationOptions();
  renderCreationSummary();
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
    } else {
      localStorage.removeItem(STORAGE_KEYS.CHARACTER_ID);
    }

    renderCharacterOptions();
    await refreshPartyState();

    if (!silent) {
      appendChat({
        system: true,
        text: `Loaded account ${state.accountName}.`
      });
    }

    if (!state.selectedCharacterId) {
      disconnectSocket(false);
      setStatus(`Account ready: ${state.accountName}. Create a character to begin.`);
      return;
    }

    setStatus(`Account ready: ${state.accountName}. Connecting ${getSelectedCharacter()?.name || "character"}...`);
    renderSelectedCharacter();
    renderInventory();
    connect();
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
        characterName,
        raceId: state.creation.raceId,
        classId: state.creation.classId,
        purchasedStats: collectPurchasedStats()
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
    closeCharacterModal();
    renderSelectedCharacter();
    renderInventory();
    await refreshPartyState();
    setStatus(`Created ${payload.character.name}, a ${payload.character.raceName} ${payload.character.className}.`);
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

  disconnectSocket(false);
  const socket = new WebSocket("ws://localhost:3001");
  state.socket = socket;
  setStatus("Connecting...");

  socket.addEventListener("open", () => {
    setStatus("Connected. Authenticating...");
    send({
      type: "auth.login",
      accountId: state.accountId,
      characterId: state.selectedCharacterId,
      sessionToken: state.sessionToken
    });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  });

  socket.addEventListener("close", () => {
    if (state.socket === socket) {
      state.socket = null;
      setStatus("Disconnected");
    }
  });
}

function handleMessage(message) {
  switch (message.type) {
    case "session.ready":
      upsertCharacter(message.character);
      state.myPlayerId = message.playerId;
      state.sessionToken = message.sessionToken || "";
      state.accountId = message.account?.id || state.accountId;
      state.selectedCharacterId = message.character?.id || state.selectedCharacterId;
      if (state.sessionToken) {
        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, state.sessionToken);
      }
      localStorage.setItem(STORAGE_KEYS.ACCOUNT_ID, state.accountId);
      localStorage.setItem(STORAGE_KEYS.CHARACTER_ID, state.selectedCharacterId);
      setStatus(`Connected as ${message.character.name}`);
      appendChat({
        system: true,
        text: `Account ${message.account.name} loaded ${message.character.name}, a level ${message.character.level} ${message.character.raceName || ""} ${message.character.className || ""} with HP ${message.character.hp}/${message.character.maxHp}.`
      });
      break;
    case "party.updated":
      state.party = message.party;
      state.activeInstance = message.activeInstance;
      renderPartySummary();
      renderInstanceSummary();
      break;
    case "character.updated":
      upsertCharacter(message.character);
      renderCharacterOptions();
      renderSelectedCharacter();
      renderInventory();
      renderEquipment();
      renderSpells();
      break;
    case "presence.snapshot":
    case "town.state":
      state.town = message.town;
      drawWorld();
      renderPresence();
      renderSelectedCharacter();
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
      {
      const previousInstanceId = state.activeInstance?.id || "";
      const previousFloor = state.activeInstance?.runtime?.floor || 0;
      state.activeInstance = message.instance;
      drawWorld();
      renderInstanceSummary();
      renderInventory();
      renderEquipment();
      renderSpells();
      renderDungeonLog();
      setStatus(`Adventuring as ${getSelectedCharacter()?.name || "your character"} on floor ${message.instance.runtime?.floor || 1}.`);
      if (previousInstanceId !== message.instance.id) {
        appendChat({
          system: true,
          text: `Dungeon run launched: ${message.instance.id} (${message.instance.mode}).`
        });
      } else if (previousFloor !== (message.instance.runtime?.floor || 0)) {
        appendChat({
          system: true,
          text: `You descend to floor ${message.instance.runtime?.floor || 1}.`
        });
      }
      break;
      }
    case "instance.returned":
      state.activeInstance = null;
      state.town = message.town;
      drawWorld();
      renderPresence();
      renderInstanceSummary();
      renderInventory();
      renderEquipment();
      renderSpells();
      renderDungeonLog();
      setStatus(`Returned to town as ${getSelectedCharacter()?.name || "your character"}.`);
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
  const monsterByCell = new Map();
  const itemByCell = new Map();

  Object.values(runtime.players || {}).forEach((player) => {
    playerByCell.set(`${player.x},${player.y}`, player);
  });
  Object.values(runtime.monsters || []).forEach((monster) => {
    monsterByCell.set(`${monster.x},${monster.y}`, monster);
  });
  Object.values(runtime.items || []).forEach((item) => {
    itemByCell.set(`${item.x},${item.y}`, item);
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

    const monster = monsterByCell.get(`${x},${y}`);
    if (monster) {
      return {
        className: "cell",
        text: monster.symbol || "m",
        title: `${monster.name} HP ${monster.hp}/${monster.maxHp}`
      };
    }

    const item = itemByCell.get(`${x},${y}`);
    if (item) {
      return {
        className: "cell",
        text: item.symbol || "!",
        title: `${item.name} x${item.quantity}`
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
    option.textContent = `${character.name} ${character.raceName || "Adventurer"} ${character.className || ""} Lv.${character.level} HP ${character.hp}/${character.maxHp}`;
    option.selected = character.id === state.selectedCharacterId;
    elements.characterSelect.appendChild(option);
  }

  renderSelectedCharacter();
  renderInventory();
  renderEquipment();
  renderSpells();
  renderDungeonLog();
}

function renderCharacterCreationOptions() {
  elements.raceSelect.innerHTML = "";
  elements.classSelect.innerHTML = "";

  for (const race of state.characterOptions?.races || []) {
    const option = document.createElement("option");
    option.value = race.id;
    option.textContent = `${race.name} (${race.statSummary})`;
    option.selected = race.id === state.creation.raceId;
    elements.raceSelect.appendChild(option);
  }

  for (const playerClass of state.characterOptions?.classes || []) {
    const option = document.createElement("option");
    option.value = playerClass.id;
    option.textContent = `${playerClass.name} (${playerClass.statSummary})`;
    option.selected = playerClass.id === state.creation.classId;
    elements.classSelect.appendChild(option);
  }
}

function renderCreationSummary() {
  if (!state.characterOptions) return;

  const race = state.characterOptions.races.find((entry) => entry.id === state.creation.raceId);
  const playerClass = state.characterOptions.classes.find((entry) => entry.id === state.creation.classId);
  const purchasedStats = collectPurchasedStats();
  const pointsSpent = STAT_KEYS.reduce((total, key) => total + (POINT_BUY_COSTS[purchasedStats[key]] ?? 999), 0);
  const budget = state.characterOptions.pointBuy.budget;
  const remaining = budget - pointsSpent;

  elements.pointBuySummary.textContent = `Point Buy: ${pointsSpent}/${budget} spent${remaining >= 0 ? `, ${remaining} remaining` : `, ${Math.abs(remaining)} over`}`;

  const finalStats = {};
  for (const key of STAT_KEYS) {
    finalStats[key] = purchasedStats[key] + Number(race?.stats?.[key] || 0);
    elements[`final${capitalize(key)}`].textContent = `Final ${STAT_LABELS[key]} ${finalStats[key]} (${formatSigned(Number(race?.stats?.[key] || 0))} race)`;
  }

  const hp = Math.max(10, Number(race?.hitdie || 0) + Number(playerClass?.hitdie || 0) + (finalStats.constitution - 10));
  const experienceFactor = Number(race?.exp || 100) + Number(playerClass?.exp || 0);
  const equipment = (playerClass?.equipment || []).map((item) => {
    const quantity = item.min === item.max ? String(item.min) : `${item.min}-${item.max}`;
    return `${quantity}x ${item.itemName}`;
  });

  elements.creationSummary.innerHTML = "";
  appendSummaryCard(`Race: ${race?.name || "-"}. ${race?.statSummary || ""}`);
  appendSummaryCard(`Class: ${playerClass?.name || "-"}. Class aptitudes: ${playerClass?.statSummary || ""}`);
  appendSummaryCard(`Starting HP: ${hp}. XP Factor: ${experienceFactor}%.`);
  appendSummaryCard(`Starting kit: ${equipment.length > 0 ? equipment.join(", ") : "None listed."}`);
}

function renderSelectedCharacter() {
  elements.selectedCharacterSummary.innerHTML = "";
  const character = getSelectedCharacter();

  if (!character) {
    elements.selectedCharacterSummary.innerHTML = "<div class='summary-card muted'>Create a character to begin.</div>";
    return;
  }

  appendSelectedSummary(`Name: ${character.name}`);
  appendSelectedSummary(`Build: ${character.raceName} ${character.className}`);
  appendSelectedSummary(`Level ${character.level}, HP ${character.hp}/${character.maxHp}, Mana ${character.mana ?? 0}/${character.maxMana ?? 0}, XP ${character.experiencePoints}`);
  appendSelectedSummary(`Stats: ${formatStatsInline(character.finalStats || character.purchasedStats || {})}`);
}

function appendSelectedSummary(text) {
  const item = document.createElement("div");
  item.className = "summary-card";
  item.textContent = text;
  elements.selectedCharacterSummary.appendChild(item);
}

function renderInventory() {
  elements.inventoryList.innerHTML = "";
  const character = getSelectedCharacter();

  if (!character?.inventory?.length) {
    elements.inventoryList.innerHTML = "<div class='presence-item muted'>No inventory yet.</div>";
    return;
  }

  for (const item of character.inventory) {
    const entry = document.createElement("div");
    entry.className = "presence-item inventory-row";
    entry.innerHTML = `<div>${escapeHtml(item.name)} x${item.quantity}${item.equipped ? " - equipped" : ""}</div>`;
    const actions = document.createElement("div");
    actions.className = "inventory-actions";
    const equipable = mapInventorySlotToEquipmentSlot(item.slot);
    if (equipable) {
      const action = document.createElement("button");
      action.dataset.action = item.equipped ? "unequip" : "equip";
      action.dataset.itemId = item.id;
      action.dataset.slotName = equipable;
      action.textContent = item.equipped ? "Unequip" : "Equip";
      actions.appendChild(action);
    }
    entry.appendChild(actions);
    elements.inventoryList.appendChild(entry);
  }
}

function renderEquipment() {
  elements.equipmentList.innerHTML = "";
  const character = getSelectedCharacter();
  const slots = character?.equipmentSlots || {};
  const slotNames = ["weapon", "ranged", "armour", "shield", "light", "book"];

  for (const slot of slotNames) {
    const item = character?.inventory?.find((entry) => entry.id === slots[slot]);
    const entry = document.createElement("div");
    entry.className = "presence-item";
    entry.textContent = `${capitalize(slot)}: ${item ? `${item.name} x${item.quantity}` : "Empty"}`;
    elements.equipmentList.appendChild(entry);
  }
}

function renderSpells() {
  elements.spellList.innerHTML = "";
  const character = getSelectedCharacter();
  const spells = character?.knownSpells || [];

  if (spells.length === 0) {
    elements.spellList.innerHTML = "<div class='presence-item muted'>No spells known.</div>";
    return;
  }

  for (const spell of spells) {
    const entry = document.createElement("div");
    entry.className = "presence-item inventory-row";
    entry.innerHTML = `<div>${escapeHtml(spell.name)} (${spell.mana} mana)</div>`;
    const actions = document.createElement("div");
    actions.className = "inventory-actions";
    const castButton = document.createElement("button");
    castButton.dataset.spellId = spell.id;
    castButton.textContent = "Cast";
    actions.appendChild(castButton);
    entry.appendChild(actions);
    elements.spellList.appendChild(entry);
  }
}

function renderDungeonLog() {
  elements.dungeonLog.innerHTML = "";

  const logEntries = state.activeInstance?.runtime?.log || [];
  if (logEntries.length === 0) {
    elements.dungeonLog.innerHTML = "<div class='presence-item muted'>No dungeon events yet.</div>";
    return;
  }

  for (const line of logEntries) {
    const entry = document.createElement("div");
    entry.className = "presence-item";
    entry.textContent = line;
    elements.dungeonLog.appendChild(entry);
  }

  elements.dungeonLog.scrollTop = elements.dungeonLog.scrollHeight;
}

function appendSummaryCard(text) {
  const item = document.createElement("div");
  item.className = "summary-card";
  item.textContent = text;
  elements.creationSummary.appendChild(item);
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
    if (event.key === "g" || event.key === "G") {
      event.preventDefault();
      pickupItem();
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      restPlayer();
    } else if (event.key === ">" || event.key === ".") {
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
  elements.partyModalSummary.innerHTML = "";

  if (!state.party) {
    elements.partySummary.innerHTML = "<div class='presence-item muted'>No active party.</div>";
    elements.partyModalSummary.innerHTML = "<div class='presence-item muted'>No active party.</div>";
    return;
  }

  const summary = document.createElement("div");
  summary.className = "presence-item";
  summary.textContent = `Party ${state.party.name} (${state.party.id})`;
  elements.partySummary.appendChild(summary);
  elements.partyModalSummary.appendChild(summary.cloneNode(true));

  for (const member of state.party.members) {
    const item = document.createElement("div");
    item.className = "presence-item";
    item.textContent = `${member.name}${member.characterId === state.party.leaderCharacterId ? " - leader" : ""}`;
    elements.partySummary.appendChild(item);
    elements.partyModalSummary.appendChild(item.cloneNode(true));
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

function pickupItem() {
  send({ type: "instance.pickup" });
}

function meleeAttack() {
  send({ type: "instance.attack" });
}

function rangedAttack() {
  send({ type: "instance.ranged-attack" });
}

function restPlayer() {
  if (state.activeInstance?.runtime) {
    send({ type: "instance.rest", turns: 10 });
    return;
  }

  send({ type: "town.rest", turns: 10 });
}

function handleInventoryClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "equip") {
    send({
      type: "character.equip",
      itemId: button.dataset.itemId
    });
    return;
  }

  send({
    type: "character.unequip",
    slot: button.dataset.slotName
  });
}

function handleSpellClick(event) {
  const button = event.target.closest("button[data-spell-id]");
  if (!button) return;

  send({
    type: "instance.cast-spell",
    spellId: button.dataset.spellId
  });
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

function disconnectSocket(updateStatus = true) {
  if (!state.socket) {
    if (updateStatus) {
      setStatus("Disconnected");
    }
    return;
  }

  const socket = state.socket;
  state.socket = null;

  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close();
  }

  if (updateStatus) {
    setStatus("Disconnected");
  }
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

function collectPurchasedStats() {
  const stats = {};

  for (const key of STAT_KEYS) {
    const input = elements[`stat${capitalize(key)}`];
    const value = Number(input.value || 8);
    stats[key] = Math.max(8, Math.min(15, value));
    input.value = String(stats[key]);
  }

  return stats;
}

function getSelectedCharacter() {
  return state.characters.find((character) => character.id === state.selectedCharacterId) || null;
}

function upsertCharacter(character) {
  if (!character?.id) return;
  const index = state.characters.findIndex((entry) => entry.id === character.id);
  if (index === -1) {
    state.characters.unshift(character);
    return;
  }
  state.characters[index] = character;
}

function openCharacterModal() {
  elements.characterModal.dataset.open = "true";
  elements.newCharacterName.focus();
}

function closeCharacterModal() {
  elements.characterModal.dataset.open = "false";
}

function openPartyModal() {
  elements.partyModal.dataset.open = "true";
}

function closePartyModal() {
  elements.partyModal.dataset.open = "false";
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

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}

function formatSigned(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatStatsInline(stats) {
  return STAT_KEYS.map((key) => `${STAT_LABELS[key]} ${stats[key] ?? "-"}`).join(", ");
}

function mapInventorySlotToEquipmentSlot(slot) {
  if (["sword", "hafted"].includes(slot)) return "weapon";
  if (slot === "bow") return "ranged";
  if (slot === "soft armour") return "armour";
  if (slot === "shield") return "shield";
  if (slot === "light") return "light";
  if (["prayer book", "magic book", "nature book", "shadow book"].includes(slot)) return "book";
  return null;
}
