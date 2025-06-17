import React from 'react';
import { Modal } from 'antd';

const FilterModal = ({ open, onClose }) => (
  <Modal
    title="筛选"
    open={open}
    onOk={onClose}
    onCancel={onClose}
    okText="确定"
    cancelText="取消"
  >
    <p>这里是筛选条件（可根据实际需求扩展）。</p>
  </Modal>
);

export default FilterModal;
