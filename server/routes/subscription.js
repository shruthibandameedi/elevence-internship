import express from "express";
import {
  getPlans,
  getCurrentSubscription,
  createOrder,
  verifyPayment,
  getTransactions,
} from "../controllers/subscription.js";

const router = express.Router();

router.get("/plans", getPlans);
router.get("/current/:userId", getCurrentSubscription);
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/transactions/:userId", getTransactions);

export default router;
