import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginRegister from "./components/LoginRegister";
import DocumentList from "./components/DocumentList";
import TeamSettings from "./components/TeamSettings";
import Editor from "./components/Editor";
// import { WebsocketProvider } from "y-websocket";
// import { ydoc } from "./components/CRDT";

// 1️⃣ 连接 WebSocket
// const provider = new WebsocketProvider("ws://localhost:1234", "room1", ydoc);
// provider.on("status", (event) => console.log("WebSocket 状态:", event.status));

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/login' element={<LoginRegister />} />
        <Route path='/documents' element={<DocumentList />} />
        <Route path='/editor/:id' element={<Editor />} />
        <Route path='/team-settings' element={<TeamSettings />} />
        <Route path='*' element={<Navigate to='/login' replace />} />
      </Routes>
    </Router>
  );
}

export default App;
