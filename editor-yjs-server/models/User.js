import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "邮箱是必需的"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "请输入有效的邮箱地址",
      ],
    },
    username: {
      type: String,
      required: [true, "用户名是必需的"],
      trim: true,
      minlength: [2, "用户名至少2个字符"],
      maxlength: [30, "用户名最多30个字符"],
    },
    password: {
      type: String,
      required: [true, "密码是必需的"],
      minlength: [6, "密码至少6个字符"],
      select: false, // 默认查询不返回密码
    },
    avatar: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 密码加密中间件
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", UserSchema);
