import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const TeamInviteSchema = new Schema(
  {
    teamId: {
      type: Types.ObjectId,
      ref: "Team",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
    },
    invitedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
      index: { expires: "1s" },
    },
  },
  {
    timestamps: true,
  }
);

TeamInviteSchema.index(
  { teamId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("TeamInvite", TeamInviteSchema);
