import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ShieldCheck, RefreshCw, KeyRound, AlertTriangle, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempUserId: string | null;
  maskedEmail: string;
  maskedContact?: string;
  deliveryMethod?: "mobile" | "email";
  devOtp?: string;
  onSuccess: (userData: any, appliedTheme?: string) => void;
  getLoginContextData: () => { deviceId: string; location: any; simulatedTime: string };
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  tempUserId,
  maskedEmail,
  maskedContact,
  deliveryMethod = "email",
  devOtp: initialDevOtp,
  onSuccess,
  getLoginContextData,
}) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>(initialDevOtp);
  const [resendCooldown, setResendCooldown] = useState(30);

  const displayContact = maskedContact || maskedEmail || "registered contact";
  const isMobile = deliveryMethod === "mobile" || (displayContact && !displayContact.includes("@"));

  useEffect(() => {
    setDevOtp(initialDevOtp);
    if (initialDevOtp) {
      // Auto pre-fill in dev mode for seamless testing
      setOtp(initialDevOtp);
    }
  }, [initialDevOtp, isOpen]);

  useEffect(() => {
    let timer: any;
    if (isOpen && resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempUserId) return;
    if (otp.trim().length < 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { deviceId, location, simulatedTime } = getLoginContextData();
      const res = await axiosInstance.post("/user/verify-otp", {
        tempUserId,
        otp: otp.trim(),
        deviceId,
        location,
        simulatedTime,
      });

      toast.success("OTP Verified! Login Successful.");
      onSuccess(res.data.result, res.data.appliedTheme);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid OTP code. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempUserId || resendCooldown > 0) return;

    setResending(true);
    setErrorMsg("");
    try {
      const res = await axiosInstance.post("/user/resend-otp", { tempUserId });
      toast.success(res.data.message || "New OTP sent!");
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp);
        setOtp(res.data.devOtp);
      }
      setResendCooldown(30);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
            {isMobile ? <Smartphone className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
          </div>
          <DialogTitle className="text-xl font-bold">New Login Detected</DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm">
            To protect your account, verify this login with the OTP sent to your registered {isMobile ? "mobile number" : "email address"}:
            <span className="block mt-1.5 font-bold font-mono text-red-600 dark:text-red-400 text-base">{displayContact}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 my-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Enter 6-Digit OTP</span>
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
            </label>
            <Input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setErrorMsg("");
              }}
              className="text-center text-2xl font-mono tracking-[0.5em] h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 rounded-xl focus-visible:ring-red-500 font-bold text-red-600 dark:text-red-400"
              autoFocus
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {devOtp && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Test {isMobile ? "Mobile SMS" : "Email"} OTP Code:
                </span>
                <code className="font-mono bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded font-bold text-sm text-red-600 dark:text-red-400">{devOtp}</code>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Code has auto-filled below. Click <strong>Verify OTP</strong> to complete login.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1">
            <span>Didn't receive code?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={resendCooldown > 0 || resending}
              onClick={handleResend}
              className="h-auto p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
            >
              {resending ? (
                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                "Resend OTP"
              )}
            </Button>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-1/2 border-zinc-300 dark:border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full sm:w-1/2 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
