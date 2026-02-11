/**
 * Badge Configuration
 *
 * Badges are earned through challenges, milestones, and special events.
 * Each badge has a unique ID that is stored in the user's badges array.
 */

export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  iconName: string; // Lucide icon name
  color: string; // Tailwind color class
  tier: "bronze" | "silver" | "gold" | "platinum";
  category: "challenge" | "milestone" | "event" | "special";
  /** If tied to a challenge, the challenge slug */
  challengeSlug?: string;
  /** For milestone badges, the threshold to earn */
  threshold?: number;
  /** Whether this badge is currently earnable */
  isActive: boolean;
}

export const BADGES: BadgeConfig[] = [
  // === CHALLENGE BADGES ===
  {
    id: "PRIDE_CHAMPION_2024",
    name: "Pride Champion 2024",
    description: "Participated in the Pride Month 2024 Offset Challenge",
    iconName: "Heart",
    color: "bg-pink-500",
    tier: "gold",
    category: "challenge",
    challengeSlug: "pride-month-2024",
    isActive: true,
  },
  {
    id: "EARTH_DAY_WARRIOR_2024",
    name: "Earth Day Warrior 2024",
    description: "Participated in the Earth Day 2024 Offset Challenge",
    iconName: "Leaf",
    color: "bg-green-500",
    tier: "gold",
    category: "challenge",
    challengeSlug: "earth-day-2024",
    isActive: true,
  },
  {
    id: "PRIDE_CHAMPION_2025",
    name: "Pride Champion 2025",
    description: "Participated in the Pride Month 2025 Offset Challenge",
    iconName: "Heart",
    color: "bg-pink-500",
    tier: "gold",
    category: "challenge",
    challengeSlug: "pride-month-2025",
    isActive: true,
  },
  {
    id: "EARTH_DAY_WARRIOR_2025",
    name: "Earth Day Warrior 2025",
    description: "Participated in the Earth Day 2025 Offset Challenge",
    iconName: "Leaf",
    color: "bg-green-500",
    tier: "gold",
    category: "challenge",
    challengeSlug: "earth-day-2025",
    isActive: true,
  },
  {
    id: "GIVING_TUESDAY_2024",
    name: "Giving Tuesday 2024",
    description: "Participated in Giving Tuesday 2024",
    iconName: "Gift",
    color: "bg-orange-500",
    tier: "gold",
    category: "challenge",
    challengeSlug: "giving-tuesday-2024",
    isActive: true,
  },

  // === MILESTONE BADGES ===
  {
    id: "FIRST_OFFSET",
    name: "First Offset",
    description: "Made your first counter-donation",
    iconName: "Sparkles",
    color: "bg-accent",
    tier: "bronze",
    category: "milestone",
    threshold: 1,
    isActive: true,
  },
  {
    id: "CONSISTENT_GIVER",
    name: "Consistent Giver",
    description: "Made donations in 3 consecutive months",
    iconName: "Calendar",
    color: "bg-blue-500",
    tier: "silver",
    category: "milestone",
    threshold: 3,
    isActive: true,
  },
  {
    id: "CENTURY_CLUB",
    name: "Century Club",
    description: "Donated over $100 in counter-donations",
    iconName: "Trophy",
    color: "bg-yellow-500",
    tier: "gold",
    category: "milestone",
    threshold: 100,
    isActive: true,
  },
  {
    id: "FIVE_HUNDRED_CLUB",
    name: "$500 Club",
    description: "Donated over $500 in counter-donations",
    iconName: "Crown",
    color: "bg-purple-500",
    tier: "platinum",
    category: "milestone",
    threshold: 500,
    isActive: true,
  },
  {
    id: "THOUSAND_CLUB",
    name: "$1,000 Club",
    description: "Donated over $1,000 in counter-donations",
    iconName: "Star",
    color: "bg-amber-500",
    tier: "platinum",
    category: "milestone",
    threshold: 1000,
    isActive: true,
  },

  // === EVENT BADGES ===
  {
    id: "EARLY_ADOPTER",
    name: "Early Adopter",
    description: "Joined CounterCart in its first year",
    iconName: "Rocket",
    color: "bg-indigo-500",
    tier: "gold",
    category: "event",
    isActive: true,
  },
  {
    id: "FOUNDING_MEMBER",
    name: "Founding Member",
    description: "One of the first 100 members",
    iconName: "Shield",
    color: "bg-primary",
    tier: "platinum",
    category: "event",
    isActive: false, // No longer earnable
  },

  // === SPECIAL BADGES ===
  {
    id: "MULTI_CAUSE_HERO",
    name: "Multi-Cause Hero",
    description: "Supporting 3 or more causes simultaneously",
    iconName: "Users",
    color: "bg-teal-500",
    tier: "silver",
    category: "special",
    threshold: 3,
    isActive: true,
  },
  {
    id: "REFERRAL_CHAMPION",
    name: "Referral Champion",
    description: "Referred 5 or more friends to CounterCart",
    iconName: "Share2",
    color: "bg-cyan-500",
    tier: "gold",
    category: "special",
    threshold: 5,
    isActive: true,
  },
  {
    id: "CLUB_LEADER",
    name: "Club Leader",
    description: "Top contributor in a Cause Club",
    iconName: "Medal",
    color: "bg-rose-500",
    tier: "gold",
    category: "special",
    isActive: true,
  },
];

/**
 * Get a badge configuration by ID
 */
export function getBadgeById(id: string): BadgeConfig | undefined {
  return BADGES.find((badge) => badge.id === id);
}

/**
 * Get all badges for a specific challenge
 */
export function getBadgesForChallenge(challengeSlug: string): BadgeConfig[] {
  return BADGES.filter((badge) => badge.challengeSlug === challengeSlug);
}

/**
 * Get all milestone badges
 */
export function getMilestoneBadges(): BadgeConfig[] {
  return BADGES.filter((badge) => badge.category === "milestone");
}

/**
 * Get all active badges
 */
export function getActiveBadges(): BadgeConfig[] {
  return BADGES.filter((badge) => badge.isActive);
}

/**
 * Get badges by tier
 */
export function getBadgesByTier(
  tier: BadgeConfig["tier"]
): BadgeConfig[] {
  return BADGES.filter((badge) => badge.tier === tier);
}

/**
 * Get badge tier color class
 */
export function getBadgeTierColor(tier: BadgeConfig["tier"]): string {
  switch (tier) {
    case "bronze":
      return "text-amber-700";
    case "silver":
      return "text-gray-400";
    case "gold":
      return "text-yellow-500";
    case "platinum":
      return "text-purple-400";
    default:
      return "text-gray-500";
  }
}
