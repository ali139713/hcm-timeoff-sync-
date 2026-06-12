"use client";

import { ApprovalCard } from "./ApprovalCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRequests } from "@/hooks/useRequests";

interface Props {
  managerId: string;
}

function ApprovalQueueInner({ managerId }: Props) {
  const { requests, isLoading, isError } = useRequests();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load requests. Please refresh.
      </p>
    );
  }

  const pending = requests.filter((r) => r.status === "pending_hcm");
  const resolved = requests.filter(
    (r) => r.status === "approved" || r.status === "denied"
  );

  if (requests.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No pending requests.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Awaiting decision ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((req) => (
              <ApprovalCard key={req.id} request={req} managerId={managerId} />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Resolved
          </h3>
          <div className="space-y-3">
            {resolved.map((req) => (
              <ApprovalCard key={req.id} request={req} managerId={managerId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ApprovalQueue({ managerId }: Props) {
  return (
    <ErrorBoundary>
      <ApprovalQueueInner managerId={managerId} />
    </ErrorBoundary>
  );
}
