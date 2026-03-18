import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../../..");
const monsterFilePath = resolve(repoRoot, "Angband-4.2.6/lib/gamedata/monster.txt");
const blowMethodsPath = resolve(repoRoot, "Angband-4.2.6/lib/gamedata/blow_methods.txt");
const blowEffectsPath = resolve(repoRoot, "Angband-4.2.6/lib/gamedata/blow_effects.txt");

const blowMethodMap = parseKeyedData(readFileSync(blowMethodsPath, "utf8"));
const blowEffectMap = parseKeyedData(readFileSync(blowEffectsPath, "utf8"));
const monsterEntries = parseMonsterEntries(readFileSync(monsterFilePath, "utf8"));
const monsterMap = new Map(monsterEntries.map((entry) => [entry.name.toLowerCase(), entry]));

const FLOOR_MONSTER_POOLS = {
  1: ["small kobold", "wild dog", "soldier ant"],
  2: ["kobold", "giant green frog", "blue yeek"],
  3: ["novice warrior", "cutpurse", "giant black ant"],
  4: ["giant white rat", "large grey snake", "kobold archer"],
  5: ["large kobold", "skeleton kobold", "green naga"]
};

export function getMonsterCatalog() {
  return monsterEntries.map((entry) => structuredClone(entry));
}

export function getMonsterByName(name) {
  const entry = monsterMap.get(String(name || "").toLowerCase());
  return entry ? structuredClone(entry) : null;
}

export function createFloorMonsterRoster(floor, placements = []) {
  const selected = selectMonsterTemplatesForFloor(floor, Math.max(placements.length, 2));
  return selected.map((template, index) => {
    const placement = placements[index] || placements[placements.length - 1] || { x: 14 + index * 4, y: 8 + index * 3 };
    return createMonsterInstance(template, floor, index, placement);
  });
}

function createMonsterInstance(template, floor, index, placement) {
  const primaryBlow = getPrimaryBlow(template);
  const attackBonus = computeAttackBonus(template, primaryBlow);
  const damage = computeAverageDamage(primaryBlow?.damage) || Math.max(1, Math.floor(template.hitPoints / 8));

  return {
    id: `mon_${floor}_${template.id}_${index + 1}`,
    templateId: template.id,
    name: template.name,
    symbol: template.symbol,
    color: template.color,
    hp: normalizeHitPoints(template.hitPoints),
    maxHp: normalizeHitPoints(template.hitPoints),
    armorClass: normalizeArmorClass(template.armorClass),
    x: placement.x,
    y: placement.y,
    depth: template.depth,
    speed: template.speed,
    experience: Math.max(1, Math.ceil(template.experience * Math.max(1, template.depth || floor) / 4)),
    flags: [...template.flags],
    tags: { ...template.tags },
    blows: structuredClone(template.blows),
    primaryBlow: structuredClone(primaryBlow),
    attackBonus,
    damage,
    conditions: {}
  };
}

function selectMonsterTemplatesForFloor(floor, count) {
  const preferredNames = FLOOR_MONSTER_POOLS[floor] || FLOOR_MONSTER_POOLS[Math.min(5, Math.max(1, floor))] || [];
  const preferred = preferredNames
    .map((name) => monsterMap.get(name))
    .filter(Boolean);

  if (preferred.length >= count) {
    return preferred.slice(0, count);
  }

  const fallback = monsterEntries
    .filter((entry) => !entry.flags.includes("UNIQUE"))
    .filter((entry) => entry.depth <= Math.max(1, floor + 2))
    .filter((entry) => entry.blows.some((blow) => blow.physical || blow.damage))
    .sort((left, right) => left.depth - right.depth || left.rarity - right.rarity || left.name.localeCompare(right.name));

  const selected = [...preferred];
  for (const entry of fallback) {
    if (selected.some((picked) => picked.name === entry.name)) continue;
    selected.push(entry);
    if (selected.length >= count) break;
  }
  return selected.slice(0, count);
}

function parseMonsterEntries(source) {
  const entries = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("name:")) {
      if (current) entries.push(finalizeMonsterEntry(current));
      current = {
        id: slugify(line.slice(5)),
        name: line.slice(5),
        symbol: "m",
        color: "w",
        speed: 110,
        hitPoints: 1,
        armorClass: 10,
        depth: 1,
        rarity: 1,
        experience: 1,
        flags: [],
        blows: [],
        description: ""
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("base:")) {
      current.base = line.slice(5);
      continue;
    }
    if (line.startsWith("glyph:")) {
      current.symbol = line.slice(6);
      continue;
    }
    if (line.startsWith("color:")) {
      current.color = line.slice(6);
      continue;
    }
    if (line.startsWith("speed:")) {
      current.speed = Number(line.slice(6) || 110);
      continue;
    }
    if (line.startsWith("hit-points:")) {
      current.hitPoints = Number(line.slice(11) || 1);
      continue;
    }
    if (line.startsWith("armor-class:")) {
      current.armorClass = Number(line.slice(12) || 10);
      continue;
    }
    if (line.startsWith("depth:")) {
      current.depth = Number(line.slice(6) || 1);
      continue;
    }
    if (line.startsWith("rarity:")) {
      current.rarity = Number(line.slice(7) || 1);
      continue;
    }
    if (line.startsWith("experience:")) {
      current.experience = Number(line.slice(11) || 1);
      continue;
    }
    if (line.startsWith("flags:")) {
      current.flags.push(...line.slice(6).split("|").map((value) => value.trim()).filter(Boolean));
      continue;
    }
    if (line.startsWith("blow:")) {
      const [, methodCode, effectCode = "NONE", damage = "0d0"] = line.split(":");
      const method = blowMethodMap.get(methodCode) || {};
      const effect = blowEffectMap.get(effectCode) || {};
      current.blows.push({
        method: methodCode,
        effect: effectCode,
        damage,
        verb: method.act || `${methodCode.toLowerCase()}s {target}`,
        physical: method.phys === "1",
        missMessage: method.miss === "1",
        power: Number(effect.power || 0),
        description: effect.desc || "attack"
      });
      continue;
    }
    if (line.startsWith("desc:")) {
      current.description = [current.description, line.slice(5).trim()].filter(Boolean).join(" ").trim();
    }
  }

  if (current) entries.push(finalizeMonsterEntry(current));
  return entries;
}

function finalizeMonsterEntry(entry) {
  return {
    ...entry,
    tags: {
      evil: entry.flags.includes("EVIL"),
      undead: entry.flags.includes("UNDEAD"),
      animal: entry.flags.includes("ANIMAL")
    }
  };
}

function parseKeyedData(source) {
  const entries = new Map();
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("name:")) {
      if (current?.name) {
        entries.set(current.name, current);
      }
      current = { name: line.slice(5) };
      continue;
    }

    if (!current) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;
    current[line.slice(0, separator)] = line.slice(separator + 1);
  }

  if (current?.name) {
    entries.set(current.name, current);
  }

  return entries;
}

function computeAttackBonus(template, primaryBlow) {
  const speedBonus = Math.max(0, Math.floor((Number(template.speed || 110) - 110) / 10));
  const blowPowerBonus = Math.floor(Number(primaryBlow?.power || 0) / 10);
  return Math.max(1, Math.floor(Number(template.depth || 1) / 2) + speedBonus + blowPowerBonus);
}

function getPrimaryBlow(template) {
  return template.blows
    .filter((blow) => blow.damage !== "0d0" || blow.physical)
    .sort((left, right) => computeAverageDamage(right.damage) - computeAverageDamage(left.damage))[0]
    || template.blows[0]
    || null;
}

function computeAverageDamage(diceExpression) {
  const match = String(diceExpression || "").match(/^(\d+)d(\d+)$/);
  if (!match) return 0;
  const [, count, sides] = match.map(Number);
  return Math.floor(count * ((sides + 1) / 2));
}

function normalizeArmorClass(value) {
  return Math.max(9, Math.min(24, 10 + Math.round(Number(value || 0) / 6)));
}

function normalizeHitPoints(value) {
  return Math.max(2, Math.ceil(Number(value || 1) * 0.75));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
