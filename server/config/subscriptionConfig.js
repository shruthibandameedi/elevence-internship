// Server-side Subscription Plans Configuration
// Keep all plan prices and benefits in ONE backend configuration so they can easily be changed later.

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "INR",
    formattedPrice: "₹0",
    watchTimeLimitMinutes: 30,
    downloadLimitPerDay: 1,
    premiumAccessLevel: "Limited",
    isAdFree: false,
    adsNotice: "Ads enabled",
    features: [
      "Access to standard free videos",
      "Up to 30 mins watch time limit per session",
      "1 video download per day",
      "Ad-supported experience",
    ],
  },
  bronze: {
    id: "bronze",
    name: "Bronze",
    price: 99,
    currency: "INR",
    formattedPrice: "₹99",
    watchTimeLimitMinutes: 120,
    downloadLimitPerDay: 5,
    premiumAccessLevel: "Moderate",
    isAdFree: false,
    adsNotice: "Reduced ads",
    features: [
      "Access to standard & selected premium videos",
      "Up to 120 mins watch time limit per video",
      "5 video downloads per day",
      "Reduced ad interruptions",
      "HD streaming quality",
    ],
  },
  silver: {
    id: "silver",
    name: "Silver",
    price: 199,
    currency: "INR",
    formattedPrice: "₹199",
    watchTimeLimitMinutes: 300,
    downloadLimitPerDay: 10,
    premiumAccessLevel: "High",
    isAdFree: true,
    adsNotice: "100% Ad-Free",
    features: [
      "Expanded access to premium videos",
      "Up to 300 mins watch time per video",
      "10 video downloads per day",
      "100% Ad-free viewing",
      "Full HD 1080p streaming",
      "Priority customer support",
    ],
  },
  gold: {
    id: "gold",
    name: "Gold",
    price: 499,
    currency: "INR",
    formattedPrice: "₹499",
    watchTimeLimitMinutes: -1, // Unlimited
    downloadLimitPerDay: 25,
    premiumAccessLevel: "Maximum",
    isAdFree: true,
    adsNotice: "100% Ad-Free",
    features: [
      "Maximum access to ALL premium videos",
      "Unlimited watch time",
      "Highest download limit (25 videos/day)",
      "100% Ad-free viewing",
      "Ultra HD 4K streaming",
      "All available premium benefits & perks",
    ],
  },
};

export const PLAN_DOWNLOAD_LIMITS = {
  free: SUBSCRIPTION_PLANS.free.downloadLimitPerDay,
  bronze: SUBSCRIPTION_PLANS.bronze.downloadLimitPerDay,
  silver: SUBSCRIPTION_PLANS.silver.downloadLimitPerDay,
  gold: SUBSCRIPTION_PLANS.gold.downloadLimitPerDay,
  premium: SUBSCRIPTION_PLANS.gold.downloadLimitPerDay,
};

export const getPlanDetails = (planId) => {
  const key = (planId || "free").toLowerCase();
  return SUBSCRIPTION_PLANS[key] || SUBSCRIPTION_PLANS.free;
};
