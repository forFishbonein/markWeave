/*
 * @FilePath: Doc.js
 * @Author: Aron
 * @Date: 2025-06-03 00:35:05
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-03 00:38:52
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// models/Doc.ts
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const Participant = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], required: true },
  },
  { _id: false } // 不给子文档单独生成 _id
);

const DocSchema = new Schema({
  docId: { type: String, required: true, unique: true, index: true },
  state: { type: Buffer, required: true }, // Yjs binary
  title: { type: String, default: "Untitled" },
  ownerId: { type: Types.ObjectId, ref: "User", required: true },
  participants: { type: [Participant], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("Doc", DocSchema);
