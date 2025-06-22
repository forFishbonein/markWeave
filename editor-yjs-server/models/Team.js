import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const TeamMemberSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const TeamSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "团队名称是必需的"],
      trim: true,
      maxlength: [100, "团队名称最多100个字符"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "团队描述最多500个字符"],
    },
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [TeamMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TeamSchema.index({ ownerId: 1 });
TeamSchema.index({ "members.userId": 1 });

TeamSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

TeamSchema.pre("save", function (next) {
  if (this.isNew) {
    this.members.push({
      userId: this.ownerId,
      role: "owner",
    });
  }
  next();
});

export default mongoose.model("Team", TeamSchema);
