"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  CreditCard,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  lastFour: string | null;
  isActive: boolean;
}

interface PlaidConnection {
  id: string;
  institutionName: string;
  institutionId: string;
  status: "ACTIVE" | "LOGIN_REQUIRED" | "ERROR" | "DISCONNECTED";
  errorCode: string | null;
  connectedAt: string;
  accounts: BankAccount[];
}

const statusConfig = {
  ACTIVE: { label: "Connected", variant: "default" as const, color: "bg-green-500" },
  LOGIN_REQUIRED: { label: "Reconnect Required", variant: "destructive" as const, color: "bg-yellow-500" },
  ERROR: { label: "Error", variant: "destructive" as const, color: "bg-red-500" },
  DISCONNECTED: { label: "Disconnected", variant: "secondary" as const, color: "bg-gray-500" },
};

export function BankAccountList() {
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<PlaidConnection | null>(null);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/user/bank-accounts");
      if (response.ok) {
        const data = await response.json();
        setConnections(data.accounts);
      }
    } catch {
      toast.error("Failed to load bank accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDisconnect = async () => {
    if (!selectedConnection) return;

    setDisconnecting(selectedConnection.id);
    try {
      const response = await fetch("/api/user/bank-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaidItemId: selectedConnection.id }),
      });

      if (response.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== selectedConnection.id));
        toast.success(`${selectedConnection.institutionName} disconnected`);
        setDialogOpen(false);
      } else {
        toast.error("Failed to disconnect bank account");
      }
    } catch {
      toast.error("Failed to disconnect bank account");
    } finally {
      setDisconnecting(null);
      setSelectedConnection(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium">No bank accounts connected</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Connect a bank account to start tracking transactions
        </p>
        <Button asChild>
          <a href="/onboarding/connect">
            <Plus className="mr-2 h-4 w-4" />
            Connect Bank
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => {
        const status = statusConfig[connection.status];

        return (
          <div
            key={connection.id}
            className="p-4 rounded-lg border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{connection.institutionName}</p>
                    <Badge variant={status.variant} className="text-xs">
                      {connection.status === "LOGIN_REQUIRED" && (
                        <AlertCircle className="mr-1 h-3 w-3" />
                      )}
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connected {new Date(connection.connectedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connection.status === "LOGIN_REQUIRED" && (
                  <Button variant="outline" size="sm" asChild>
                    <a href="/onboarding/connect">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect
                    </a>
                  </Button>
                )}
                <Dialog open={dialogOpen && selectedConnection?.id === connection.id} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) setSelectedConnection(null);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConnection(connection)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disconnect {connection.institutionName}?</DialogTitle>
                      <DialogDescription>
                        This will remove the connection and stop tracking transactions from this bank.
                        You can reconnect at any time.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={disconnecting === connection.id}
                      >
                        {disconnecting === connection.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Account List */}
            {connection.accounts.length > 0 && (
              <div className="mt-4 pl-14 space-y-2">
                {connection.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>{account.name}</span>
                    {account.lastFour && (
                      <span className="text-muted-foreground">
                        ••••{account.lastFour}
                      </span>
                    )}
                    <span className="text-muted-foreground capitalize">
                      {account.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" className="w-full" asChild>
        <a href="/onboarding/connect">
          <Plus className="mr-2 h-4 w-4" />
          Connect Another Bank
        </a>
      </Button>
    </div>
  );
}
