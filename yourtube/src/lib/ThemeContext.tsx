import React, { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "./axiosinstance";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode, userId?: string) => Promise<void>;
  simulatedTime: string;
  setSimulatedTime: (time: string) => void;
  simulatedLocation: { city: string; state: string } | null;
  setSimulatedLocation: (loc: { city: string; state: string } | null) => void;
  forceNewDevice: boolean;
  setForceNewDevice: (force: boolean) => void;
  calculateISTDefaultTheme: (simTime?: string) => ThemeMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const calculateISTDefaultTheme = (simulatedTimeStr?: string): ThemeMode => {
  if (simulatedTimeStr) {
    const [h, m] = simulatedTimeStr.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const totalMinutes = h * 60 + m;
      return totalMinutes >= 600 && totalMinutes <= 720 ? "light" : "dark";
    }
  }

  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);

  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "hour") hour = parseInt(part.value, 10);
    if (part.type === "minute") minute = parseInt(part.value, 10);
  }
  if (hour === 24) hour = 0;

  const totalMinutes = hour * 60 + minute;
  // 10:00 AM IST (600 mins) to 12:00 PM IST (720 mins) -> light, else dark
  return totalMinutes >= 600 && totalMinutes <= 720 ? "light" : "dark";
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [simulatedTime, setSimulatedTime] = useState<string>("");
  const [simulatedLocation, setSimulatedLocation] = useState<{ city: string; state: string } | null>(null);
  const [forceNewDevice, setForceNewDevice] = useState<boolean>(false);

  // Apply CSS class to document root element
  const applyDOMTheme = (mode: ThemeMode) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    if (mode === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
  };

  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("yt_theme") as ThemeMode | null;
    const userJson = localStorage.getItem("user");
    let userTheme: ThemeMode | null = null;
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u && (u.themePreference === "light" || u.themePreference === "dark")) {
          userTheme = u.themePreference;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Theme Priority:
    // 1. Manually saved preference (user profile or localStorage)
    // 2. Default login time in IST (10:00 AM - 12:00 PM IST = light, else dark)
    const initialTheme = userTheme || savedTheme || calculateISTDefaultTheme(simulatedTime);
    setThemeState(initialTheme);
    applyDOMTheme(initialTheme);
  }, []);

  // Update theme when simulatedTime changes and there's no manual override
  useEffect(() => {
    if (!simulatedTime) return;
    const savedTheme = localStorage.getItem("yt_theme");
    const userJson = localStorage.getItem("user");
    let hasManualPref = false;
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u.themePreference) hasManualPref = true;
      } catch (e) {}
    }
    if (!savedTheme && !hasManualPref) {
      const calculated = calculateISTDefaultTheme(simulatedTime);
      setThemeState(calculated);
      applyDOMTheme(calculated);
    }
  }, [simulatedTime]);

  const setTheme = async (mode: ThemeMode, userId?: string) => {
    setThemeState(mode);
    applyDOMTheme(mode);
    localStorage.setItem("yt_theme", mode);

    // Also update localStorage user object if available
    const userJson = localStorage.getItem("user");
    if (userJson) {
      try {
        const userObj = JSON.parse(userJson);
        userObj.themePreference = mode;
        localStorage.setItem("user", JSON.stringify(userObj));

        const targetId = userId || userObj._id;
        if (targetId) {
          await axiosInstance.patch(`/user/theme/${targetId}`, { themePreference: mode });
        }
      } catch (err) {
        console.error("Failed to save theme to backend user profile:", err);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        simulatedTime,
        setSimulatedTime,
        simulatedLocation,
        setSimulatedLocation,
        forceNewDevice,
        setForceNewDevice,
        calculateISTDefaultTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
