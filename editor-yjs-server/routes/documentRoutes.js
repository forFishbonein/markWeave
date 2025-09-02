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
    body("title").notEmpty().withMessage("Document title cannot be empty"),
    body("teamId").isMongoId().withMessage("Invalid team ID"),
  ],
  validateRequest,
  documentController.createDocument
);

router.get(
  "/team/:teamId",
  [param("teamId").isMongoId().withMessage("Invalid team ID")],
  validateRequest,
  documentController.getTeamDocuments
);

router.get(
  "/:docId",
  [param("docId").isMongoId().withMessage("Invalid document ID")],
  validateRequest,
  documentController.getDocumentDetails
);

router.put(
  "/:docId",
  [
    param("docId").isMongoId().withMessage("Invalid document ID"),
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
  ],
  validateRequest,
  documentController.updateDocument
);

router.delete(
  "/:docId",
  [param("docId").isMongoId().withMessage("Invalid document ID")],
  validateRequest,
  documentController.deleteDocument
);

export default router;
