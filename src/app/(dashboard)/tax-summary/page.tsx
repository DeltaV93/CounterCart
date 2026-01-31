"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Loader2,
  Sparkles,
  Lock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface CharitySummary {
  charityName: string;
  ein: string | null;
  everyOrgSlug: string;
  totalAmount: number;
  donationCount: number;
}

interface TaxSummary {
  year: number;
  userName: string;
  userEmail: string;
  generatedAt: string;
  summary: {
    totalDonated: number;
    totalDonations: number;
    charitiesSupported: number;
  };
  charities: CharitySummary[];
  monthlyBreakdown: {
    month: string;
    total: number;
    count: number;
  }[];
}

// Generate available years (current year back to 2020)
const currentYear = new Date().getFullYear();
const availableYears = Array.from(
  { length: currentYear - 2019 },
  (_, i) => currentYear - i
);

export default function TaxSummaryPage() {
  const router = useRouter();
  const [year, setYear] = useState(currentYear.toString());
  const [data, setData] = useState<TaxSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/user/tax-summary?year=${year}`);

        if (response.status === 403) {
          setIsPremium(false);
          setIsLoading(false);
          return;
        }

        if (response.ok) {
          const result = await response.json();
          setData(result);
          setIsPremium(true);
        } else {
          toast.error("Failed to load tax summary");
        }
      } catch {
        toast.error("Failed to load tax summary");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [year]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      // Create a printable version
      const printContent = document.getElementById("tax-summary-content");
      if (printContent) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Tax Summary ${year} - CounterCart</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                  h1 { font-size: 24px; margin-bottom: 8px; }
                  h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
                  p { color: #666; margin: 4px 0; }
                  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background: #f5f5f5; }
                  .summary-box { background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0; }
                  .total { font-size: 24px; font-weight: bold; }
                  .disclaimer { font-size: 12px; color: #888; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
                  @media print { body { padding: 20px; } }
                </style>
              </head>
              <body>
                <h1>Tax Summary ${year}</h1>
                <p>Generated for: ${data?.userName}</p>
                <p>Email: ${data?.userEmail}</p>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>

                <div class="summary-box">
                  <p class="total">$${data?.summary.totalDonated.toFixed(2)}</p>
                  <p>Total charitable donations in ${year}</p>
                  <p>${data?.summary.totalDonations} donations to ${data?.summary.charitiesSupported} organizations</p>
                </div>

                <h2>Donations by Organization</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>EIN</th>
                      <th>Donations</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data?.charities.map((c) => `
                      <tr>
                        <td>${c.charityName}</td>
                        <td>${c.ein || "N/A"}</td>
                        <td>${c.donationCount}</td>
                        <td>$${c.totalAmount.toFixed(2)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>

                <div class="disclaimer">
                  <p><strong>Important Tax Information</strong></p>
                  <p>All donations were made through Every.org, a 501(c)(3) public charity (EIN: 61-1913297). For tax purposes, your donation is made to Every.org, which then grants the funds to your selected nonprofit(s).</p>
                  <p>Please retain your individual donation receipts from Every.org for your tax records. This summary is provided for informational purposes only and should not be used as a substitute for official tax documentation.</p>
                  <p>Consult with a qualified tax professional regarding the deductibility of your charitable contributions.</p>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
      toast.success("PDF ready for download");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-muted-foreground">
            Download your annual donation summary for tax purposes
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPremium === false) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-muted-foreground">
            Download your annual donation summary for tax purposes
          </p>
        </div>
        <Card className="border-primary">
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Premium Feature</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Tax summary export is available for Premium subscribers. Upgrade to download
                your annual donation summary for tax purposes.
              </p>
              <Button onClick={() => router.push("/settings")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-muted-foreground">
            Download your annual donation summary for tax purposes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadPDF} disabled={isDownloading || !data}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <div id="tax-summary-content">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${data?.summary.totalDonated.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">in {year}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.summary.totalDonations || 0}
              </div>
              <p className="text-xs text-muted-foreground">individual donations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.summary.charitiesSupported || 0}
              </div>
              <p className="text-xs text-muted-foreground">charities supported</p>
            </CardContent>
          </Card>
        </div>

        {/* Donations by Charity */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Donations by Organization</CardTitle>
            <CardDescription>
              Breakdown of your charitable contributions by nonprofit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.charities && data.charities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>EIN</TableHead>
                    <TableHead className="text-center">Donations</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.charities.map((charity) => (
                    <TableRow key={charity.everyOrgSlug}>
                      <TableCell className="font-medium">
                        {charity.charityName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {charity.ein || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {charity.donationCount}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${charity.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://www.every.org/${charity.everyOrgSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium">No donations in {year}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completed donations will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Important:</strong> All donations were made through Every.org, a 501(c)(3)
              public charity. For tax purposes, your donation is made to Every.org, which then
              grants the funds to your selected nonprofit(s). Please retain your individual
              donation receipts from Every.org for your tax records. Consult with a qualified
              tax professional regarding the deductibility of your charitable contributions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
