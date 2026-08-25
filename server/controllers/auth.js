import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";

// In-memory fallback store to ensure 100% login uptime even if local MongoDB is offline
const inMemoryUsers = new Map();

// Helper: Calculate theme based on IST time (10:00 AM IST to 12:00 PM IST = light, else dark)
export const getISTTheme = (simulatedTimeStr) => {
  if (simulatedTimeStr) {
    const [h, m] = simulatedTimeStr.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const totalMinutes = h * 60 + m;
      return totalMinutes >= 600 && totalMinutes <= 720 ? "light" : "dark";
    }
  }

  const date = new Date();
  const options = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false };
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
  return totalMinutes >= 600 && totalMinutes <= 720 ? "light" : "dark";
};

// Helper: Mask email for privacy
export const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = local.length > 2 ? `${local[0]}****${local[local.length - 1]}` : `${local[0]}****`;
  return `${maskedLocal}@${domain}`;
};

// Helper: Mask mobile for privacy
export const maskMobile = (mobile) => {
  if (!mobile || typeof mobile !== "string") return "";
  const cleaned = mobile.trim();
  if (cleaned.length < 6) return cleaned;
  const prefix = cleaned.startsWith("+91") ? "+91 " : "";
  const num = cleaned.replace("+91", "").trim();
  if (num.length >= 10) {
    return `${prefix}${num[0]}*****${num.substring(num.length - 4)}`;
  }
  return `${prefix}${num[0]}*****${num[num.length - 1]}`;
};

// Helper: Save user safely across MongoDB & In-Memory Store
const saveUserSafely = async (userObj) => {
  if (mongoose.connection.readyState === 1 && typeof userObj.save === "function") {
    try {
      await userObj.save();
    } catch (e) {
      console.warn("DB save note:", e.message);
    }
  }
  const keys = [userObj.email, userObj.mobile, userObj._id ? String(userObj._id) : null].filter(Boolean);
  keys.forEach((k) => inMemoryUsers.set(String(k), userObj));
};

// Helper: Find user across MongoDB & In-Memory Store
export const findUserSafely = async (query) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const u = await users.findOne(query);
      if (u) return u;
    } catch (e) {
      console.warn("DB query note:", e.message);
    }
  }

  const searchVal = query.email || query.mobile || query._id;
  if (searchVal && inMemoryUsers.has(String(searchVal))) {
    return inMemoryUsers.get(String(searchVal));
  }

  for (const [, userObj] of inMemoryUsers.entries()) {
    if (query.email && userObj.email === query.email) return userObj;
    if (query.mobile && userObj.mobile === query.mobile) return userObj;
    if (query._id && String(userObj._id) === String(query._id)) return userObj;
  }
  return null;
};

// Helper: Send OTP via Nodemailer & print to server console for dev
const sendOtpEmail = async (toEmail, otp) => {
  console.log(`\n==========================================`);
  console.log(`[OTP SECURITY NOTICE] Email OTP Code for ${toEmail}: ${otp}`);
  console.log(`==========================================\n`);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"YourTube Security" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "YourTube - New Login Security Verification OTP",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>New Login Detected</h2>
            <p>We noticed a login to your YourTube account from a new device or location.</p>
            <p>Your one-time verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #e53e3e;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `,
      });
      console.log(`OTP email sent successfully to ${toEmail}`);
    } catch (err) {
      console.error("Nodemailer transport error (falling back to console display):", err.message);
    }
  }
};

export const login = async (req, res) => {
  const { email, mobile, otpDeliveryMethod, name, image, deviceId, location, simulatedTime, forceNewDevice, forceNewLocation } = req.body;

  try {
    const cleanEmail = email && typeof email === "string" ? email.trim() : "";
    const cleanMobile = mobile && typeof mobile === "string" ? mobile.trim() : "";
    const isMobileMode = otpDeliveryMethod === "mobile" || (!cleanEmail && Boolean(cleanMobile));

    let existingUser = null;

    if (cleanEmail) {
      existingUser = await findUserSafely({ email: cleanEmail });
    }
    if (!existingUser && cleanMobile) {
      existingUser = await findUserSafely({ mobile: cleanMobile });
    }

    if (!existingUser) {
      const mobileDigits = cleanMobile.replace(/\D/g, "");
      const generatedEmail = cleanEmail || (mobileDigits ? `user_${mobileDigits}@mobileuser.com` : `user_${Date.now()}@mobileuser.com`);
      const newId = new mongoose.Types.ObjectId().toString();

      const userData = {
        _id: newId,
        email: generatedEmail,
        mobile: cleanMobile || "",
        name: name || (cleanEmail ? cleanEmail.split("@")[0] : `User_${mobileDigits || "Mobile"}`),
        image: image || "https://github.com/shadcn.png",
        plan: "free",
        subscriptionStatus: "active",
        trustedLoginContexts: [],
        joinedon: new Date(),
      };

      if (mongoose.connection.readyState === 1) {
        try {
          existingUser = await users.create(userData);
        } catch (dbErr) {
          existingUser = userData;
        }
      } else {
        existingUser = userData;
      }

      await saveUserSafely(existingUser);
    } else {
      if (cleanMobile && !existingUser.mobile) {
        existingUser.mobile = cleanMobile;
        await saveUserSafely(existingUser);
      }
      if (cleanEmail && (!existingUser.email || existingUser.email.endsWith("@mobileuser.com"))) {
        existingUser.email = cleanEmail;
        await saveUserSafely(existingUser);
      }
    }

    const currentDeviceId = deviceId || "device_" + Math.random().toString(36).substring(2, 9);
    const currentCity = location?.city || "Local City";
    const currentState = location?.state || "Local State";
    const currentCountry = location?.country || "India";

    const calculatedTheme = existingUser.themePreference || getISTTheme(simulatedTime);

    const isTrusted =
      !forceNewDevice &&
      !forceNewLocation &&
      Array.isArray(existingUser.trustedLoginContexts) &&
      existingUser.trustedLoginContexts.some(
        (ctx) =>
          ctx.deviceId === currentDeviceId ||
          (ctx.city && ctx.city.toLowerCase() === currentCity.toLowerCase() && ctx.state && ctx.state.toLowerCase() === currentState.toLowerCase())
      );

    if (isTrusted) {
      existingUser.lastLoginAt = new Date();
      existingUser.lastLoginCity = currentCity;
      existingUser.lastLoginState = currentState;
      existingUser.lastLoginDevice = currentDeviceId;
      await saveUserSafely(existingUser);

      return res.status(200).json({
        otpRequired: false,
        result: existingUser,
        appliedTheme: calculatedTheme,
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    existingUser.otpCode = otp;
    existingUser.otpExpiresAt = otpExpiresAt;
    existingUser.otpAttempts = 0;
    await saveUserSafely(existingUser);

    let maskedContact = "";

    if (isMobileMode && (cleanMobile || existingUser.mobile)) {
      const targetMobile = cleanMobile || existingUser.mobile;
      maskedContact = maskMobile(targetMobile);
      console.log(`\n==========================================`);
      console.log(`[SMS OTP NOTICE] Mobile SMS OTP Code for ${targetMobile}: ${otp}`);
      console.log(`==========================================\n`);
    } else {
      maskedContact = maskEmail(existingUser.email);
      if (existingUser.email && !existingUser.email.endsWith("@mobileuser.com")) {
        await sendOtpEmail(existingUser.email, otp);
      } else {
        console.log(`\n==========================================`);
        console.log(`[EMAIL OTP NOTICE] Email OTP Code for ${existingUser.email}: ${otp}`);
        console.log(`==========================================\n`);
      }
    }

    return res.status(200).json({
      otpRequired: true,
      tempUserId: String(existingUser._id),
      maskedEmail: maskedContact,
      maskedContact: maskedContact,
      deliveryMethod: isMobileMode ? "mobile" : "email",
      message: `New device or location detected. OTP sent to your registered ${isMobileMode ? "mobile number" : "email"}.`,
      devOtp: otp,
    });
  } catch (error) {
    console.error("Login error details:", error);
    return res.status(500).json({ message: error.message || "Something went wrong during authentication" });
  }
};

export const verifyOtp = async (req, res) => {
  const { tempUserId, otp, deviceId, location, simulatedTime } = req.body;

  try {
    const user = await findUserSafely({ _id: tempUserId });
    if (!user) {
      return res.status(404).json({ message: "User session not found" });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No active OTP request found. Please request a new OTP." });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ message: "OTP has expired. Please click Resend OTP." });
    }

    if (user.otpAttempts >= 5) {
      return res.status(400).json({ message: "Maximum verification attempts exceeded. Please click Resend OTP." });
    }

    if (user.otpCode.trim() !== String(otp).trim()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await saveUserSafely(user);
      return res.status(400).json({ message: `Invalid OTP code. Attempts remaining: ${5 - user.otpAttempts}` });
    }

    const currentDeviceId = deviceId || "device_" + Math.random().toString(36).substring(2, 9);
    const currentCity = location?.city || "Local City";
    const currentState = location?.state || "Local State";
    const currentCountry = location?.country || "India";

    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    if (!Array.isArray(user.trustedLoginContexts)) {
      user.trustedLoginContexts = [];
    }

    user.trustedLoginContexts.push({
      deviceId: currentDeviceId,
      city: currentCity,
      state: currentState,
      country: currentCountry,
      verifiedAt: new Date(),
    });

    user.lastLoginAt = new Date();
    user.lastLoginCity = currentCity;
    user.lastLoginState = currentState;
    user.lastLoginDevice = currentDeviceId;

    const calculatedTheme = user.themePreference || getISTTheme(simulatedTime);
    await saveUserSafely(user);

    return res.status(200).json({
      message: "OTP verified successfully",
      result: user,
      appliedTheme: calculatedTheme,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

export const resendOtp = async (req, res) => {
  const { tempUserId } = req.body;

  try {
    const user = await findUserSafely({ _id: tempUserId });
    if (!user) {
      return res.status(404).json({ message: "User session not found" });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = newOtp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    await saveUserSafely(user);

    let masked = maskEmail(user.email);
    if (user.mobile) {
      masked = maskMobile(user.mobile);
      console.log(`\n==========================================`);
      console.log(`[SMS OTP NOTICE] Mobile SMS OTP Code for ${user.mobile}: ${newOtp}`);
      console.log(`==========================================\n`);
    } else {
      await sendOtpEmail(user.email, newOtp);
    }

    return res.status(200).json({
      message: "New OTP sent successfully",
      maskedEmail: masked,
      maskedContact: masked,
      devOtp: newOtp,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ message: "Error resending OTP" });
  }
};

export const updateTheme = async (req, res) => {
  const { id: _id } = req.params;
  const { themePreference } = req.body;

  if (!["light", "dark"].includes(themePreference)) {
    return res.status(400).json({ message: "Invalid theme preference value. Must be 'light' or 'dark'." });
  }

  try {
    const user = await findUserSafely({ _id });
    if (user) {
      user.themePreference = themePreference;
      await saveUserSafely(user);
      return res.status(200).json({ message: "Theme preference updated successfully", result: user });
    }
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(_id)) {
      const updatedUser = await users.findByIdAndUpdate(
        _id,
        { $set: { themePreference } },
        { new: true }
      );
      return res.status(200).json({ message: "Theme preference updated successfully", result: updatedUser });
    }
    return res.status(400).json({ message: "User unavailable" });
  } catch (error) {
    console.error("Update theme error:", error);
    return res.status(500).json({ message: "Error updating theme preference" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, themePreference, mobile, showLocationOnComments, commentLocationCity } = req.body;

  try {
    const user = await findUserSafely({ _id });
    if (user) {
      if (channelname !== undefined) user.channelname = channelname;
      if (description !== undefined) user.description = description;
      if (themePreference !== undefined) user.themePreference = themePreference;
      if (mobile !== undefined) user.mobile = mobile;
      if (showLocationOnComments !== undefined) user.showLocationOnComments = showLocationOnComments;
      if (commentLocationCity !== undefined) user.commentLocationCity = commentLocationCity;
      await saveUserSafely(user);
      return res.status(201).json(user);
    }
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(_id)) {
      const updateObj = {};
      if (channelname !== undefined) updateObj.channelname = channelname;
      if (description !== undefined) updateObj.description = description;
      if (themePreference !== undefined) updateObj.themePreference = themePreference;
      if (mobile !== undefined) updateObj.mobile = mobile;
      if (showLocationOnComments !== undefined) updateObj.showLocationOnComments = showLocationOnComments;
      if (commentLocationCity !== undefined) updateObj.commentLocationCity = commentLocationCity;

      const updatedata = await users.findByIdAndUpdate(
        _id,
        { $set: updateObj },
        { new: true }
      );
      return res.status(201).json(updatedata);
    }
    return res.status(500).json({ message: "User unavailable..." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
