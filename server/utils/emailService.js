import nodemailer from "nodemailer";

export const sendSubscriptionConfirmationEmail = async ({
  userEmail,
  userName,
  plan,
  amount,
  currency = "INR",
  transactionId,
  orderId,
  paymentStatus = "success",
  subscriptionDate = new Date(),
  expiryDate = null,
}) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPass) {
    console.log(
      "ℹ️ EMAIL_USER or EMAIL_PASSWORD not set in server/.env. Skipping confirmation email dispatch."
    );
    return { success: false, message: "Email credentials not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const formattedAmount = `${currency === "INR" ? "₹" : currency + " "}${amount}`;
    const formattedDate = new Date(subscriptionDate).toLocaleString();
    const formattedExpiry = expiryDate
      ? new Date(expiryDate).toLocaleDateString()
      : "1 Year from date of purchase";

    const mailOptions = {
      from: `"YourTube Subscriptions" <${emailUser}>`,
      to: userEmail,
      subject: `🎉 Subscription Confirmed: ${plan.toUpperCase()} Plan Upgrade`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">YourTube Subscription Invoice</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Thank you for upgrading!</p>
          </div>
          <div style="padding: 24px; color: #333333; line-height: 1.6;">
            <p>Hi <strong>${userName || "Valued User"}</strong>,</p>
            <p>Your subscription payment of <strong>${formattedAmount}</strong> has been successfully processed.</p>
            
            <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #111827; border-b: 1px solid #e5e7eb; padding-bottom: 8px;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #6b7280;">User Name:</td><td style="font-weight: bold; text-align: right;">${userName || "User"}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Plan Name:</td><td style="font-weight: bold; color: #dc2626; text-align: right;">${plan.toUpperCase()}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Amount Paid:</td><td style="font-weight: bold; text-align: right;">${formattedAmount}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Payment Status:</td><td style="font-weight: bold; color: #059669; text-align: right; text-transform: uppercase;">${paymentStatus}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Razorpay Order ID:</td><td style="font-mono; text-align: right;">${orderId}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Payment ID:</td><td style="font-mono; text-align: right;">${transactionId}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Subscription Date:</td><td style="text-align: right;">${formattedDate}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Expiry Date:</td><td style="text-align: right;">${formattedExpiry}</td></tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #6b7280;">
              You can now enjoy your ${plan.toUpperCase()} plan perks on YourTube. Visit your profile or subscription page to view your limits.
            </p>
          </div>
          <div style="background-color: #f3f4f6; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} YourTube App. All rights reserved.
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✉️ Confirmation email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("⚠️ Failed to send subscription confirmation email:", error.message || error);
    return { success: false, error: error.message };
  }
};
