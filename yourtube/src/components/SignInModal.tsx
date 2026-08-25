import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { LogIn, ShieldAlert, Mail, User, Chrome, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const { handleDemoSignIn, handlegooglesignin } = useUser() as any;
  const { setTheme, simulatedTime } = useTheme();

  const [authMode, setAuthMode] = useState<"email" | "mobile">("mobile");
  const [email, setEmail] = useState("shrut@gmail.com");
  const [mobile, setMobile] = useState("+91 9876543210");
  const [name, setName] = useState("Shruti User");
  const [forceNewDevice, setForceNewDevice] = useState(true);
  const [newCity, setNewCity] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "email" && (!email || !email.includes("@"))) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (authMode === "mobile" && (!mobile || mobile.trim().length < 8)) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    setLoading(true);
    try {
      const simOptions = {
        simulatedTime,
        simulatedLocation: newCity ? { city: "Mumbai", state: "Maharashtra" } : null,
        forceNewDevice,
      };

      const payload = {
        email: authMode === "email" ? email.trim() : "",
        mobile: authMode === "mobile" ? mobile.trim() : "",
        otpDeliveryMethod: authMode,
        name: name.trim() || "Shruti User",
      };

      const res = await handleDemoSignIn(
        payload.email,
        payload.name,
        (t: any, uid: any) => setTheme(t, uid),
        { ...simOptions, mobile: payload.mobile, otpDeliveryMethod: authMode }
      );

      onClose();
      if (res?.otpRequired) {
        toast.info(`New login context detected. OTP code sent to registered ${authMode === "mobile" ? "Mobile SMS" : "Email"}!`);
      } else {
        toast.success("Signed in successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Sign in failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    try {
      setLoading(true);
      const simOptions = {
        simulatedTime,
        simulatedLocation: newCity ? { city: "Mumbai", state: "Maharashtra" } : null,
        forceNewDevice,
      };
      await handlegooglesignin((t: any, uid: any) => setTheme(t, uid), simOptions);
      onClose();
    } catch (err) {
      toast.error("Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
            <LogIn className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Sign In to YourTube</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Verify with OTP sent to your registered Email or Mobile Number.
          </DialogDescription>
        </DialogHeader>

        {/* Auth Delivery Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl my-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAuthMode("mobile")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${authMode === "mobile"
                ? "bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 shadow-sm font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile SMS OTP</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode("email")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${authMode === "email"
                ? "bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 shadow-sm font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email OTP</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {authMode === "mobile" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                <span>Registered Mobile Number (for SMS OTP)</span>
              </label>
              <Input
                type="tel"
                placeholder="+91 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm font-mono focus-visible:ring-red-500"
                required
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>Registered Email Address (for Email OTP)</span>
              </label>
              <Input
                type="email"
                placeholder="user@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus-visible:ring-red-500"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-500" />
              <span>User Name</span>
            </label>
            <Input
              type="text"
              placeholder="Shruti User"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm"
            />
          </div>

          {/* Security & OTP Options */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-2 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>Security & OTP Test Options:</span>
            </span>

            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={forceNewDevice}
                  onChange={(e) => setForceNewDevice(e.target.checked)}
                  className="rounded border-zinc-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>Simulate New Device (Triggers OTP verification)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={newCity}
                  onChange={(e) => setNewCity(e.target.checked)}
                  className="rounded border-zinc-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>Simulate New Location (City: Mumbai)</span>
              </label>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 pt-1">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Sending OTP..." : `Send OTP to ${authMode === "mobile" ? "Mobile SMS" : "Email"}`}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleClick}
              className="w-full border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-2 text-xs"
            >
              <Chrome className="w-4 h-4 text-blue-500" />
              <span>Sign in with Google</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
