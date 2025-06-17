import React from 'react';
import { Button } from 'antd';
import './editorPage.css';

const EditorToolbar = () => (
  <div className="editorpage-toolbar">
    <Button>B</Button>
    <Button>I</Button>
    <Button>U</Button>
    <Button>•</Button>
    <Button>1.</Button>
    <Button>—</Button>
  </div>
);

export default EditorToolbar;
