import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = resolve(process.cwd(), "apps/server/data/game.sqlite");

export function createDatabase() {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      level INTEGER NOT NULL,
      hp INTEGER NOT NULL,
      max_hp INTEGER NOT NULL,
      map_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      leader_character_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (leader_character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS party_members (
      party_id TEXT NOT NULL,
      character_id TEXT NOT NULL UNIQUE,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (party_id, character_id),
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS dungeon_instances (
      id TEXT PRIMARY KEY,
      party_id TEXT,
      leader_character_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (leader_character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS instance_members (
      instance_id TEXT NOT NULL,
      character_id TEXT NOT NULL UNIQUE,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (instance_id, character_id),
      FOREIGN KEY (instance_id) REFERENCES dungeon_instances(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );
  `);

  const statements = createStatements(db);

  return {
    getOrCreateAccount(accountName) {
      const normalizedName = normalizeName(accountName, 32);
      const existing = statements.selectAccountByName.get(normalizedName);

      if (existing) {
        statements.touchAccount.run(nowIso(), existing.id);
        return statements.selectAccountById.get(existing.id);
      }

      const account = {
        id: createId("acct", normalizedName),
        name: normalizedName,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      statements.insertAccount.run(account.id, account.name, account.createdAt, account.updatedAt);
      return statements.selectAccountById.get(account.id);
    },

    getAccountById(accountId) {
      return statements.selectAccountById.get(accountId) || null;
    },

    listCharactersForAccount(accountId) {
      return statements.selectCharactersByAccount.all(accountId);
    },

    createCharacter(accountId, characterName, initialPosition) {
      const name = normalizeName(characterName, 24);
      const now = nowIso();

      if (statements.selectCharacterByName.get(name)) {
        throw new Error("Character name is already taken.");
      }

      const character = {
        id: createId("char", name),
        accountId,
        name,
        level: 1,
        hp: 20,
        maxHp: 20,
        mapId: "town_1",
        x: initialPosition.x,
        y: initialPosition.y,
        createdAt: now,
        updatedAt: now
      };

      statements.insertCharacter.run(
        character.id,
        character.accountId,
        character.name,
        character.level,
        character.hp,
        character.maxHp,
        character.mapId,
        character.x,
        character.y,
        character.createdAt,
        character.updatedAt
      );

      return statements.selectCharacterById.get(character.id);
    },

    getCharacterById(characterId) {
      return statements.selectCharacterById.get(characterId) || null;
    },

    updateCharacterPosition(characterId, x, y) {
      statements.updateCharacterPosition.run(x, y, nowIso(), characterId);
      return statements.selectCharacterById.get(characterId);
    },

    updateCharacterMap(characterId, mapId) {
      statements.updateCharacterMap.run(mapId, nowIso(), characterId);
      return statements.selectCharacterById.get(characterId);
    },

    createSession(accountId, characterId) {
      const session = {
        token: createToken(),
        accountId,
        characterId,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      statements.insertSession.run(
        session.token,
        session.accountId,
        session.characterId,
        session.createdAt,
        session.updatedAt
      );

      return statements.selectSessionByToken.get(session.token);
    },

    getSession(token) {
      return statements.selectSessionByToken.get(token) || null;
    },

    touchSession(token) {
      statements.touchSession.run(nowIso(), token);
      return statements.selectSessionByToken.get(token) || null;
    },

    getPartyByCharacter(characterId) {
      const membership = statements.selectPartyByCharacter.get(characterId);
      if (!membership) return null;

      return {
        id: membership.id,
        name: membership.name,
        leaderCharacterId: membership.leaderCharacterId,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
        members: statements.selectPartyMembers.all(membership.id)
      };
    },

    createParty(leaderCharacterId, partyName) {
      if (this.getPartyByCharacter(leaderCharacterId)) {
        throw new Error("Character is already in a party.");
      }

      const now = nowIso();
      const party = {
        id: createId("party", partyName || leaderCharacterId),
        name: normalizeName(partyName || "Dungeon Party", 32),
        leaderCharacterId,
        createdAt: now,
        updatedAt: now
      };

      statements.insertParty.run(
        party.id,
        party.name,
        party.leaderCharacterId,
        party.createdAt,
        party.updatedAt
      );
      statements.insertPartyMember.run(party.id, leaderCharacterId, now);

      return this.getPartyByCharacter(leaderCharacterId);
    },

    joinParty(partyId, characterId) {
      const party = statements.selectPartyById.get(partyId);

      if (!party) {
        throw new Error("Party not found.");
      }

      if (this.getPartyByCharacter(characterId)) {
        throw new Error("Character is already in a party.");
      }

      statements.insertPartyMember.run(party.id, characterId, nowIso());
      statements.touchParty.run(nowIso(), party.id);
      return this.getPartyByCharacter(characterId);
    },

    leaveParty(characterId) {
      const party = this.getPartyByCharacter(characterId);
      if (!party) return null;

      statements.deletePartyMember.run(characterId);

      const remaining = statements.selectPartyMembers.all(party.id);
      if (remaining.length === 0) {
        statements.deleteParty.run(party.id);
        return null;
      }

      if (party.leaderCharacterId === characterId) {
        statements.updatePartyLeader.run(remaining[0].characterId, nowIso(), party.id);
      } else {
        statements.touchParty.run(nowIso(), party.id);
      }

      return this.getPartyByCharacter(remaining[0].characterId);
    },

    createDungeonInstance({ leaderCharacterId, partyId, mode, memberIds }) {
      const now = nowIso();
      const instance = {
        id: createId("instance", `${mode}-${leaderCharacterId}`),
        partyId: partyId || null,
        leaderCharacterId,
        mode,
        status: "active",
        createdAt: now,
        updatedAt: now
      };

      statements.insertDungeonInstance.run(
        instance.id,
        instance.partyId,
        instance.leaderCharacterId,
        instance.mode,
        instance.status,
        instance.createdAt,
        instance.updatedAt
      );

      for (const memberId of memberIds) {
        statements.insertInstanceMember.run(instance.id, memberId, now);
        statements.updateCharacterMap.run(instance.id, now, memberId);
      }

      return this.getDungeonInstance(instance.id);
    },

    getDungeonInstance(instanceId) {
      const instance = statements.selectDungeonInstanceById.get(instanceId);
      if (!instance) return null;

      return {
        ...instance,
        members: statements.selectInstanceMembers.all(instance.id)
      };
    },

    getActiveInstanceByCharacter(characterId) {
      const membership = statements.selectDungeonInstanceByCharacter.get(characterId);
      if (!membership) return null;
      return this.getDungeonInstance(membership.id);
    },

    completeDungeonInstanceForCharacter(characterId) {
      const instance = this.getActiveInstanceByCharacter(characterId);
      if (!instance) return null;

      const completedInstance = {
        ...instance,
        status: "returned"
      };

      for (const member of instance.members) {
        statements.deleteInstanceMember.run(member.characterId);
        statements.updateCharacterMap.run("town_1", nowIso(), member.characterId);
      }

      statements.updateDungeonInstanceStatus.run("returned", nowIso(), instance.id);
      return completedInstance;
    }
  };
}

function createStatements(db) {
  return {
    selectAccountByName: db.prepare("SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM accounts WHERE lower(name) = lower(?)"),
    selectAccountById: db.prepare("SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM accounts WHERE id = ?"),
    insertAccount: db.prepare("INSERT INTO accounts (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"),
    touchAccount: db.prepare("UPDATE accounts SET updated_at = ? WHERE id = ?"),

    selectCharactersByAccount: db.prepare(`
      SELECT id, account_id AS accountId, name, level, hp, max_hp AS maxHp, map_id AS mapId, x, y, created_at AS createdAt, updated_at AS updatedAt
      FROM characters
      WHERE account_id = ?
      ORDER BY updated_at DESC, name ASC
    `),
    selectCharacterById: db.prepare(`
      SELECT id, account_id AS accountId, name, level, hp, max_hp AS maxHp, map_id AS mapId, x, y, created_at AS createdAt, updated_at AS updatedAt
      FROM characters
      WHERE id = ?
    `),
    selectCharacterByName: db.prepare(`
      SELECT id, account_id AS accountId, name, level, hp, max_hp AS maxHp, map_id AS mapId, x, y, created_at AS createdAt, updated_at AS updatedAt
      FROM characters
      WHERE lower(name) = lower(?)
    `),
    insertCharacter: db.prepare(`
      INSERT INTO characters (id, account_id, name, level, hp, max_hp, map_id, x, y, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateCharacterPosition: db.prepare("UPDATE characters SET x = ?, y = ?, updated_at = ? WHERE id = ?"),
    updateCharacterMap: db.prepare("UPDATE characters SET map_id = ?, updated_at = ? WHERE id = ?"),

    insertSession: db.prepare(`
      INSERT INTO sessions (token, account_id, character_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    selectSessionByToken: db.prepare(`
      SELECT token, account_id AS accountId, character_id AS characterId, created_at AS createdAt, updated_at AS updatedAt
      FROM sessions
      WHERE token = ?
    `),
    touchSession: db.prepare("UPDATE sessions SET updated_at = ? WHERE token = ?"),

    insertParty: db.prepare(`
      INSERT INTO parties (id, name, leader_character_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    selectPartyById: db.prepare(`
      SELECT id, name, leader_character_id AS leaderCharacterId, created_at AS createdAt, updated_at AS updatedAt
      FROM parties
      WHERE id = ?
    `),
    selectPartyByCharacter: db.prepare(`
      SELECT p.id, p.name, p.leader_character_id AS leaderCharacterId, p.created_at AS createdAt, p.updated_at AS updatedAt
      FROM parties p
      JOIN party_members pm ON pm.party_id = p.id
      WHERE pm.character_id = ?
    `),
    selectPartyMembers: db.prepare(`
      SELECT c.id AS characterId, c.name, c.level, c.hp, c.max_hp AS maxHp, c.map_id AS mapId
      FROM party_members pm
      JOIN characters c ON c.id = pm.character_id
      WHERE pm.party_id = ?
      ORDER BY c.name ASC
    `),
    insertPartyMember: db.prepare(`
      INSERT INTO party_members (party_id, character_id, joined_at)
      VALUES (?, ?, ?)
    `),
    deletePartyMember: db.prepare("DELETE FROM party_members WHERE character_id = ?"),
    deleteParty: db.prepare("DELETE FROM parties WHERE id = ?"),
    updatePartyLeader: db.prepare("UPDATE parties SET leader_character_id = ?, updated_at = ? WHERE id = ?"),
    touchParty: db.prepare("UPDATE parties SET updated_at = ? WHERE id = ?"),

    insertDungeonInstance: db.prepare(`
      INSERT INTO dungeon_instances (id, party_id, leader_character_id, mode, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    insertInstanceMember: db.prepare(`
      INSERT INTO instance_members (instance_id, character_id, joined_at)
      VALUES (?, ?, ?)
    `),
    selectDungeonInstanceById: db.prepare(`
      SELECT id, party_id AS partyId, leader_character_id AS leaderCharacterId, mode, status, created_at AS createdAt, updated_at AS updatedAt
      FROM dungeon_instances
      WHERE id = ?
    `),
    selectInstanceMembers: db.prepare(`
      SELECT c.id AS characterId, c.name, c.level, c.hp, c.max_hp AS maxHp, c.map_id AS mapId
      FROM instance_members im
      JOIN characters c ON c.id = im.character_id
      WHERE im.instance_id = ?
      ORDER BY c.name ASC
    `),
    selectDungeonInstanceByCharacter: db.prepare(`
      SELECT di.id
      FROM dungeon_instances di
      JOIN instance_members im ON im.instance_id = di.id
      WHERE im.character_id = ? AND di.status = 'active'
    `),
    deleteInstanceMember: db.prepare("DELETE FROM instance_members WHERE character_id = ?"),
    updateDungeonInstanceStatus: db.prepare("UPDATE dungeon_instances SET status = ?, updated_at = ? WHERE id = ?")
  };
}

function normalizeName(value, maxLength) {
  const trimmed = String(value || "").trim().slice(0, maxLength);

  if (!trimmed) {
    throw new Error("Name is required.");
  }

  return trimmed;
}

function createId(prefix, value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${prefix}_${slug || "entry"}_${Date.now().toString(36)}`;
}

function createToken() {
  return `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}
