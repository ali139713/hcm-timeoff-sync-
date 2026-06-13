"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance } from "@/hooks/useBalance";
import { useResolveRequest } from "@/hooks/useRequests";
import { EMPLOYEES, LOCATIONS } from "@/lib/hcm/fixtures";
import type { TimeOffRequest } from "@/types";

interface Props {
  request: TimeOffRequest;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_hcm: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  denied: { label: "Denied", variant: "destructive" },
  rolled_back: { label: "Rolled back", variant: "outline" },
};

export function ApprovalCard({ request }: Props) {
  // live read at decision time — the cached batch value may be minutes old
  const [showLiveBalance, setShowLiveBalance] = useState(false);
  const { balance, isLoading: balanceLoading, refetch } = useBalance(
    request.employeeId,
    request.locationId,
    request.leaveType,
    { enabled: showLiveBalance }
  );
  const { resolve, isPending } = useResolveRequest();

  const employee = EMPLOYEES.find((e) => e.id === request.employeeId);
  const location = LOCATIONS.find((l) => l.id === request.locationId);
  const statusConfig = STATUS_BADGE[request.status];
  const isResolved = request.status === "approved" || request.status === "denied";

  return (
    <Card className={isResolved ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{employee?.name ?? request.employeeId}</CardTitle>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <p className="text-xs text-gray-500">
          {location?.name} · {request.leaveType} leave · {request.days} day
          {request.days !== 1 ? "s" : ""} · {request.startDate} → {request.endDate}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {request.note && (
          <p className="text-sm text-gray-600 italic">&ldquo;{request.note}&rdquo;</p>
        )}

        <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              Current balance (live from HCM)
            </span>
            {!showLiveBalance ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => setShowLiveBalance(true)}
              >
                Check balance
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            )}
          </div>

          {showLiveBalance && (
            <div className="mt-2">
              {balanceLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : balance ? (
                <p className="text-sm">
                  <span className="font-semibold">{balance.available} days</span>{" "}
                  <span className="text-gray-500">available</span>
                  {balance.pending > 0 && (
                    <span className="ml-2 text-amber-600">
                      ({balance.pending} pending)
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-red-600">Could not fetch live balance</p>
              )}
            </div>
          )}
        </div>

        {!isResolved && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => resolve({ requestId: request.id, action: "deny" })}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="mr-1 h-4 w-4" />
                  Deny
                </>
              )}
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => resolve({ requestId: request.id, action: "approve" })}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
