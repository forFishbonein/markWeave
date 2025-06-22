import Doc from "../models/Doc.js";
import Team from "../models/Team.js";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";

export const createDocument = async (req, res, next) => {
  try {
    const { title, teamId } = req.body;
    const team = await Team.findById(teamId);
    if (!team || !team.members.some((m) => m.userId.equals(req.user.userId))) {
      return res.status(403).json({ msg: "无权在此团队中创建文档" });
    }

    const ydoc = new Y.Doc();
    const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    const docId = uuidv4();

    const doc = new Doc({
      docId,
      title,
      teamId,
      ownerId: req.user.userId,
      state,
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
      return res.status(404).json({ msg: "未找到团队" });
    }
    const docs = await Doc.find({ teamId }).populate("ownerId", "username");
    res.json(docs);
  } catch (err) {
    next(err);
  }
};

export const getDocumentDetails = async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.params.docId)
      .populate("ownerId", "username")
      .populate("teamId", "name");
    if (!doc) {
      return res.status(404).json({ msg: "未找到文档" });
    }
    const team = await Team.findById(doc.teamId);
    if (!team.members.some((m) => m.userId.equals(req.user.userId))) {
      return res.status(403).json({ msg: "无权访问此文档" });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

export const updateDocument = async (req, res, next) => {
  try {
    const { title } = req.body;
    const doc = await Doc.findById(req.params.docId);
    if (!doc) {
      return res.status(404).json({ msg: "未找到文档" });
    }
    const isOwner = doc.ownerId.equals(req.user.userId);
    const isEditor = doc.participants.some(
      (p) => p.userId.equals(req.user.userId) && p.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ msg: "无权修改此文档" });
    }
    if (title) doc.title = title;
    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.params.docId);
    if (!doc) {
      return res.status(404).json({ msg: "未找到文档" });
    }
    if (!doc.ownerId.equals(req.user.userId)) {
      return res.status(403).json({ msg: "只有所有者可以删除文档" });
    }
    await doc.deleteOne();
    res.json({ msg: "文档已删除" });
  } catch (err) {
    next(err);
  }
};
