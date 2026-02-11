"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface JoinOrgFormProps {
  orgName: string;
  inviteCode: string;
}

export function JoinOrgForm({ orgName, inviteCode }: JoinOrgFormProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);

    try {
      const response = await fetch("/api/organizations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      if (response.ok) {
        toast.success(`Welcome to ${orgName}!`);
        router.push("/company-admin");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to join organization");
      }
    } catch {
      toast.error("Failed to join organization");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Button
      className="w-full"
      size="lg"
      onClick={handleJoin}
      disabled={isJoining}
    >
      {isJoining ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Joining...
        </>
      ) : (
        `Join ${orgName}`
      )}
    </Button>
  );
}
