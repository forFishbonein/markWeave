import React from 'react';
import { useParams } from 'react-router-dom';
import EditorHeader from './EditorHeader';
import Editor from './Editor';
import './editorPage.css';

const EditorPage = () => {
  const { id } = useParams();

  return (
    <div className="editorpage-layout">
      <div className="editorpage-main">
        <div className="editorpage-card">
          <EditorHeader />
          <div className="editorpage-content">
            <Editor docId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
