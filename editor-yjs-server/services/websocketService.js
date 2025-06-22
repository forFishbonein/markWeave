import { setup } from "y-websocket/bin/utils";
import { MONGODB_URI, getDoc, updateDoc } from "../persistence.js";

export const setupWSConnection = (conn, req) => {
  conn.binaryType = "arraybuffer";
  const docName = req.url.slice(1).split("?")[0];
  setup(conn, req, {
    docName: docName,
    gc: true,
    MONGODB_URI: MONGODB_URI,
  });
};

// This is a placeholder for the old logic from server.js
// You can move the logic for handling Yjs documents here.
// For example, the `docs` map, `getYDoc`, etc.
