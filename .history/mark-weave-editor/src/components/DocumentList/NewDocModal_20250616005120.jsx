import React, { useState } from 'react';
import { Modal, Form, Input } from 'antd';

const NewDocModal = ({ open, onClose, onCreate }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      // 生成新文档对象（实际应由后端返回）
      const newDoc = {
        key: Date.now().toString(),
        name: values.name,
        updated: new Date().toLocaleDateString(),
      };
      onCreate(newDoc);
      form.resetFields();
      setLoading(false);
      onClose();
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="新建文档"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="文档名称" name="name" rules={[{ required: true, message: '请输入文档名称' }]}> <Input /> </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewDocModal;
