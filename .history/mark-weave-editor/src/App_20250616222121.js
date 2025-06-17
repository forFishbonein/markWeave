import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginRegister from "./components/LoginRegister";
import Home from "./components/Home/Home";
import TeamLayout from "./components/Team/TeamLayout";
import DocumentList from "./components/Documents/DocumentList";
import EditorPage from "./components/Documents/EditorPage";
import MemberList from "./components/Members/MemberList";
import TeamSettings from "./components/Settings/TeamSettings";
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
        <Route path='/home' element={<Home />} />
        <Route path='/team/:teamId/*' element={<TeamLayout />}>
          <Route path='documents' element={<DocumentList />} />
          <Route path='editor/:docId' element={<EditorPage />} />
          <Route path='members' element={<MemberList />} />
          <Route path='team-settings' element={<TeamSettings />} />
          <Route index element={<Navigate to='documents' replace />} />
        </Route>
        <Route path='*' element={<Navigate to='/login' replace />} />
      </Routes>
    </Router>
  );
}

export default App;
