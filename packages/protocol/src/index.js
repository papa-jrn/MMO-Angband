export const MESSAGE_TYPES = {
  AUTH_LOGIN: "auth.login",
  SESSION_READY: "session.ready",
  PRESENCE_SNAPSHOT: "presence.snapshot",
  PRESENCE_JOINED: "presence.joined",
  PRESENCE_LEFT: "presence.left",
  PARTY_UPDATED: "party.updated",
  TOWN_MOVE: "town.move",
  TOWN_STATE: "town.state",
  INSTANCE_CREATE: "instance.create",
  INSTANCE_USE_STAIRS: "instance.use-stairs",
  INSTANCE_READY: "instance.ready",
  INSTANCE_RETURN: "instance.return",
  INSTANCE_RETURNED: "instance.returned",
  INSTANCE_ENTER: "instance.enter",
  CHAT_SEND: "chat.send",
  CHAT_MESSAGE: "chat.message",
  SYSTEM_ERROR: "system.error"
};

export const CHAT_CHANNELS = {
  TOWN: "town",
  PARTY: "party",
  INSTANCE: "instance",
  WHISPER: "whisper"
};

export const DIRECTIONS = ["north", "south", "west", "east"];
export const ALL_DIRECTIONS = [
  "northwest",
  "north",
  "northeast",
  "west",
  "east",
  "southwest",
  "south",
  "southeast"
];

export const STORAGE_KEYS = {
  SESSION_TOKEN: "angband-town-online.session-token",
  ACCOUNT_NAME: "angband-town-online.account-name",
  ACCOUNT_ID: "angband-town-online.account-id",
  CHARACTER_ID: "angband-town-online.character-id"
};
