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
  // State management
  const [activeTab, setActiveTab] = useState(TABS.documents);
  const [searchValue, setSearchValue] = useState('');
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // Document, member data (should be fetched from API)
  const [documents, setDocuments] = useState([
    { key: '1', name: 'Document title 1', updated: 'Apr 16' },
    { key: '2', name: 'Document title 2', updated: 'Apr 16' },
    { key: '3', name: 'Document title 3', updated: 'Apr 16' },
  ]);
  const [members] = useState([
    { name: 'Zhang San', role: 'Member' },
    { name: 'Li Si', role: 'Member' },
  ]);

  // Filter documents
  const filteredDocuments = documents.filter(doc => doc.name.includes(searchValue));

  // Reserved: API call to get data
  // useEffect(() => { fetchDocuments(); }, []);

  // Render right-side content
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
