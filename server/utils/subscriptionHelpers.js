import { SUBSCRIPTION_PLANS, getPlanDetails } from "../config/subscriptionConfig.js";

/**
 * Check if the given user plan is a paid/premium user plan (Bronze, Silver, Gold, Premium)
 * @param {string} plan 
 * @returns {boolean}
 */
export const isPremiumUser = (plan) => {
  const normalized = (plan || "free").toLowerCase();
  return normalized !== "free";
};

/**
 * Check if user has remaining download access based on current daily usage
 * @param {string} plan 
 * @param {number} todayDownloadCount 
 * @returns {boolean}
 */
export const hasDownloadAccess = (plan, todayDownloadCount = 0) => {
  const planInfo = getPlanDetails(plan);
  return todayDownloadCount < planInfo.downloadLimitPerDay;
};

/**
 * Get watch time limit in minutes for a given plan (-1 for unlimited)
 * @param {string} plan 
 * @returns {number}
 */
export const getWatchLimit = (plan) => {
  const planInfo = getPlanDetails(plan);
  return planInfo.watchTimeLimitMinutes;
};

/**
 * Check if plan is ad-free
 * @param {string} plan 
 * @returns {boolean}
 */
export const isAdFree = (plan) => {
  const planInfo = getPlanDetails(plan);
  return planInfo.isAdFree;
};
