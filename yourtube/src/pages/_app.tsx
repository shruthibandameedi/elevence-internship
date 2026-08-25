import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { useRouter } from "next/router";
import { OtpModal } from "@/components/OtpModal";

function AppContent({ Component, pageProps }: { Component: any; pageProps: any }) {
  const router = useRouter();
  const isWatchParty = router.pathname.startsWith("/watch-party");
  const { login, pendingOtp, isOtpOpen, setIsOtpOpen } = useUser() as any;
  const { setTheme, simulatedTime, simulatedLocation } = useTheme();

  const getLoginContextData = () => ({
    deviceId: typeof window !== "undefined" ? localStorage.getItem("yt_device_id") || "device_default" : "device_default",
    location: simulatedLocation || { city: "New Delhi", state: "Delhi", country: "India" },
    simulatedTime,
  });

  const handleOtpSuccess = (userData: any, appliedTheme?: string) => {
    login(userData, appliedTheme, (t: any, uid: any) => setTheme(t, uid));
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <title>Your-Tube Clone</title>
      <Toaster />
      {isWatchParty ? (
        <Component {...pageProps} />
      ) : (
        <>
          <Header />
          <div className="flex">
            <Sidebar />
            <Component {...pageProps} />
          </div>
        </>
      )}

      {pendingOtp && (
        <OtpModal
          isOpen={isOtpOpen}
          onClose={() => setIsOtpOpen(false)}
          tempUserId={pendingOtp.tempUserId}
          maskedEmail={pendingOtp.maskedEmail}
          maskedContact={pendingOtp.maskedContact}
          deliveryMethod={pendingOtp.deliveryMethod}
          devOtp={pendingOtp.devOtp}
          onSuccess={handleOtpSuccess}
          getLoginContextData={getLoginContextData}
        />
      )}
    </div>
  );
}

export default function App(props: AppProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent {...props} />
      </UserProvider>
    </ThemeProvider>
  );
}
