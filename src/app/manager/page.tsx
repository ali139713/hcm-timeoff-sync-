import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApprovalQueue } from "@/components/manager/ApprovalQueue";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEES } from "@/lib/hcm/fixtures";

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function ManagerPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const managerId = id ?? "emp_3";
  const manager = EMPLOYEES.find((e) => e.id === managerId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{manager?.name ?? managerId}</h1>
          <p className="text-sm text-gray-500">Approval queue</p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ApprovalQueue managerId={managerId} />
      </Suspense>
    </div>
  );
}
