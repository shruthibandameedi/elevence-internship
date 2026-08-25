import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const getOrCreateDeviceId = () => {
  if (typeof window === "undefined") return "device_default";
  let devId = localStorage.getItem("yt_device_id");
  if (!devId) {
    devId = "device_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("yt_device_id", devId);
  }
  return devId;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pendingOtp, setPendingOtp] = useState(null);
  const [isOtpOpen, setIsOtpOpen] = useState(false);

  useEffect(() => {
    // Restore user from localStorage if present
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }
    }
  }, []);

  const login = (userdata, themeToApply, onThemeChange) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));

    if (themeToApply && onThemeChange) {
      onThemeChange(themeToApply, userdata._id);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handleLoginRequest = async (payload, onThemeChange, simOptions = {}) => {
    try {
      const deviceId = getOrCreateDeviceId();
      const location = simOptions.simulatedLocation || { city: "New Delhi", state: "Delhi", country: "India" };

      const body = {
        ...payload,
        mobile: simOptions.mobile || payload.mobile || "",
        otpDeliveryMethod: simOptions.otpDeliveryMethod || payload.otpDeliveryMethod || "email",
        deviceId,
        location,
        simulatedTime: simOptions.simulatedTime,
        forceNewDevice: simOptions.forceNewDevice,
        forceNewLocation: Boolean(simOptions.simulatedLocation),
      };

      const response = await axiosInstance.post("/user/login", body);

      if (response.data.otpRequired) {
        // OTP required for new device/location
        setPendingOtp({
          tempUserId: response.data.tempUserId,
          maskedEmail: response.data.maskedEmail || response.data.maskedContact,
          maskedContact: response.data.maskedContact || response.data.maskedEmail,
          deliveryMethod: response.data.deliveryMethod || "email",
          devOtp: response.data.devOtp,
        });
        setIsOtpOpen(true);
        return { otpRequired: true };
      } else {
        // Direct login
        login(response.data.result, response.data.appliedTheme, onThemeChange);
        return { otpRequired: false, user: response.data.result };
      }
    } catch (error) {
      console.error("Login request error:", error);
      throw error;
    }
  };

  const handlegooglesignin = async (onThemeChange, simOptions = {}) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };

      await handleLoginRequest(payload, onThemeChange, simOptions);
    } catch (error) {
      console.error("Google sign in error:", error);
    }
  };

  const handleDemoSignIn = async (email, name, onThemeChange, simOptions = {}) => {
    const payload = {
      email: email || "",
      mobile: simOptions.mobile || "",
      otpDeliveryMethod: simOptions.otpDeliveryMethod || "email",
      name: name || "Demo User",
      image: "https://github.com/shadcn.png",
    };
    return await handleLoginRequest(payload, onThemeChange, simOptions);
  };

  const updateUserPlan = (newPlan) => {
    if (!user) return;
    const updatedUser = { ...user, plan: newPlan };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const updateUserData = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        handleDemoSignIn,
        updateUserPlan,
        updateUserData,
        pendingOtp,
        isOtpOpen,
        setIsOtpOpen,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
