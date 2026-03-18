export const STAT_KEYS = ["strength", "intelligence", "wisdom", "dexterity", "constitution"];

export const STAT_LABELS = {
  strength: "STR",
  intelligence: "INT",
  wisdom: "WIS",
  dexterity: "DEX",
  constitution: "CON"
};

export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_BUY_BUDGET = 35;

export const POINT_BUY_COSTS = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9
};

export function createDefaultPurchasedStats() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, POINT_BUY_MIN]));
}

export function normalizePurchasedStats(stats) {
  const normalized = {};

  for (const key of STAT_KEYS) {
    const value = Number(stats?.[key]);
    normalized[key] = Number.isFinite(value) ? value : POINT_BUY_MIN;
  }

  return normalized;
}

export function getPointBuyCost(score) {
  return POINT_BUY_COSTS[score] ?? Number.POSITIVE_INFINITY;
}

export function getPointBuyTotal(stats) {
  const normalized = normalizePurchasedStats(stats);
  return STAT_KEYS.reduce((total, key) => total + getPointBuyCost(normalized[key]), 0);
}

export function validatePointBuyStats(stats, budget = POINT_BUY_BUDGET) {
  const normalized = normalizePurchasedStats(stats);
  const errors = [];

  for (const key of STAT_KEYS) {
    if (normalized[key] < POINT_BUY_MIN || normalized[key] > POINT_BUY_MAX) {
      errors.push(`${STAT_LABELS[key]} must be between ${POINT_BUY_MIN} and ${POINT_BUY_MAX}.`);
    }
  }

  const pointsSpent = getPointBuyTotal(normalized);
  if (pointsSpent > budget) {
    errors.push(`Point-buy total ${pointsSpent} exceeds the ${budget}-point limit.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    pointsSpent,
    budget,
    remainingPoints: budget - pointsSpent,
    normalizedStats: normalized
  };
}

export function combineStatBonuses(...bonusSets) {
  const combined = createZeroStatBlock();

  for (const bonusSet of bonusSets) {
    for (const key of STAT_KEYS) {
      combined[key] += Number(bonusSet?.[key] || 0);
    }
  }

  return combined;
}

export function applyStatBonuses(baseStats, ...bonusSets) {
  const normalizedBase = normalizePurchasedStats(baseStats);
  const bonuses = combineStatBonuses(...bonusSets);
  const finalStats = {};

  for (const key of STAT_KEYS) {
    finalStats[key] = normalizedBase[key] + bonuses[key];
  }

  return finalStats;
}

export function calculateStartingHp({ raceHitdie = 0, classHitdie = 0, finalStats }) {
  const hp = Number(raceHitdie || 0) + Number(classHitdie || 0) + (Number(finalStats?.constitution || 0) - 10);
  return Math.max(10, hp);
}

export function calculateExperienceFactor({ raceExp = 100, classExp = 0 }) {
  return Number(raceExp || 100) + Number(classExp || 0);
}

export function createSkillBlock(raceSkills = {}, classSkills = {}) {
  const skillKeys = new Set([...Object.keys(raceSkills), ...Object.keys(classSkills)]);
  const skills = {};

  for (const key of skillKeys) {
    const raceValue = Number(raceSkills[key] || 0);
    const classValue = Number(classSkills[key]?.base ?? classSkills[key] ?? 0);
    skills[key] = raceValue + classValue;
  }

  return skills;
}

function createZeroStatBlock() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
}
