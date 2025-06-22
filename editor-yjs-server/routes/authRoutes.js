import express from "express";
import { body } from "express-validator";
import { register, login, getProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("请输入有效的邮箱地址"),
    body("username").notEmpty().withMessage("用户名不能为空"),
    body("password").isLength({ min: 6 }).withMessage("密码至少需要6位"),
  ],
  validateRequest,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("请输入有效的邮箱地址"),
    body("password").notEmpty().withMessage("密码不能为空"),
  ],
  validateRequest,
  login
);

router.get("/profile", authenticate, getProfile);

export default router;
