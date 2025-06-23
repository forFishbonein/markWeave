import React, { useState, useEffect } from 'react';
import { Button, Input, message, Spin } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EditOutlined, CheckOutlined, CloseOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import apiService from '../../services/api';
import './editorPage.css';

const EditorHeader = () => {
  const { id: docId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Load document information
  const loadDocument = async () => {
    if (!docId) return;

    try {
      setLoading(true);
      const response = await apiService.getDocumentContent(docId);
      if (response.success) {
        setDocument(response.data);
        setTitleValue(response.data.title || '');
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      message.error('Failed to load document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [docId]);

  // Start editing title
  const handleStartEditTitle = () => {
    setEditingTitle(true);
    setTitleValue(document?.title || '');
  };

  // Save title
  const handleSaveTitle = async () => {
    if (!titleValue.trim()) {
      message.warning('Document title cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await apiService.updateDocumentTitle(docId, titleValue.trim());

      setDocument(prev => ({
        ...prev,
        title: titleValue.trim()
      }));

      setEditingTitle(false);
      message.success('Title saved successfully');
    } catch (error) {
      console.error('Failed to save title:', error);
      message.error('Failed to save title: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing title
  const handleCancelEditTitle = () => {
    setEditingTitle(false);
    setTitleValue(document?.title || '');
  };

  // Go back to previous page
  const handleBack = () => {
    // Prefer using browser history to go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // If no history, navigate based on document's team
      if (document?.teamId) {
        navigate(`/team/${document.teamId}/documents`);
      } else {
        navigate('/home');
      }
    }
  };

  // Manually save document content (Yjs usually auto-syncs, this is mainly for user feedback)
  const handleSave = () => {
    message.success('Document saved automatically');
  };

  if (loading) {
    return (
      <div className="editorpage-header">
        <Spin size="small" />
        <span style={{ marginLeft: 8 }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="editorpage-header">
      <div className="editorpage-header-left">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          className="editorpage-back-btn"
        >
          Back
        </Button>

        {editingTitle ? (
          <div className="editorpage-title-editor">
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onPressEnter={handleSaveTitle}
              style={{ width: 200, marginRight: 8 }}
              placeholder="Enter document title"
            />
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={handleSaveTitle}
              loading={saving}
              style={{ color: '#52c41a' }}
            />
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleCancelEditTitle}
              style={{ color: '#ff4d4f' }}
            />
          </div>
        ) : (
          <div className="editorpage-title-display">
            <span className="editorpage-title">
              {document?.title || 'Untitled Document'}
            </span>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={handleStartEditTitle}
              style={{ marginLeft: 8 }}
            />
          </div>
        )}
      </div>

      <div className="editorpage-header-right">
        <Button type="primary" onClick={handleSave} className="editorpage-save">
          Save
        </Button>
      </div>
    </div>
  );
};

export default EditorHeader;
