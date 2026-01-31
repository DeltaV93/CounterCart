import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CounterCart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
