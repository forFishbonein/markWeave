import express from "express";
import { body, param } from "express-validator";
import * as teamController from "../controllers/teamController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = express.Router();

// 邀请相关路由（不需要authentication的部分）
// 获取邀请详情（公开访问，通过令牌）
router.get(
  "/invite/:token",
  [param("token").notEmpty().withMessage("邀请令牌不能为空")],
  validateRequest,
  teamController.getInviteDetails
);

// 拒绝邀请（不需要认证）
router.post(
  "/invite/:token/reject",
  [param("token").notEmpty().withMessage("邀请令牌不能为空")],
  validateRequest,
  teamController.rejectInvite
);

// 接受邀请（需要认证）
router.post(
  "/invite/:token/accept",
  [param("token").notEmpty().withMessage("邀请令牌不能为空")],
  validateRequest,
  authenticate,
  teamController.acceptInvite
);

// 以下路由需要认证
router.use(authenticate);

router.post(
  "/",
  [body("name").notEmpty().withMessage("团队名称不能为空")],
  validateRequest,
  teamController.createTeam
);

router.get("/", teamController.getUserTeams);

router.get(
  "/:teamId",
  [param("teamId").isMongoId().withMessage("无效的团队ID")],
  validateRequest,
  teamController.getTeamDetails
);

router.put(
  "/:teamId",
  [
    param("teamId").isMongoId().withMessage("无效的团队ID"),
    body("name").optional().notEmpty().withMessage("团队名称不能为空"),
  ],
  validateRequest,
  teamController.updateTeam
);

router.post(
  "/:teamId/invite",
  [
    param("teamId").isMongoId().withMessage("无效的团队ID"),
    body("email").isEmail().withMessage("请输入有效的邮箱地址"),
    body("role").optional().isIn(["admin", "member"]).withMessage("无效的角色"),
  ],
  validateRequest,
  teamController.inviteMember
);

router.delete(
  "/:teamId/members/:memberId",
  [
    param("teamId").isMongoId().withMessage("无效的团队ID"),
    param("memberId").isMongoId().withMessage("无效的成员ID"),
  ],
  validateRequest,
  teamController.removeMember
);

export default router;
