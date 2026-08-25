import express from "express";
import {
  requestDownload,
  getDownloadUsage,
  getDownloadHistory,
  updateUserPlan,
  downloadVideoFile,
} from "../controllers/download.js";

const router = express.Router();

router.post("/:videoId", requestDownload);
router.get("/usage/:userId", getDownloadUsage);
router.get("/history/:userId", getDownloadHistory);
router.put("/plan/:userId", updateUserPlan);
router.get("/file/:videoId", downloadVideoFile);

export default router;
