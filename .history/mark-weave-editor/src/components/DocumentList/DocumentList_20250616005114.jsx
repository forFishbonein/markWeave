import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Toolbar from './Toolbar';
import TableList from './TableList';
import Members from './Members';
import Settings from './Settings';
import Help from './Help';
import NewDocModal from './NewDocModal';
import FilterModal from './FilterModal';
import './documentList.css';

const TABS = {
  documents: 'documents',
  members: 'members',
  settings: 'settings',
  help: 'help',
};

const DocumentList = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState(TABS.documents);
  const [searchValue, setSearchValue] = useState('');
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // 文档、成员等数据（实际应从接口获取）
  const [documents, setDocuments] = useState([
    { key: '1', name: 'Document title 1', updated: 'Apr 16' },
    { key: '2', name: 'Document title 2', updated: 'Apr 16' },
    { key: '3', name: 'Document title 3', updated: 'Apr 16' },
  ]);
  const [members] = useState([
    { name: '张三', role: '成员' },
    { name: '李四', role: '成员' },
  ]);

  // 过滤文档
  const filteredDocuments = documents.filter(doc => doc.name.includes(searchValue));

  // 预留：接口调用获取数据
  // useEffect(() => { fetchDocuments(); }, []);

  // 渲染右侧内容
  const renderContent = () => {
    switch (activeTab) {
      case TABS.documents:
        return <TableList documents={filteredDocuments} />;
      case TABS.members:
        return <Members members={members} />;
      case TABS.settings:
        return <Settings />;
      case TABS.help:
        return <Help />;
      default:
        return null;
    }
  };

  return (
    <div className="doclist-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="doclist-main">
        <Header
          activeTab={activeTab}
          onFilter={() => setIsFilterModalOpen(true)}
        />
        {activeTab === TABS.documents && (
          <Toolbar
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            onNew={() => setIsNewDocModalOpen(true)}
          />
        )}
        <div className="doclist-content">
          {renderContent()}
        </div>
      </div>
      <NewDocModal open={isNewDocModalOpen} onClose={() => setIsNewDocModalOpen(false)} onCreate={doc => setDocuments([...documents, doc])} />
      <FilterModal open={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
    </div>
  );
};

export default DocumentList;
