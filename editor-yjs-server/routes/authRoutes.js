import express from "express";
import { body } from "express-validator";
import { register, login, getProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("username").notEmpty().withMessage("Username cannot be empty"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validateRequest,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("password").notEmpty().withMessage("Password cannot be empty"),
  ],
  validateRequest,
  login
);

router.get("/profile", authenticate, getProfile);

export default router;
