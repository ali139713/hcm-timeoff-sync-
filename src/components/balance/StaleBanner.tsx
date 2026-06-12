"use client";

import { RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/ui";

interface Props {
  bannerKey: string;
  previousValue: number;
  freshValue: number;
  leaveType: string;
  onAccept: () => void;
}

export function StaleBanner({
  bannerKey,
  previousValue,
  freshValue,
  leaveType,
  onAccept,
}: Props) {
  const { dismissedStaleBanners, dismissStaleBanner } = useUIStore();

  if (dismissedStaleBanners.has(bannerKey)) return null;

  const delta = freshValue - previousValue;
  const sign = delta > 0 ? "+" : "";

  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900">
      <RefreshCw className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          Your {leaveType} leave balance was updated by HR (
          <strong>
            {sign}
            {delta} days
          </strong>
          ). Refreshed balance: <strong>{freshValue} days</strong>.
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={onAccept}>
            Got it
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dismissStaleBanner(bannerKey)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
