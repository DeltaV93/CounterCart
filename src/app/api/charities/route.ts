import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getNonprofitsBySlug, type EveryOrgNonprofit } from "@/lib/everyorg";

export interface CharityWithDetails {
  id: string;
  causeId: string;
  causeName: string;
  causeSlug: string;
  everyOrgSlug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  isDefault: boolean;
  isSelected: boolean; // Whether this is user's chosen charity for the cause
  everyOrgDetails?: EveryOrgNonprofit; // Rich data from Every.org API
}

export interface CharitiesByCause {
  cause: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconName: string | null;
    color: string | null;
  };
  charities: CharityWithDetails[];
  selectedCharityId: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const causeId = searchParams.get("causeId");
    const causeSlug = searchParams.get("causeSlug");
    const enrichWithEveryOrg = searchParams.get("enrich") === "true";
    const userCausesOnly = searchParams.get("userCausesOnly") === "true";

    // Get current user (optional - charities are public)
    const user = await getCurrentUser();

    // Build where clause for charities
    const charityWhere: Record<string, unknown> = { isActive: true };
    if (causeId) {
      charityWhere.causeId = causeId;
    }
    if (causeSlug) {
      charityWhere.cause = { slug: causeSlug };
    }

    // If userCausesOnly, filter to user's selected causes
    let userCauseIds: string[] = [];
    if (userCausesOnly && user) {
      const userCauses = await prisma.userCause.findMany({
        where: { userId: user.id },
        select: { causeId: true },
      });
      userCauseIds = userCauses.map((uc) => uc.causeId);
      if (userCauseIds.length > 0) {
        charityWhere.causeId = { in: userCauseIds };
      }
    }

    // Fetch charities with cause info
    const charities = await prisma.charity.findMany({
      where: charityWhere,
      include: {
        cause: true,
      },
      orderBy: [
        { cause: { name: "asc" } },
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    // Get user's charity preferences if logged in
    let userCharityPrefs: Map<string, string> = new Map();
    if (user) {
      const prefs = await prisma.userCharity.findMany({
        where: { userId: user.id },
      });
      prefs.forEach((p) => {
        userCharityPrefs.set(p.causeId, p.charityId);
      });
    }

    // Optionally enrich with Every.org data
    let everyOrgData: Map<string, EveryOrgNonprofit> = new Map();
    if (enrichWithEveryOrg) {
      const slugs = charities.map((c) => c.everyOrgSlug);
      everyOrgData = await getNonprofitsBySlug(slugs);
    }

    // Transform to response format grouped by cause
    const causeMap = new Map<string, CharitiesByCause>();

    for (const charity of charities) {
      const causeKey = charity.causeId;

      if (!causeMap.has(causeKey)) {
        causeMap.set(causeKey, {
          cause: {
            id: charity.cause.id,
            name: charity.cause.name,
            slug: charity.cause.slug,
            description: charity.cause.description,
            iconName: charity.cause.iconName,
            color: charity.cause.color,
          },
          charities: [],
          selectedCharityId: userCharityPrefs.get(causeKey) || null,
        });
      }

      const selectedCharityId = userCharityPrefs.get(causeKey);
      const isSelected = selectedCharityId
        ? selectedCharityId === charity.id
        : charity.isDefault; // Default selection if user hasn't chosen

      const everyOrgDetails = everyOrgData.get(charity.everyOrgSlug);

      causeMap.get(causeKey)!.charities.push({
        id: charity.id,
        causeId: charity.causeId,
        causeName: charity.cause.name,
        causeSlug: charity.cause.slug,
        everyOrgSlug: charity.everyOrgSlug,
        name: charity.name,
        description: everyOrgDetails?.description || charity.description,
        logoUrl: everyOrgDetails?.logoUrl || charity.logoUrl,
        websiteUrl: everyOrgDetails?.websiteUrl || charity.websiteUrl,
        isDefault: charity.isDefault,
        isSelected,
        everyOrgDetails,
      });
    }

    return NextResponse.json({
      charities: Array.from(causeMap.values()),
      isPremium: user?.subscriptionTier === "premium",
    });
  } catch (error) {
    console.error("Error fetching charities:", error);
    return NextResponse.json(
      { error: "Failed to fetch charities" },
      { status: 500 }
    );
  }
}

// POST - Set user's preferred charity for a cause (Premium feature)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has premium subscription
    if (user.subscriptionTier !== "premium") {
      return NextResponse.json(
        { error: "Charity selection is a premium feature" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { causeId, charityId } = body;

    if (!causeId || !charityId) {
      return NextResponse.json(
        { error: "causeId and charityId are required" },
        { status: 400 }
      );
    }

    // Verify charity exists and belongs to the cause
    const charity = await prisma.charity.findFirst({
      where: {
        id: charityId,
        causeId,
        isActive: true,
      },
    });

    if (!charity) {
      return NextResponse.json(
        { error: "Charity not found or does not match cause" },
        { status: 404 }
      );
    }

    // Upsert the user's charity preference
    const userCharity = await prisma.userCharity.upsert({
      where: {
        userId_causeId: {
          userId: user.id,
          causeId,
        },
      },
      update: {
        charityId,
      },
      create: {
        userId: user.id,
        causeId,
        charityId,
      },
    });

    return NextResponse.json({
      success: true,
      userCharity,
    });
  } catch (error) {
    console.error("Error setting charity preference:", error);
    return NextResponse.json(
      { error: "Failed to set charity preference" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user's charity preference (revert to default)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const causeId = searchParams.get("causeId");

    if (!causeId) {
      return NextResponse.json(
        { error: "causeId is required" },
        { status: 400 }
      );
    }

    await prisma.userCharity.deleteMany({
      where: {
        userId: user.id,
        causeId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing charity preference:", error);
    return NextResponse.json(
      { error: "Failed to remove charity preference" },
      { status: 500 }
    );
  }
}
