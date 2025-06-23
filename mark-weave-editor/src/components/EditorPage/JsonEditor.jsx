import React, { useState, useEffect, useCallback } from 'react';
import { Button, message } from 'antd';
import { BoldOutlined, ItalicOutlined, UnderlineOutlined } from '@ant-design/icons';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './JsonEditor.css';

const JsonEditor = ({ docId }) => {
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    if (!docId) return;

    try {
      setLoading(true);
      const response = await apiService.getDocumentContent(docId);

      if (response.success) {
        setDocument(response.data);
        // 将JSON内容转换为纯文本显示
        setContent(extractTextFromContent(response.data.content));
      }
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 从JSON内容中提取纯文本
  const extractTextFromContent = (jsonContent) => {
    if (!jsonContent || !jsonContent.content) return '';

    let text = '';
    const extractText = (nodes) => {
      nodes.forEach(node => {
        if (node.type === 'text') {
          text += node.text || '';
        } else if (node.content) {
          extractText(node.content);
        }
      });
    };

    extractText(jsonContent.content);
    return text;
  };

  // 将纯文本转换为JSON格式
  const textToJsonContent = (text) => {
    const paragraphs = text.split('\n').filter(p => p.trim() || p === '');

    return {
      type: "doc",
      content: paragraphs.length > 0 ? paragraphs.map(paragraph => ({
        type: "paragraph",
        content: paragraph.trim() ? [{
          type: "text",
          text: paragraph
        }] : []
      })) : [{
        type: "paragraph",
        content: []
      }]
    };
  };

  // 保存文档
  const saveDocument = async () => {
    if (!document || !user) return;

    try {
      setSaving(true);
      const jsonContent = textToJsonContent(content);

      await apiService.saveDocumentContent(
        docId,
        jsonContent,
        user.userId || user._id,
        document.teamId
      );

      message.success('文档保存成功');
    } catch (error) {
      console.error('保存文档失败:', error);
      message.error('保存文档失败');
    } finally {
      setSaving(false);
    }
  };

  // 格式化操作（简单示例）
  const handleFormat = (type) => {
    const textarea = document.getElementById('json-editor-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (!selectedText) {
      message.info('请先选择要格式化的文字');
      return;
    }

    let formattedText = selectedText;
    switch (type) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `_${selectedText}_`;
        break;
      default:
        break;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
  };

  if (loading) {
    return (
      <div className="json-editor-loading">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="json-editor">
      {/* 工具栏 */}
      <div className="json-editor-toolbar">
        <Button
          icon={<BoldOutlined />}
          onClick={() => handleFormat('bold')}
          title="粗体 (**文字**)"
        />
        <Button
          icon={<ItalicOutlined />}
          onClick={() => handleFormat('italic')}
          title="斜体 (*文字*)"
        />
        <Button
          icon={<UnderlineOutlined />}
          onClick={() => handleFormat('underline')}
          title="下划线 (_文字_)"
        />
        <div className="json-editor-toolbar-divider" />
        <Button
          type="primary"
          onClick={saveDocument}
          loading={saving}
        >
          保存
        </Button>
      </div>

      {/* 编辑区域 */}
      <div className="json-editor-content">
        <textarea
          id="json-editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="开始输入文档内容..."
          className="json-editor-textarea"
        />
      </div>

      {/* 文档信息 */}
      <div className="json-editor-info">
        <span>字符数: {content.length}</span>
        {document && (
          <span>最后更新: {new Date(document.lastUpdated).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
};

export default JsonEditor;