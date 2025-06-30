import User from "../models/User.js";
import { generateToken } from "../utils/token.js";

export const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "用户已存在" });
    }
    user = new User({ email, username, password });
    await user.save();
    const token = generateToken({ userId: user._id });
    res.status(201).json({ token, userId: user._id, username: user.username });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ msg: "无效的凭证" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: "无效的凭证" });
    }
    const token = generateToken({ userId: user._id });
    res.json({ token, userId: user._id, username: user.username });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json(user);
  } catch (err) {
    next(err);
  }
};
