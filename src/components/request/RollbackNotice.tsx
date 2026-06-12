"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/ui";

interface Props {
  onRetry: () => void;
}

export function RollbackNotice({ onRetry }: Props) {
  const { rollbackReason, savedDraft, closeRequestModal } = useUIStore();

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Request could not be submitted</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{rollbackReason}</p>
        {savedDraft && (
          <p className="text-xs opacity-80">
            Your request details have been preserved — you can retry or adjust
            the dates.
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Try again
          </Button>
          <Button size="sm" variant="ghost" onClick={closeRequestModal}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
