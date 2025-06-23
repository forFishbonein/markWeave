import React from 'react';
import { Modal } from 'antd';

const FilterModal = ({ visible, onOk, onCancel }) => (
  <Modal
    title="Filter"
    open={visible}
    onOk={onOk}
    onCancel={onCancel}
    okText="OK"
    cancelText="Cancel"
  >
    <p>Filter conditions can be expanded here based on actual requirements.</p>
  </Modal>
);

export default FilterModal;
