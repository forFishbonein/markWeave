import React from "react";
import LoginRegister from "./components/LoginRegister";
// import { WebsocketProvider } from "y-websocket";
// import { ydoc } from "./components/CRDT";

// 1️⃣ 连接 WebSocket
// const provider = new WebsocketProvider("ws://localhost:1234", "room1", ydoc);
// provider.on("status", (event) => console.log("WebSocket 状态:", event.status));

function App() {
  return (
    <div>
      <h1>Peritext CRDT + Yjs + ProseMirror</h1>
      <Editor />
    </div>
  );
}

export default App;
