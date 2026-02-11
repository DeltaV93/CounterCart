import Link from "next/link";
import { publicStatsService } from "@/services/public-stats.service";
import { cn } from "@/lib/utils";

interface EmbedCounterPageProps {
  searchParams: Promise<{ style?: string; theme?: string }>;
}

export default async function EmbedCounterPage({
  searchParams,
}: EmbedCounterPageProps) {
  const params = await searchParams;
  const style = params.style === "detailed" ? "detailed" : "minimal";
  const theme = params.theme === "dark" ? "dark" : "light";

  const stats = await publicStatsService.getStats();

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(stats.totalDonated);

  const bgColor = theme === "dark" ? "bg-[#0A0A0A]" : "bg-[#F0EBE0]";
  const textColor = theme === "dark" ? "text-[#F0EBE0]" : "text-[#0A0A0A]";
  const mutedColor = theme === "dark" ? "text-[#8A8A82]" : "text-[#5A5A52]";
  const accentColor = "text-[#E2C230]";
  const borderColor = theme === "dark" ? "border-[#F0EBE0]" : "border-[#0A0A0A]";

  if (style === "minimal") {
    return (
      <div
        className={cn(
          "min-h-screen p-4 flex flex-col items-center justify-center",
          bgColor,
          textColor
        )}
      >
        <div className="text-center">
          <div className={cn("text-xs tracking-widest mb-2", mutedColor)}>
            COUNTERCART COMMUNITY
          </div>
          <div className="headline text-4xl md:text-5xl mb-2">{formattedTotal}</div>
          <div className={cn("text-sm", mutedColor)}>
            donated to causes that matter
          </div>
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app"}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-block mt-3 text-xs underline hover:no-underline",
              accentColor
            )}
          >
            Join the movement
          </Link>
        </div>
      </div>
    );
  }

  // Detailed style
  return (
    <div className={cn("min-h-screen p-4", bgColor, textColor)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className={cn(
            "w-6 h-6 flex items-center justify-center text-xs",
            theme === "dark" ? "bg-[#E2C230] text-[#0A0A0A]" : "bg-[#E2C230] text-[#0A0A0A]"
          )}
        >
          {"↻"}
        </div>
        <span className="headline text-sm tracking-wider">COUNTERCART</span>
      </div>

      {/* Main stat */}
      <div className={cn("border-2 p-4 mb-4", borderColor)}>
        <div className={cn("text-xs tracking-widest mb-1", mutedColor)}>
          TOTAL DONATED
        </div>
        <div className="headline text-3xl md:text-4xl">{formattedTotal}</div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={cn("border p-3", borderColor)}>
          <div className={cn("text-xs tracking-widest mb-1", mutedColor)}>USERS</div>
          <div className="headline text-xl">{stats.totalUsers.toLocaleString()}</div>
        </div>
        <div className={cn("border p-3", borderColor)}>
          <div className={cn("text-xs tracking-widest mb-1", mutedColor)}>CAUSES</div>
          <div className="headline text-xl">{stats.topCauses.length}</div>
        </div>
      </div>

      {/* Top company */}
      {stats.topCompaniesOffset[0] && (
        <div className={cn("border-t pt-3 mb-3", borderColor)}>
          <div className={cn("text-xs tracking-widest mb-1", mutedColor)}>
            MOST OFFSET COMPANY
          </div>
          <div className="headline text-lg">
            {stats.topCompaniesOffset[0].merchantName}
          </div>
          <div className={cn("text-xs", mutedColor)}>
            ${stats.topCompaniesOffset[0].totalOffset.toFixed(2)} offset
          </div>
        </div>
      )}

      {/* Top cause */}
      {stats.topCauses[0] && (
        <div className={cn("border-t pt-3", borderColor)}>
          <div className={cn("text-xs tracking-widest mb-1", mutedColor)}>
            TOP CAUSE
          </div>
          <div className="headline text-lg">{stats.topCauses[0].causeName}</div>
          <div className={cn("text-xs", mutedColor)}>
            ${stats.topCauses[0].totalFunded.toFixed(2)} funded
          </div>
        </div>
      )}

      {/* CTA */}
      <Link
        href={process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app"}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block mt-4 text-center text-xs underline hover:no-underline",
          accentColor
        )}
      >
        Join the movement
      </Link>
    </div>
  );
}
