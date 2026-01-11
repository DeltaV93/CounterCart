import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-primary border-b-[3px] border-accent py-4 px-4">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-accent flex items-center justify-center text-primary">
              ↺
            </div>
            <span className="headline text-primary-foreground text-xl tracking-wider">
              COUNTERCART
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
