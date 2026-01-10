"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Lock, ExternalLink } from "lucide-react";
import Image from "next/image";

interface CharityCardProps {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  everyOrgSlug: string;
  websiteUrl: string | null;
  isDefault: boolean;
  isSelected: boolean;
  isPremium: boolean; // Whether user has premium
  onSelect?: (charityId: string) => void;
  selectable?: boolean; // Whether selection is enabled
  compact?: boolean; // Compact mode for inline display
}

export function CharityCard({
  id,
  name,
  description,
  logoUrl,
  everyOrgSlug,
  isDefault,
  isSelected,
  isPremium,
  onSelect,
  selectable = true,
  compact = false,
}: CharityCardProps) {
  const canSelect = isPremium && selectable;
  const showLock = !isPremium && selectable && !isSelected;
  const everyOrgUrl = `https://www.every.org/${everyOrgSlug}`;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2">
        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="32px"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs font-medium text-muted-foreground">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
        </div>
        {isSelected && (
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card
      className={`relative transition-all ${
        isSelected
          ? "ring-2 ring-primary border-primary"
          : canSelect
          ? "hover:border-primary/50 cursor-pointer"
          : ""
      } ${canSelect ? "cursor-pointer" : ""}`}
      onClick={() => canSelect && onSelect?.(id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-lg font-medium text-muted-foreground">
                {name.charAt(0)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium truncate">{name}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {description}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {isSelected && (
                  <Badge className="bg-primary text-primary-foreground">
                    <Check className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
                {isDefault && !isSelected && (
                  <Badge variant="secondary">Default</Badge>
                )}
                {showLock && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a href={everyOrgUrl} target="_blank" rel="noopener noreferrer">
                  View on Every.org
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>

              {canSelect && !isSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(id);
                  }}
                >
                  Select
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function CharityCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 animate-pulse">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-24" />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4 animate-pulse">
          <div className="h-16 w-16 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
