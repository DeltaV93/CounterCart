import { PrismaClient } from "@prisma/client";
import { CAUSES } from "../src/config/causes";
import { BUSINESS_MAPPINGS, CHARITIES } from "../src/config/mappings";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed Causes
  console.log("Seeding causes...");
  for (const cause of CAUSES) {
    await prisma.cause.upsert({
      where: { slug: cause.slug },
      update: {
        name: cause.name,
        description: cause.description,
        iconName: cause.iconName,
        color: cause.color,
      },
      create: {
        name: cause.name,
        slug: cause.slug,
        description: cause.description,
        iconName: cause.iconName,
        color: cause.color,
      },
    });
  }
  console.log(`Seeded ${CAUSES.length} causes`);

  // Seed Charities
  console.log("Seeding charities...");
  for (const charity of CHARITIES) {
    const cause = await prisma.cause.findUnique({
      where: { slug: charity.causeSlug },
    });

    if (!cause) {
      console.warn(`Cause not found for charity: ${charity.name}`);
      continue;
    }

    await prisma.charity.upsert({
      where: { everyOrgSlug: charity.everyOrgSlug },
      update: {
        name: charity.name,
        description: charity.description,
        isDefault: charity.isDefault,
        causeId: cause.id,
      },
      create: {
        everyOrgSlug: charity.everyOrgSlug,
        name: charity.name,
        description: charity.description,
        isDefault: charity.isDefault,
        causeId: cause.id,
      },
    });
  }
  console.log(`Seeded ${CHARITIES.length} charities`);

  // Seed Business Mappings
  console.log("Seeding business mappings...");
  for (const mapping of BUSINESS_MAPPINGS) {
    const cause = await prisma.cause.findUnique({
      where: { slug: mapping.causeSlug },
    });

    if (!cause) {
      console.warn(`Cause not found for mapping: ${mapping.merchantName}`);
      continue;
    }

    // Check if mapping already exists
    const existing = await prisma.businessMapping.findFirst({
      where: {
        merchantPattern: mapping.merchantPattern,
        causeId: cause.id,
      },
    });

    if (existing) {
      await prisma.businessMapping.update({
        where: { id: existing.id },
        data: {
          merchantName: mapping.merchantName,
          charitySlug: mapping.charitySlug,
          charityName: mapping.charityName,
          reason: mapping.reason,
        },
      });
    } else {
      await prisma.businessMapping.create({
        data: {
          merchantPattern: mapping.merchantPattern,
          merchantName: mapping.merchantName,
          causeId: cause.id,
          charitySlug: mapping.charitySlug,
          charityName: mapping.charityName,
          reason: mapping.reason,
        },
      });
    }
  }
  console.log(`Seeded ${BUSINESS_MAPPINGS.length} business mappings`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
