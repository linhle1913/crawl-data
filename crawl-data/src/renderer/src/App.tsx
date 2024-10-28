import React, { useState } from 'react';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import Table from './components/KeywordsTable';
import PostTable from './components/PostsTable';

const { Header, Content, Footer } = Layout;

const items = [
  {
    key: '1',
    label: 'Quản lý Keyword',
  },
  {
    key: '2',
    label: 'Quản lý Bài Viết',
  },
  {
    key: '3',
    label: 'Quản lý Bài Viết Đã Convert',
  },
];

const App: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const [selectedKey, setSelectedKey] = useState('1');

  const handleMenuClick = (e) => {
    setSelectedKey(e.key);
  };

  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return <Table/>;
      case '2':
        return <PostTable/>;
    }
  };

  return (
    <Layout>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div className="demo-logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          selectedKeys={[selectedKey]} // Đặt key đã chọn
          onClick={handleMenuClick} // Thêm sự kiện nhấp vào menu
          items={items}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: '0 48px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>Home</Breadcrumb.Item>
          <Breadcrumb.Item>List</Breadcrumb.Item>
          <Breadcrumb.Item>App</Breadcrumb.Item>
        </Breadcrumb>
        <div
          style={{
            padding: 24,
            minHeight: 380,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {renderContent()} {/* Hiển thị nội dung tương ứng */}
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Ant Design ©{new Date().getFullYear()} Created by Ant UED
      </Footer>
    </Layout>
  );
};

export default App;
