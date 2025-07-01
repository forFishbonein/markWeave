import User from "../models/User.js";
import { generateToken } from "../utils/token.js";

export const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // 检查用户是否已存在
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        msg: "用户已存在",
      });
    }

    // 创建新用户
    user = new User({ email, username, password });
    await user.save();

    // 生成JWT token
    const token = generateToken({ userId: user._id });

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 查找用户（包含密码字段）
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "邮箱或密码错误",
      });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        msg: "邮箱或密码错误",
      });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成JWT token
    const token = generateToken({ userId: user._id });

    res.json({
      success: true,
      token,
      user: {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "用户不存在",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};
