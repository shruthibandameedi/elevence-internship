import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    userPlan: {
      type: String,
      required: true,
      default: "free",
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    videoTitle: {
      type: String,
      required: true,
    },
    videoDetails: {
      filename: { type: String },
      filepath: { type: String },
      filetype: { type: String },
      filesize: { type: String },
      videochanel: { type: String },
      uploader: { type: String },
    },
    downloadDate: {
      type: String,
      required: true,
    },
    downloadTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("download", downloadSchema);
