import express from "express";
import { body, param } from "express-validator";
import * as documentController from "../controllers/documentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  [
    body("title").notEmpty().withMessage("文档标题不能为空"),
    body("teamId").isMongoId().withMessage("无效的团队ID"),
  ],
  validateRequest,
  documentController.createDocument
);

router.get(
  "/team/:teamId",
  [param("teamId").isMongoId().withMessage("无效的团队ID")],
  validateRequest,
  documentController.getTeamDocuments
);

router.get(
  "/:docId",
  [param("docId").isMongoId().withMessage("无效的文档ID")],
  validateRequest,
  documentController.getDocumentDetails
);

router.put(
  "/:docId",
  [
    param("docId").isMongoId().withMessage("无效的文档ID"),
    body("title").optional().notEmpty().withMessage("标题不能为空"),
  ],
  validateRequest,
  documentController.updateDocument
);

router.delete(
  "/:docId",
  [param("docId").isMongoId().withMessage("无效的文档ID")],
  validateRequest,
  documentController.deleteDocument
);

export default router;
