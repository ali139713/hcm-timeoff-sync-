"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Balance } from "@/types";

interface Props {
  balance: Balance;
  isOptimisticPending?: boolean;
}

export function BalanceCell({ balance, isOptimisticPending }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {balance.available}
        </span>
        <span className="text-sm text-gray-500">{balance.unit}</span>

        {isOptimisticPending && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Pending HCM
          </Badge>
        )}
      </div>

      {balance.pending > 0 && !isOptimisticPending && (
        <p className="text-xs text-amber-600">
          {balance.pending} {balance.unit} pending approval
        </p>
      )}
    </div>
  );
}
