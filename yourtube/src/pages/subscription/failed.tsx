import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentFailedPage() {
  return (
    <main className="flex-1 p-6 md:p-10 bg-slate-50 min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden text-center p-8 space-y-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900">Payment Failed</h1>
          <p className="text-sm text-gray-600">
            Your subscription was not upgraded. Your account remains on your previous plan.
          </p>
        </div>

        <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-100 text-left space-y-1">
          <p className="font-semibold">Possible Reasons:</p>
          <ul className="list-disc list-inside space-y-0.5 text-red-700">
            <li>Payment modal cancelled by user</li>
            <li>Card / Netbanking transaction rejected</li>
            <li>Razorpay signature verification failed</li>
            <li>Network or connection interruption</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/subscription" className="w-full">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </Link>
          <Link href="/subscription" className="w-full">
            <Button variant="outline" className="w-full font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
