import React from 'react';
import { Modal, Form, Input } from 'antd';

const NewDocModal = ({ visible, onOk, onCancel, loading }) => {
  const [form] = Form.useForm();

  const handleOk = () => {
    form.validateFields().then(values => {
      onOk(values);
      form.resetFields();
    });
  };

  // Generate new document object (should be returned by backend in actual implementation)
  const generateNewDoc = (values) => ({
    id: Date.now(),
    name: values.name,
    type: 'document',
    updated: new Date().toISOString(),
    created: new Date().toISOString(),
  });

  return (
    <Modal
      title="New Document"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Create"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Document Name" name="name" rules={[{ required: true, message: 'Please enter document name' }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewDocModal;
