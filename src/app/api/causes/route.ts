import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const causes = await prisma.cause.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(causes);
  } catch (error) {
    console.error("Error fetching causes:", error);
    return NextResponse.json(
      { error: "Failed to fetch causes" },
      { status: 500 }
    );
  }
}
