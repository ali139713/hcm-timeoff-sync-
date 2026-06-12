import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BalanceGrid } from "@/components/balance/BalanceGrid";
import { RequestForm } from "@/components/request/RequestForm";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEES } from "@/lib/hcm/fixtures";

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function EmployeePage({ searchParams }: Props) {
  const { id } = await searchParams;
  const employeeId = id ?? "emp_1";
  const employee = EMPLOYEES.find((e) => e.id === employeeId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{employee?.name ?? employeeId}</h1>
          <p className="text-sm text-gray-500">Leave balances</p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <BalanceGrid employeeId={employeeId} />
      </Suspense>

      <div className="flex justify-end">
        <RequestForm employeeId={employeeId} />
      </div>
    </div>
  );
}
