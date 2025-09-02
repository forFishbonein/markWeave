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

  // Load document content
  const loadDocument = useCallback(async () => {
    if (!docId) return;

    try {
      setLoading(true);
      const response = await apiService.getDocumentContent(docId);

      if (response.success) {
        setDocument(response.data);
        // Convert JSON content to plain text display
        setContent(extractTextFromContent(response.data.content));
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      message.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Extract plain text from JSON content
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

  // Convert plain text to JSON format
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

  // Save document
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

      message.success('Document saved successfully');
    } catch (error) {
      console.error('Failed to save document:', error);
      message.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  // Formatting operations (simple example)
  const handleFormat = (type) => {
    const textarea = document.getElementById('json-editor-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (!selectedText) {
      message.info('Please select text to format first');
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
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="json-editor">
      {/* Toolbar */}
      <div className="json-editor-toolbar">
        <Button
          icon={<BoldOutlined />}
          onClick={() => handleFormat('bold')}
          title="Bold (**text**)"
        />
        <Button
          icon={<ItalicOutlined />}
          onClick={() => handleFormat('italic')}
          title="Italic (*text*)"
        />
        <Button
          icon={<UnderlineOutlined />}
          onClick={() => handleFormat('underline')}
          title="Underline (_text_)"
        />
        <div className="json-editor-toolbar-divider" />
        <Button
          type="primary"
          onClick={saveDocument}
          loading={saving}
        >
          Save
        </Button>
      </div>

      {/* Edit area */}
      <div className="json-editor-content">
        <textarea
          id="json-editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing document content..."
          className="json-editor-textarea"
        />
      </div>

      {/* Document info */}
      <div className="json-editor-info">
        <span>Character count: {content.length}</span>
        {document && (
          <span>Last updated: {new Date(document.lastUpdated).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
};

export default JsonEditor;