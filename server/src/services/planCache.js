const SubscriptionPlan = require('../models/SubscriptionPlan');
const defaultPlans = require('../config/defaultPlans');
const { FALLBACK_PLAN_TIER } = require('../lib/permissions');

/**
 * In-memory plan cache.
 * Loaded on startup, refreshed when admins create/update/delete plans.
 */
let cache = {
  bySlug: new Map(),  // slug -> plan doc
  list: [],           // array sorted by tier asc
  loadedAt: 0,
};

/**
 * Seed default plans if collection is empty.
 */
async function seedDefaultPlans() {
  const count = await SubscriptionPlan.countDocuments();
  if (count > 0) return false;

  await SubscriptionPlan.insertMany(defaultPlans);
  console.log(`✅ Seeded ${defaultPlans.length} default subscription plans`);
  return true;
}

/**
 * Load all plans into memory.
 */
async function refreshCache() {
  const plans = await SubscriptionPlan.find({ isActive: true }).sort({ tier: 1, order: 1 }).lean();
  cache.bySlug = new Map(plans.map(p => [p.slug, p]));
  cache.list = plans;
  cache.loadedAt = Date.now();
  return plans;
}

/**
 * Initialize: seed (if needed) + refresh.
 */
async function init() {
  await seedDefaultPlans();
  await refreshCache();
}

/**
 * Get plan by slug (returns plain object or null).
 */
function getPlan(slug) {
  return cache.bySlug.get(slug) || null;
}

/**
 * Get tier number for a plan slug. Falls back to defaults if missing.
 */
function getTier(slug) {
  const p = cache.bySlug.get(slug);
  if (p && typeof p.tier === 'number') return p.tier;
  return FALLBACK_PLAN_TIER[slug] ?? 0;
}

/**
 * List all active plans.
 */
function getAllPlans() {
  return cache.list;
}

/**
 * Get only public plans (for Pricing page).
 */
function getPublicPlans() {
  return cache.list.filter(p => p.isPublic !== false);
}

/**
 * Check if plan A meets the tier of plan B (A >= B).
 */
function planMeetsTier(userPlanSlug, requiredPlanSlug) {
  return getTier(userPlanSlug) >= getTier(requiredPlanSlug);
}

/**
 * Check if a plan grants access to a specific feature.
 */
function hasFeature(planSlug, featureKey) {
  const p = cache.bySlug.get(planSlug);
  if (!p || !p.features) return false;
  return p.features[featureKey] === true;
}

module.exports = {
  init,
  refreshCache,
  getPlan,
  getTier,
  getAllPlans,
  getPublicPlans,
  planMeetsTier,
  hasFeature,
};
