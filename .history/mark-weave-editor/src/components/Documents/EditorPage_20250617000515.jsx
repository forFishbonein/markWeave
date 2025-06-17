import React from 'react';
import { useParams } from 'react-router-dom';
import { message } from 'antd';
import Editor from '../../components/EditorPage/Editor';

const EditorPage = () => {
  const { docId } = useParams();
  const handleSave = () => {
    // 这里可接入实际保存逻辑
    message.success('保存成功');
  };
  return (
    <div style={{ width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, minHeight: 600, margin: '0', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 20, fontWeight: 600 }}>Rich-Text Editor</span>
        <button
          style={{ padding: '6px 24px', borderRadius: 4, border: 'none', background: '#1677ff', color: '#fff', fontSize: 16 }}
          onClick={handleSave}
        >
          保存
        </button>
      </div>
      {/* 这里可加自定义工具栏 */}
      <Editor docId={docId} />
    </div>
  );
};

export default EditorPage;
