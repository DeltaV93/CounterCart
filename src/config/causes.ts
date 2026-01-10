export interface CauseConfig {
  name: string;
  slug: string;
  description: string;
  iconName: string; // Lucide icon name
  color: string; // Tailwind color class
}

export const CAUSES: CauseConfig[] = [
  {
    name: "LGBTQ+ Rights",
    slug: "lgbtq",
    description: "Support organizations fighting for LGBTQ+ equality and rights",
    iconName: "Heart",
    color: "bg-pink-500",
  },
  {
    name: "Climate Action",
    slug: "climate",
    description: "Fund climate change solutions and environmental protection",
    iconName: "Leaf",
    color: "bg-green-500",
  },
  {
    name: "Reproductive Rights",
    slug: "reproductive",
    description: "Support access to reproductive healthcare and rights",
    iconName: "Shield",
    color: "bg-purple-500",
  },
  {
    name: "Racial Justice",
    slug: "racial-justice",
    description: "Combat systemic racism and support equity initiatives",
    iconName: "Users",
    color: "bg-orange-500",
  },
  {
    name: "Gun Safety",
    slug: "gun-safety",
    description: "Support common-sense gun safety legislation and advocacy",
    iconName: "ShieldAlert",
    color: "bg-red-500",
  },
  {
    name: "Workers Rights",
    slug: "workers-rights",
    description: "Support fair wages, unions, and worker protections",
    iconName: "Briefcase",
    color: "bg-blue-500",
  },
];

export const getCauseBySlug = (slug: string): CauseConfig | undefined => {
  return CAUSES.find((cause) => cause.slug === slug);
};
