import React, { useEffect, useState } from 'react'
import { Table, Tooltip, Button, message, Checkbox, Space } from 'antd'
import type { TableColumnsType } from 'antd'

interface Post {
  id: number
  keyword: string
  ariaLabelledBy: string
  title: string
  link: string
  content?: string // content có thể là null
}

// Hàm để rút gọn chuỗi
const truncateString = (str: string, maxLength: number) => {
  if (str.length > maxLength) {
    return str.slice(0, maxLength) + '...'
  }
  return str
}

const PostTable: React.FC = () => {
  const [data, setData] = useState<Post[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]) // Lưu trữ ID của các bài viết được chọn

  // Fetch data from Electron
  const fetchData = async () => {
    try {
      const posts: Post[] = await window.electron.ipcRenderer.invoke('getAllPosts')
      setData(posts)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePost = async (id: number) => {
    try {
      await window.electron.ipcRenderer.invoke('post', id) // Gọi hàm đăng bài
      message.success('Post published successfully!')
      fetchData() // Cập nhật lại dữ liệu sau khi đăng
    } catch (error) {
      console.error('Error publishing post:', error)
      message.error('Failed to publish post.')
    }
  }

  const handleDeleteSelected = async () => {
    try {
      await window.electron.ipcRenderer.invoke('deletePosts', selectedRowKeys) // Gọi hàm xóa nhiều bài viết
      message.success('Selected posts deleted successfully!')
      setSelectedRowKeys([]) // Xóa lựa chọn sau khi xóa thành công
      fetchData() // Cập nhật lại dữ liệu
    } catch (error) {
      console.error('Error deleting posts:', error)
      message.error('Failed to delete selected posts.')
    }
  }

  const columns: TableColumnsType<Post> = [
    {
      title: 'Select',
      key: 'select',
      render: (_, record) => (
        <Checkbox
          checked={selectedRowKeys.includes(record.id)}
          onChange={(e) => {
            const checked = e.target.checked
            setSelectedRowKeys((prev) =>
              checked ? [...prev, record.id] : prev.filter((key) => key !== record.id)
            )
          }}
        />
      )
    },
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Keyword', dataIndex: 'keyword', key: 'keyword' },
    { title: 'Aria Labelled By', dataIndex: 'ariaLabelledBy', key: 'ariaLabelledBy' },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Link',
      dataIndex: 'link',
      key: 'link',
      render: (link: string) => (
        <Tooltip title={link}>
          <span>{truncateString(link, 30)}</span>
        </Tooltip>
      )
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      render: (content: string | undefined) => (
        <Tooltip title={content || ''}>
          <span>{truncateString(content || '', 50)}</span>
        </Tooltip>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button onClick={() => handlePost(record.id)} type="primary">
          Post
        </Button>
      )
    }
  ]

  return (
    <div style={{ padding: 20 }}>
      <Space style={{ marginBottom: 16 }}>
        {/* Chỉ hiển thị nút Delete nếu có bài viết được chọn */}
        {selectedRowKeys.length > 0 && (
          <Button type="danger" onClick={handleDeleteSelected}>
            Delete Selected
          </Button>
        )}
      </Space>
      <Table<Post> columns={columns} dataSource={data} rowKey="id" pagination={{ pageSize: 10 }} />
    </div>
  )
}

export default PostTable
