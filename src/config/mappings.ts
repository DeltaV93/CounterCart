export interface BusinessMappingConfig {
  merchantPattern: string; // Pattern to match (case-insensitive)
  merchantName: string; // Display name
  causeSlug: string;
  charitySlug: string; // Every.org slug
  charityName: string;
  reason: string;
}

export const BUSINESS_MAPPINGS: BusinessMappingConfig[] = [
  // LGBTQ+ Rights
  {
    merchantPattern: "CHICK-FIL-A",
    merchantName: "Chick-fil-A",
    causeSlug: "lgbtq",
    charitySlug: "the-trevor-project",
    charityName: "The Trevor Project",
    reason: "History of donations to anti-LGBTQ+ organizations",
  },
  {
    merchantPattern: "HOBBY LOBBY",
    merchantName: "Hobby Lobby",
    causeSlug: "lgbtq",
    charitySlug: "lambda-legal",
    charityName: "Lambda Legal",
    reason: "Support for anti-LGBTQ+ legislation",
  },
  {
    merchantPattern: "SALVATION ARMY",
    merchantName: "Salvation Army",
    causeSlug: "lgbtq",
    charitySlug: "the-trevor-project",
    charityName: "The Trevor Project",
    reason: "Historical discrimination against LGBTQ+ individuals",
  },

  // Climate Action
  {
    merchantPattern: "EXXON",
    merchantName: "ExxonMobil",
    causeSlug: "climate",
    charitySlug: "environmental-defense-fund",
    charityName: "Environmental Defense Fund",
    reason: "Climate change denial funding and lobbying",
  },
  {
    merchantPattern: "SHELL",
    merchantName: "Shell",
    causeSlug: "climate",
    charitySlug: "rainforest-alliance",
    charityName: "Rainforest Alliance",
    reason: "Major fossil fuel producer and environmental impact",
  },
  {
    merchantPattern: "BP ",
    merchantName: "BP",
    causeSlug: "climate",
    charitySlug: "350-org",
    charityName: "350.org",
    reason: "Major oil company with significant environmental impact",
  },
  {
    merchantPattern: "CHEVRON",
    merchantName: "Chevron",
    causeSlug: "climate",
    charitySlug: "sierra-club-foundation",
    charityName: "Sierra Club Foundation",
    reason: "Fossil fuel extraction and environmental violations",
  },

  // Reproductive Rights
  {
    merchantPattern: "HOBBY LOBBY",
    merchantName: "Hobby Lobby",
    causeSlug: "reproductive",
    charitySlug: "planned-parenthood-federation-of-america-inc",
    charityName: "Planned Parenthood",
    reason: "Opposition to contraception coverage and reproductive rights",
  },

  // Workers Rights
  {
    merchantPattern: "WALMART",
    merchantName: "Walmart",
    causeSlug: "workers-rights",
    charitySlug: "national-employment-law-project",
    charityName: "National Employment Law Project",
    reason: "Labor practices and wages concerns",
  },
  {
    merchantPattern: "AMAZON",
    merchantName: "Amazon",
    causeSlug: "workers-rights",
    charitySlug: "national-employment-law-project",
    charityName: "National Employment Law Project",
    reason: "Warehouse worker conditions and union opposition",
  },

  // Gun Safety
  {
    merchantPattern: "BASS PRO",
    merchantName: "Bass Pro Shops",
    causeSlug: "gun-safety",
    charitySlug: "everytown-for-gun-safety-support-fund",
    charityName: "Everytown for Gun Safety",
    reason: "Major firearms retailer",
  },
  {
    merchantPattern: "CABELA",
    merchantName: "Cabela's",
    causeSlug: "gun-safety",
    charitySlug: "everytown-for-gun-safety-support-fund",
    charityName: "Everytown for Gun Safety",
    reason: "Major firearms retailer",
  },
];

// Charities with their default causes
export interface CharityConfig {
  everyOrgSlug: string;
  name: string;
  causeSlug: string;
  description: string;
  isDefault: boolean;
}

export const CHARITIES: CharityConfig[] = [
  // LGBTQ+
  {
    everyOrgSlug: "the-trevor-project",
    name: "The Trevor Project",
    causeSlug: "lgbtq",
    description: "Crisis intervention and suicide prevention for LGBTQ+ youth",
    isDefault: true,
  },
  {
    everyOrgSlug: "lambda-legal",
    name: "Lambda Legal",
    causeSlug: "lgbtq",
    description: "Legal advocacy for LGBTQ+ civil rights",
    isDefault: false,
  },

  // Climate
  {
    everyOrgSlug: "environmental-defense-fund",
    name: "Environmental Defense Fund",
    causeSlug: "climate",
    description: "Environmental advocacy and climate solutions",
    isDefault: true,
  },
  {
    everyOrgSlug: "rainforest-alliance",
    name: "Rainforest Alliance",
    causeSlug: "climate",
    description: "Forest conservation and sustainable agriculture",
    isDefault: false,
  },
  {
    everyOrgSlug: "350-org",
    name: "350.org",
    causeSlug: "climate",
    description: "Global grassroots climate movement",
    isDefault: false,
  },
  {
    everyOrgSlug: "sierra-club-foundation",
    name: "Sierra Club Foundation",
    causeSlug: "climate",
    description: "Environmental conservation and climate action",
    isDefault: false,
  },

  // Reproductive Rights
  {
    everyOrgSlug: "planned-parenthood-federation-of-america-inc",
    name: "Planned Parenthood",
    causeSlug: "reproductive",
    description: "Reproductive healthcare and education",
    isDefault: true,
  },

  // Racial Justice
  {
    everyOrgSlug: "naacp-legal-defense-and-educational-fund",
    name: "NAACP Legal Defense Fund",
    causeSlug: "racial-justice",
    description: "Civil rights legal advocacy",
    isDefault: true,
  },

  // Gun Safety
  {
    everyOrgSlug: "everytown-for-gun-safety-support-fund",
    name: "Everytown for Gun Safety",
    causeSlug: "gun-safety",
    description: "Gun violence prevention advocacy",
    isDefault: true,
  },

  // Workers Rights
  {
    everyOrgSlug: "national-employment-law-project",
    name: "National Employment Law Project",
    causeSlug: "workers-rights",
    description: "Worker rights and fair labor policies",
    isDefault: true,
  },
];
