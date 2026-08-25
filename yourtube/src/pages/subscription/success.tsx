import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle2, Home, Crown, User, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { user } = useUser();
  const { plan, amount, paymentId, orderId } = router.query;

  const currentPlan = ((plan as string) || user?.plan || "Gold").toUpperCase();
  const paidAmount = (amount as string) || (currentPlan === "BRONZE" ? "₹99" : currentPlan === "SILVER" ? "₹199" : "₹499");
  const transactionId = (paymentId as string) || `pay_${Math.random().toString(36).substr(2, 9)}`;
  const razorpayOrderId = (orderId as string) || `order_${Math.random().toString(36).substr(2, 9)}`;
  const currentDate = new Date().toLocaleString();

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <main className="flex-1 p-6 md:p-10 bg-slate-50 min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Top Success Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center text-white space-y-2">
          <CheckCircle2 className="w-16 h-16 mx-auto text-white drop-shadow-md animate-bounce" />
          <h1 className="text-2xl md:text-3xl font-extrabold">Payment Successful!</h1>
          <p className="text-emerald-100 text-sm">
            Your subscription has been upgraded successfully.
          </p>
        </div>

        {/* Invoice / Receipt Details Card */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</span>
              <h2 className="text-lg font-bold text-gray-900">YourTube Video Platform</h2>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> {currentPlan} Plan
            </span>
          </div>

          {/* Printable Invoice Details */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 border-b pb-2">
              <span className="font-semibold text-gray-700">Official Payment Receipt</span>
              <span>{currentDate}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-2 pt-1">
              <div>
                <span className="text-xs text-gray-500 block">User Name</span>
                <span className="font-semibold text-gray-800">{user?.name || "Subscriber"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">User Email</span>
                <span className="font-semibold text-gray-800 truncate block">{user?.email || "user@example.com"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Plan Upgraded</span>
                <span className="font-bold text-red-600">{currentPlan}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Amount Paid</span>
                <span className="font-bold text-emerald-600">{paidAmount}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Razorpay Order ID</span>
                <span className="font-mono text-xs text-gray-700">{razorpayOrderId}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Payment ID</span>
                <span className="font-mono text-xs text-gray-700">{transactionId}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Payment Status</span>
                <span className="font-bold text-emerald-600 uppercase text-xs">Success</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Currency</span>
                <span className="font-semibold text-gray-800">INR</span>
              </div>
            </div>
          </div>

          {/* Download/Print Invoice Action */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={handlePrintReceipt} className="text-xs text-gray-600 hover:text-gray-900">
              <FileText className="w-3.5 h-3.5 mr-1" /> Print / Save Invoice Receipt
            </Button>
          </div>

          {/* Three Required Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link href="/">
              <Button variant="outline" className="w-full text-xs font-semibold">
                <Home className="w-4 h-4 mr-1.5" /> Go to Home
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="outline" className="w-full text-xs font-semibold">
                <Crown className="w-4 h-4 mr-1.5 text-amber-600" /> View Subscription
              </Button>
            </Link>
            <Link href={user?._id ? `/channel/${user._id}` : "/"}>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                <User className="w-4 h-4 mr-1.5" /> View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
