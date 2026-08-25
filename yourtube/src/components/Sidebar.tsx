import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
  Crown,
  Users,
  SunMoon,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useUser() as any;

  const [isdialogeopen, setisdialogeopen] = useState(false);
  return (
    <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 min-h-screen p-2 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <nav className="space-y-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>

        <Link href="/watch-party">
          <Button variant="ghost" className="w-full justify-start text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/40">
            <Users className="w-5 h-5 mr-3" />
            Watch Party
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads">
                <Button variant="ghost" className="w-full justify-start text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/40">
                  <Download className="w-5 h-5 mr-3" />
                  Downloads
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="ghost" className="w-full justify-start text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-50 dark:hover:bg-amber-950/40">
                  <Crown className="w-5 h-5 mr-3" />
                  Upgrade Plan
                </Button>
              </Link>
              {user?.channelname ? (
                <>
                  <Link href={`/channel/${user._id || user.id}`}>
                    <Button variant="ghost" className="w-full justify-start hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <User className="w-5 h-5 mr-3" />
                      Your channel
                    </Button>
                  </Link>
                  <Link href={`/channel/${user._id || user.id}?tab=settings`}>
                    <Button variant="ghost" className="w-full justify-start hover:bg-zinc-100 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400">
                      <SunMoon className="w-5 h-5 mr-3" />
                      Theme & Settings
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
