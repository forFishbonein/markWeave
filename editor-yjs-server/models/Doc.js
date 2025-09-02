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
  { _id: false } // Do not generate separate _id for sub-documents
);

const DocSchema = new Schema({
  docId: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: "Untitled Document", trim: true },
  teamId: { type: Types.ObjectId, ref: "Team", required: true },
  content: {
    type: Schema.Types.Mixed,
    default: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    },
  }, // JSON format document content
  ownerId: { type: Types.ObjectId, ref: "User", required: true },
  participants: { type: [Participant], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
});

// Add index
DocSchema.index({ docId: 1 });
DocSchema.index({ teamId: 1 });
DocSchema.index({ ownerId: 1 });

export default mongoose.model("Doc", DocSchema);
