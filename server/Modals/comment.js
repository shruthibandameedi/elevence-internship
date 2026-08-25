import mongoose from "mongoose";
const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    userAvatar: { type: String, default: "" },
    locationDisplay: { type: String, default: "" },
    likes: [{ type: String }],
    dislikes: [{ type: String }],
    reports: [
      {
        userId: { type: String },
        reason: { type: String },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    isReported: { type: Boolean, default: false },
    moderationStatus: {
      type: String,
      enum: ["normal", "flagged", "under_review", "resolved"],
      default: "normal",
    },
    commentedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
