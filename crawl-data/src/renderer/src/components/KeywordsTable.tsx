import React, { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, message, Table, Space } from 'antd'
import type { TableColumnsType, TableProps, FormProps } from 'antd'

interface Keywords {
  id: number
  name: string
}

type FieldType = {
  name?: string
}

const App: React.FC = () => {
  const [data, setData] = useState<Keywords[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingKeyword, setEditingKeyword] = useState<Keywords | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    try {
      const users: Keywords[] = await window.electron.ipcRenderer.invoke('getAllKeywords')
      setData(users)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const showModal = (keyword?: Keywords) => {
    setEditingKeyword(keyword || null)
    setIsModalOpen(true)
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
  }

  const handleDelete = async (id: number) => {
    try {
      await window.electron.ipcRenderer.invoke('deleteKeyword', id)
      message.success('Keyword deleted successfully!')
      fetchData()
    } catch (error) {
      console.error('Error deleting keyword:', error)
      message.error('Failed to delete keyword.')
    }
  }

  const fetchRedditPosts = async () => {
    try {
      const keywords = selectedRowKeys
        .map((selectedRowKey) => data.find((item) => item.id === selectedRowKey)?.name)
        .filter(Boolean)

      if (keywords.length === 0) {
        message.warning('No valid keywords selected.')
        return
      }

      await window.electron.ipcRenderer.invoke('getRedditPosts', keywords)

      console.log('Fetched Reddit posts for all selected keywords.')
      message.success('Fetching Reddit posts for selected keywords.')
    } catch (error) {
      console.error('Error fetching Reddit posts:', error)
      message.error('Failed to fetch Reddit posts.')
    } finally {
      setSelectedRowKeys([]) // Reset selected row keys
    }
  }

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    try {
      if (editingKeyword) {
        await window.electron.ipcRenderer.invoke('updateKeyword', { ...editingKeyword, ...values })
        message.success('Keyword updated successfully!')
      } else {
        await window.electron.ipcRenderer.invoke('createKeyword', values)
        message.success('Keyword added successfully!')
      }
      fetchData()
      setIsModalOpen(false)
      form.resetFields()
    } catch (error) {
      console.error('Error:', error)
      message.error('Failed to save keyword.')
    }
  }

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    if (newSelectedRowKeys.length <= 2) {
      setSelectedRowKeys(newSelectedRowKeys)
    } else {
      message.warning('You can only select up to 2 keywords.')
    }
  }

  const rowSelection: TableProps<Keywords>['rowSelection'] = {
    selectedRowKeys,
    onChange: onSelectChange
  }

  const columns: TableColumnsType<Keywords> = [
    { title: 'Id', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button onClick={() => showModal(record)}>Edit</Button>
          <Button danger onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => showModal()}>
          Add Keyword
        </Button>
        <span style={{ marginLeft: 8 }}>
          {selectedRowKeys.length > 0 ? `Selected ${selectedRowKeys.length} items` : ''}
        </span>
        {selectedRowKeys.length > 0 && (
          <Button type="default" onClick={fetchRedditPosts} style={{ marginLeft: 8 }}>
            Get Reddit Posts
          </Button>
        )}
      </div>

      {/* Table with pagination */}
      <Table<Keywords>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 5 }}
        rowKey="id"
      />

      {/* Modal for adding/editing a keyword */}
      <Modal
        title={editingKeyword ? 'Edit Keyword' : 'Add Keyword'}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          name="keywordForm"
          onFinish={onFinish}
          initialValues={editingKeyword || { name: '' }}
          autoComplete="off"
        >
          <Form.Item<FieldType>
            label="Keyword Name"
            name="name"
            rules={[{ required: true, message: 'Please input the keyword name!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default App
