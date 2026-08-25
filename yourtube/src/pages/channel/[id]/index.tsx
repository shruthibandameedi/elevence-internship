import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import DownloadsContent from "@/components/DownloadsContent";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Sun, Moon, ShieldCheck, User, Laptop, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ChannelPageIndex = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser() as any;
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("videos");
  const [realVideos, setRealVideos] = useState<any[]>([]);

  useEffect(() => {
    if (router.query.tab && typeof router.query.tab === "string") {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        if (Array.isArray(res.data)) {
          setRealVideos(res.data);
        }
      } catch (err) {
        console.error("Error fetching channel videos:", err);
      }
    };
    fetchVideos();
  }, []);

  const handleThemeChange = async (selectedTheme: "light" | "dark") => {
    try {
      await setTheme(selectedTheme, user?._id);
      toast.success(`Theme updated to ${selectedTheme.toUpperCase()} mode!`);
    } catch (e) {
      toast.error("Failed to update theme preference.");
    }
  };

  try {
    let channel = user;

    return (
      <div className="flex-1 min-h-screen bg-background text-foreground transition-colors duration-200">
        <div className="max-w-full mx-auto">
          <ChannelHeader channel={channel} user={user} />
          <Channeltabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === "downloads" ? (
            <div className="p-6 max-w-4xl">
              <DownloadsContent />
            </div>
          ) : activeTab === "settings" ? (
            <div className="p-6 max-w-4xl space-y-8">
              {/* Profile & Appearance Card */}
              <div className="bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Appearance & Theme Settings</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Customize your platform experience. Preferences are saved to your profile and persist across devices.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold block text-zinc-800 dark:text-zinc-200">
                    Select Theme Preference
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Light Theme Option */}
                    <div
                      onClick={() => handleThemeChange("light")}
                      className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                        theme === "light"
                          ? "border-red-600 bg-red-50/50 dark:bg-red-950/20 text-zinc-900"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                        <Sun className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-base flex items-center gap-2">
                          <span>☀ Light Theme</span>
                          {theme === "light" && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase">Active</span>}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Bright interface (Default between 10:00 AM - 12:00 PM IST)
                        </p>
                      </div>
                    </div>

                    {/* Dark Theme Option */}
                    <div
                      onClick={() => handleThemeChange("dark")}
                      className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                        theme === "dark"
                          ? "border-red-600 bg-zinc-900 text-white shadow-lg"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="p-3 rounded-full bg-indigo-950 text-indigo-400">
                        <Moon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-base flex items-center gap-2">
                          <span>🌙 Dark Theme</span>
                          {theme === "dark" && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase">Active</span>}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Sleek dark interface (Default for all other IST time ranges)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account & Security Card */}
              <div className="bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Account Protection & Security Info</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      OTP security verifies new devices and locations without complex logins.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-2 border border-zinc-200 dark:border-zinc-700/50">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px]">Registered Contact</span>
                    <p className="font-mono text-sm font-bold">{user?.email || "N/A"}</p>
                    <p className="text-zinc-400">OTP codes are dispatched to this address on new login detection.</p>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-2 border border-zinc-200 dark:border-zinc-700/50">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px]">Active Subscription Plan</span>
                    <p className="text-sm font-bold capitalize text-amber-600 dark:text-amber-400">{user?.plan || "Free"} Plan</p>
                    <p className="text-zinc-400">Razorpay integrated payment status: {user?.subscriptionStatus || "Active"}</p>
                  </div>
                </div>

                {/* Trusted Locations List */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span>Trusted Login Locations & Devices</span>
                  </h3>

                  {user?.trustedLoginContexts && user.trustedLoginContexts.length > 0 ? (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      {user.trustedLoginContexts.map((ctx: any, idx: number) => (
                        <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-zinc-400" />
                            <div>
                              <span className="font-bold">{ctx.city || "Known City"}, {ctx.state || "Known State"}</span>
                              <span className="text-zinc-400 block font-mono text-[10px]">Device ID: {ctx.deviceId ? ctx.deviceId.substring(0, 14) + "..." : "Default"}</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold px-2 py-0.5 rounded-full">
                            Verified Trusted
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl text-xs text-zinc-500 dark:text-zinc-400">
                      Current session logged in securely. Security context will save as trusted after initial OTP verification.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-4">
                <VideoUploader channelId={id} channelName={channel?.channelname} />
              </div>
              <div className="px-4 pb-8">
                <ChannelVideos videos={realVideos} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching channel data:", error);
    return <div className="p-6">Error loading channel page</div>;
  }
};

export default ChannelPageIndex;
