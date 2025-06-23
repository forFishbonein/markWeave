import React, { useState } from 'react';
import { Modal, Form, Input, Button } from 'antd';

const { TextArea } = Input;

const CreateTeamModal = ({ visible, onCancel, onOk }) => {
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const handleOk = async () => {
    try {
      setCreating(true);
      const values = await form.validateFields();
      await onOk(values);
      form.resetFields();
    } catch (error) {
      // Form validation failed or API call failed
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Create New Team"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
      className="create-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleOk}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="Team Name"
          name="name"
          rules={[
            { required: true, message: 'Please enter team name' },
            { min: 2, message: 'Team name must be at least 2 characters' },
            { max: 50, message: 'Team name must be at most 50 characters' }
          ]}
        >
          <Input
            placeholder="Enter team name"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="Team Description"
          name="description"
          rules={[
            { max: 200, message: 'Description must be at most 200 characters' }
          ]}
        >
          <TextArea
            placeholder="Briefly describe the team's purpose or goals (optional)"
            rows={3}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button
              onClick={handleCancel}
              style={{ borderRadius: 8 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              style={{
                borderRadius: 8,
                background: '#3b82f6',
                borderColor: '#3b82f6'
              }}
            >
              Create Team
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTeamModal;
