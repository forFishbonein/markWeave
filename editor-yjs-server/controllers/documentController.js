import Doc from "../models/Doc.js";
import Team from "../models/Team.js";
import { v4 as uuidv4 } from "uuid";

export const createDocument = async (req, res, next) => {
  try {
    const { title, teamId } = req.body;
    const team = await Team.findById(teamId);
    if (!team || !team.members.some((m) => m.userId.equals(req.user.userId))) {
      return res
        .status(403)
        .json({ msg: "No permission to create documents in this team" });
    }

    const docId = uuidv4();

    const doc = new Doc({
      docId,
      title: title || "Untitled Document",
      teamId,
      ownerId: req.user.userId,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [],
          },
        ],
      },
      participants: [{ userId: req.user.userId, role: "owner" }],
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

export const getTeamDocuments = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team || !team.members.some((m) => m.userId.equals(req.user.userId))) {
      return res.status(404).json({ msg: "Team not found" });
    }
    const docs = await Doc.find({ teamId }).populate("ownerId", "username");
    res.json(docs);
  } catch (err) {
    next(err);
  }
};

export const getDocumentDetails = async (req, res, next) => {
  try {
    const doc = await Doc.findOne({ docId: req.params.docId })
      .populate("ownerId", "username")
      .populate("teamId", "name");

    if (!doc) {
      return res.status(404).json({ msg: "Document not found" });
    }

    const team = await Team.findById(doc.teamId);
    if (!team.members.some((m) => m.userId.equals(req.user.userId))) {
      return res
        .status(403)
        .json({ msg: "No permission to access this document" });
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
};

export const updateDocument = async (req, res, next) => {
  try {
    const { title } = req.body;
    const doc = await Doc.findOne({ docId: req.params.docId });

    if (!doc) {
      return res.status(404).json({ msg: "Document not found" });
    }

    const isOwner = doc.ownerId.equals(req.user.userId);
    const isEditor = doc.participants.some(
      (p) => p.userId.equals(req.user.userId) && p.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return res
        .status(403)
        .json({ msg: "No permission to modify this document" });
    }

    if (title) {
      doc.title = title;
      doc.lastUpdated = new Date();
    }

    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Doc.findOne({ docId: req.params.docId });

    if (!doc) {
      return res.status(404).json({ msg: "Document not found" });
    }

    if (!doc.ownerId.equals(req.user.userId)) {
      return res.status(403).json({ msg: "Only owner can delete document" });
    }

    await doc.deleteOne();
    res.json({ msg: "Document deleted" });
  } catch (err) {
    next(err);
  }
};
