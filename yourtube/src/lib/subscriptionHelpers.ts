export interface PlanInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  formattedPrice: string;
  watchTimeLimitMinutes: number;
  downloadLimitPerDay: number;
  premiumAccessLevel: string;
  isAdFree: boolean;
  adsNotice: string;
  features: string[];
}

export const isPremiumUser = (plan?: string): boolean => {
  const normalized = (plan || "free").toLowerCase();
  return normalized !== "free";
};

export const isAdFree = (plan?: string): boolean => {
  const normalized = (plan || "free").toLowerCase();
  return normalized === "silver" || normalized === "gold" || normalized === "premium";
};

export const getWatchLimitMinutes = (plan?: string): number => {
  const normalized = (plan || "free").toLowerCase();
  switch (normalized) {
    case "bronze":
      return 120;
    case "silver":
      return 300;
    case "gold":
    case "premium":
      return -1; // Unlimited
    case "free":
    default:
      return 30;
  }
};

export const getDownloadLimit = (plan?: string): number => {
  const normalized = (plan || "free").toLowerCase();
  switch (normalized) {
    case "bronze":
      return 5;
    case "silver":
      return 10;
    case "gold":
    case "premium":
      return 25;
    case "free":
    default:
      return 1;
  }
};
