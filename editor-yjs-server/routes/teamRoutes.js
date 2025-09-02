import express from "express";
import { body, param } from "express-validator";
import * as teamController from "../controllers/teamController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Invitation related routes (parts that don't need authentication)
// Get invitation details (public access, with token)
router.get(
  "/invite/:token",
  [param("token").notEmpty().withMessage("Invitation token cannot be empty")],
  validateRequest,
  teamController.getInviteDetails
);

// Reject invitation (no authentication needed)
router.post(
  "/invite/:token/reject",
  [param("token").notEmpty().withMessage("Invitation token cannot be empty")],
  validateRequest,
  teamController.rejectInvite
);

// Accept invitation (authentication required)
router.post(
  "/invite/:token/accept",
  [param("token").notEmpty().withMessage("Invitation token cannot be empty")],
  validateRequest,
  authenticate,
  teamController.acceptInvite
);

// Following routes require authentication
router.use(authenticate);

router.post(
  "/",
  [body("name").notEmpty().withMessage("Team name cannot be empty")],
  validateRequest,
  teamController.createTeam
);

router.get("/", teamController.getUserTeams);

router.get(
  "/:teamId",
  [param("teamId").isMongoId().withMessage("Invalid team ID")],
  validateRequest,
  teamController.getTeamDetails
);

router.put(
  "/:teamId",
  [
    param("teamId").isMongoId().withMessage("Invalid team ID"),
    body("name").optional().notEmpty().withMessage("Team name cannot be empty"),
  ],
  validateRequest,
  teamController.updateTeam
);

router.post(
  "/:teamId/invite",
  [
    param("teamId").isMongoId().withMessage("Invalid team ID"),
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("role").optional().isIn(["admin", "member"]).withMessage("Invalid role"),
  ],
  validateRequest,
  teamController.inviteMember
);

router.delete(
  "/:teamId/members/:memberId",
  [
    param("teamId").isMongoId().withMessage("Invalid team ID"),
    param("memberId").isMongoId().withMessage("Invalid member ID"),
  ],
  validateRequest,
  teamController.removeMember
);

export default router;
