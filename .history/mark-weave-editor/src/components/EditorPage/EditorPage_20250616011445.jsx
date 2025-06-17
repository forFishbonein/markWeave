import React from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../DocumentList/Sidebar';
import EditorHeader from './EditorHeader';
import EditorToolbar from './EditorToolbar';
import Editor from './Editor';
import './editorPage.css';

const EditorPage = () => {
  const { id } = useParams();

  return (
    <div className="editorpage-layout">
      <Sidebar />
      <div className="editorpage-main">
        <div className="editorpage-card">
          <EditorHeader />
          <EditorToolbar />
          {/* 编辑器内容区，传递docId参数 */}
          <div className="editorpage-content">
            <Editor docId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
