import User from "../models/User.js";
import { generateToken } from "../utils/token.js";

export const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        msg: "User already exists",
      });
    }

    // Create new user
    user = new User({ email, username, password });
    await user.save();

    // Generate JWT token
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

    // Find user (including password field)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "Email or password incorrect",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        msg: "Email or password incorrect",
      });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
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
        msg: "User does not exist",
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
