"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BalanceCell } from "./BalanceCell";
import { StaleBanner } from "./StaleBanner";
import { useBalances } from "@/hooks/useBalances";
import { useUIStore } from "@/lib/store/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Balance } from "@/types";
import { LOCATIONS } from "@/lib/hcm/fixtures";

interface Props {
  employeeId: string;
}

const LEAVE_LABELS: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  personal: "Personal Leave",
};

interface StaleCell {
  key: string;
  fresh: Balance;
  previousAvailable: number;
}

function groupByLocation(balances: Balance[]) {
  return balances.reduce<Record<string, Balance[]>>((acc, b) => {
    if (!acc[b.locationId]) acc[b.locationId] = [];
    acc[b.locationId].push(b);
    return acc;
  }, {});
}

function BalanceGridInner({ employeeId }: Props) {
  const { balances, isLoading, isError, isStale } = useBalances(employeeId);
  const isMutating = useIsMutating();
  const { submissionStep, dismissStaleBanner } = useUIStore();

  // `acknowledged` = last snapshot the user has seen. Resetting it during a
  // mutation means our own optimistic deduction becomes the new baseline,
  // so only external changes (anniversary bonus etc.) trigger a banner.
  const [acknowledged, setAcknowledged] = useState<Balance[] | null>(null);

  if (isMutating > 0) {
    if (acknowledged !== null) setAcknowledged(null);
  } else if (balances.length > 0 && acknowledged === null) {
    setAcknowledged(balances);
  }

  const staleCells: StaleCell[] = [];
  if (acknowledged !== null && isMutating === 0) {
    for (const fresh of balances) {
      const prev = acknowledged.find(
        (b) =>
          b.locationId === fresh.locationId && b.leaveType === fresh.leaveType
      );
      if (prev && prev.available !== fresh.available) {
        staleCells.push({
          key: `${employeeId}:${fresh.locationId}:${fresh.leaveType}`,
          fresh,
          previousAvailable: prev.available,
        });
      }
    }
  }

  function acceptStaleCell(key: string) {
    dismissStaleBanner(key);
    setAcknowledged(balances);
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load balances from HCM. Please refresh or try again.
      </p>
    );
  }

  if (balances.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No leave balances found for your account.
      </p>
    );
  }

  const grouped = groupByLocation(balances);

  return (
    <div className="space-y-4">
      {isStale && !isMutating && (
        <p className="text-xs text-gray-400">
          Showing cached data — refreshing in background
        </p>
      )}

      {staleCells.map(({ key, fresh, previousAvailable }) => (
        <StaleBanner
          key={key}
          bannerKey={key}
          leaveType={fresh.leaveType}
          previousValue={previousAvailable}
          freshValue={fresh.available}
          onAccept={() => acceptStaleCell(key)}
        />
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(grouped).map(([locationId, locationBalances]) => {
          const location = LOCATIONS.find((l) => l.id === locationId);

          return (
            <Card key={locationId}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {location?.name ?? locationId}
                  <Badge variant="outline" className="text-xs font-normal">
                    {location?.country}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {locationBalances.map((balance) => (
                  <div
                    key={balance.leaveType}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-gray-600">
                      {LEAVE_LABELS[balance.leaveType] ?? balance.leaveType}
                    </span>
                    <BalanceCell
                      balance={balance}
                      isOptimisticPending={
                        submissionStep === "pending_hcm" && balance.pending > 0
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function BalanceGrid({ employeeId }: Props) {
  return (
    <ErrorBoundary>
      <BalanceGridInner employeeId={employeeId} />
    </ErrorBoundary>
  );
}
