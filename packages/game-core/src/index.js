export function createBounds(width, height) {
  return {
    width,
    height
  };
}

export {
  STAT_KEYS,
  STAT_LABELS,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
  POINT_BUY_BUDGET,
  POINT_BUY_COSTS,
  createDefaultPurchasedStats,
  normalizePurchasedStats,
  getPointBuyCost,
  getPointBuyTotal,
  validatePointBuyStats,
  combineStatBonuses,
  applyStatBonuses,
  calculateStartingHp,
  calculateExperienceFactor,
  createSkillBlock
} from "./character-creation.js";
