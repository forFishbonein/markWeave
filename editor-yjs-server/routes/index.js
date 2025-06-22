import express from "express";
import authRoutes from "./authRoutes.js";
import teamRoutes from "./teamRoutes.js";
import documentRoutes from "./documentRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/teams", teamRoutes);
router.use("/documents", documentRoutes);

export default router;
