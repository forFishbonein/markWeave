import React from 'react';
import { useParams } from 'react-router-dom';
import Editor from '../../components/Editor';

const EditorPage = () => {
  const { docId } = useParams();
  return (
    <div style={{ maxWidth: 900, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, minHeight: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 20, fontWeight: 600 }}>Rich-Text Editor</span>
        <button style={{ padding: '6px 24px', borderRadius: 4, border: 'none', background: '#1677ff', color: '#fff', fontSize: 16 }}>保存</button>
      </div>
      {/* 这里可加自定义工具栏 */}
      <Editor docId={docId} />
    </div>
  );
};

export default EditorPage;
