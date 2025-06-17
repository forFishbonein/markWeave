import React from 'react';
import { Button } from 'antd';
import './editorPage.css';

const EditorHeader = () => (
  <div className="editorpage-header">
    <span className="editorpage-title">Rich-Text Editor</span>
    <Button type="primary" className="editorpage-save">保存</Button>
  </div>
);

export default EditorHeader;
