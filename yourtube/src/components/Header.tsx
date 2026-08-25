import { Bell, Menu, Mic, Search, User, VideoIcon, Sun, Moon, Settings, ShieldAlert, Clock, LogIn } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { SignInModal } from "./SignInModal";
import { toast } from "sonner";

const Header = () => {
  const { user, logout, handlegooglesignin } = useUser() as any;
  const { theme, setTheme, simulatedTime, setSimulatedTime, simulatedLocation, setSimulatedLocation, forceNewDevice, setForceNewDevice } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">YourTube</span>
          <span className="text-xs text-zinc-400 font-semibold ml-1">IN</span>
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-2xl mx-4">
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-l-0 border-zinc-300 dark:border-zinc-700"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <Mic className="w-5 h-5" />
        </Button>
      </form>

      <div className="flex items-center gap-2">
        {/* Quick Theme Toggle Icon */}
        <Button
          variant="ghost"
          size="icon"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark", user?._id)}
          className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </Button>

        {/* Development & Security Test Control Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDevModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Dev Test Sim</span>
        </Button>

        {user ? (
          <>
            <Button variant="ghost" size="icon" className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <VideoIcon className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Bell className="w-6 h-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" align="end" forceMount>
                <DropdownMenuLabel className="font-normal border-b pb-2 border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user.name || "User"}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-none">{user.email}</p>
                  </div>
                </DropdownMenuLabel>

                {user?.channelname ? (
                  <DropdownMenuItem asChild className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Link href="/downloads" className="font-semibold text-red-600">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Link href="/subscription" className="font-semibold text-amber-600 flex items-center justify-between w-full">
                    <span>Subscription</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded uppercase font-bold ml-1">
                      {user?.plan || "Free"}
                    </span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />

                {/* Theme Selector inside Dropdown */}
                <div className="px-2 py-2">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 px-1 flex items-center justify-between">
                    <span>Appearance</span>
                    <span className="capitalize text-red-600 dark:text-red-400 font-bold">{theme}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <Button
                      size="sm"
                      variant={theme === "light" ? "default" : "ghost"}
                      onClick={() => setTheme("light", user?._id)}
                      className={`h-7 text-xs flex items-center gap-1 ${
                        theme === "light" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={theme === "dark" ? "default" : "ghost"}
                      onClick={() => setTheme("dark", user?._id)}
                      className={`h-7 text-xs flex items-center gap-1 ${
                        theme === "dark" ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </Button>
                  </div>
                </div>

                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={() => setIsSignInOpen(true)}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </div>
        )}
      </div>

      {/* Sign In Dialog */}
      <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />

      {/* Dev Simulator Dialog */}
      <Dialog open={isDevModalOpen} onOpenChange={setIsDevModalOpen}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
              <Settings className="w-5 h-5" />
              <span>Dev Testing & Simulation Controls</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Easily simulate IST login times and new location/device security triggers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Simulated Time (IST) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  IST Login Time Simulator:
                </span>
                <span className="text-[10px] text-zinc-400">(Rule: 10:00-12:00 IST = Light)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={!simulatedTime ? "default" : "outline"}
                  onClick={() => setSimulatedTime("")}
                  className="text-xs h-8"
                >
                  Real System Time
                </Button>
                <Button
                  size="sm"
                  variant={simulatedTime === "10:30" ? "default" : "outline"}
                  onClick={() => setSimulatedTime("10:30")}
                  className="text-xs h-8 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300"
                >
                  10:30 AM (Light)
                </Button>
                <Button
                  size="sm"
                  variant={simulatedTime === "14:00" ? "default" : "outline"}
                  onClick={() => setSimulatedTime("14:00")}
                  className="text-xs h-8 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300"
                >
                  02:00 PM (Dark)
                </Button>
              </div>
            </div>

            {/* Simulated Security Context */}
            <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                Security Context Simulation:
              </label>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  variant={forceNewDevice ? "default" : "outline"}
                  onClick={() => setForceNewDevice(!forceNewDevice)}
                  className={`text-xs h-8 ${forceNewDevice ? "bg-red-600 text-white" : ""}`}
                >
                  {forceNewDevice ? "Force New Device: ON" : "Force New Device: OFF"}
                </Button>

                <Button
                  size="sm"
                  variant={simulatedLocation ? "default" : "outline"}
                  onClick={() =>
                    setSimulatedLocation(
                      simulatedLocation ? null : { city: "Mumbai", state: "Maharashtra" }
                    )
                  }
                  className={`text-xs h-8 ${simulatedLocation ? "bg-red-600 text-white" : ""}`}
                >
                  {simulatedLocation ? "New City: Mumbai" : "City: Standard"}
                </Button>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button size="sm" onClick={() => setIsDevModalOpen(false)} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Channeldialogue isopen={isdialogeopen} onclose={() => setisdialogeopen(false)} mode="create" />
    </header>
  );
};

export default Header;
