import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { challengeService } from "@/services/challenge.service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/challenges/[slug]/join
 * Join a challenge
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const { slug } = await params;

    // Get the challenge
    const challenge = await challengeService.getChallengeBySlug(slug);

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Join the challenge
    const result = await challengeService.joinChallenge(user.id, challenge.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.info("User joined challenge", {
      userId: user.id,
      challengeSlug: slug,
    });

    return NextResponse.json({
      success: true,
      message: `You've joined ${challenge.title}!`,
    });
  } catch (error) {
    logger.error("Error joining challenge", {}, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
