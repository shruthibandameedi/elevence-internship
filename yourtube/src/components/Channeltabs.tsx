import React, { useState } from "react";
import { Button } from "./ui/button";

const defaultTabs = [
  { id: "videos", label: "Videos" },
  { id: "downloads", label: "Downloads" },
  { id: "settings", label: "Settings & Theme" },
  { id: "home", label: "Home" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
  { id: "about", label: "About" },
];

interface ChanneltabsProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const Channeltabs = ({ activeTab: externalActiveTab, setActiveTab: externalSetActiveTab }: ChanneltabsProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState("videos");
  
  const currentActiveTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const handleTabClick = (tabId: string) => {
    if (externalSetActiveTab) {
      externalSetActiveTab(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 bg-white dark:bg-zinc-900 transition-colors duration-200">
      <div className="flex gap-8 overflow-x-auto">
        {defaultTabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`px-0 py-4 border-b-2 rounded-none font-medium ${
              currentActiveTab === tab.id
                ? "border-red-600 dark:border-red-500 text-zinc-900 dark:text-zinc-100 font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Channeltabs;
