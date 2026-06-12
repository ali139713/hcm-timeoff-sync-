import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ExampleHR</h1>
          <p className="mt-1 text-sm text-gray-500">Time Off Management</p>
        </div>

        <div className="grid gap-3">
          <Card className="text-left">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Employee view</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">
                View your leave balances and submit time-off requests.
              </p>
              <div className="space-y-2">
                <Link href="/employee?id=emp_1" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    Sarah Chen — New York
                  </Button>
                </Link>
                <Link href="/employee?id=emp_2" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    James Okafor — London
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="text-left">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Manager view</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">
                Review and approve pending requests with live balance context.
              </p>
              <Link href="/manager?id=emp_3" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Maria Santos — Manager
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
