import 'reflect-metadata'
import { app, shell, BrowserWindow, ipcMain, ipcRenderer } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { AppDataSource } from './data-source'
import { Keywords } from './Entities/Keywords'
import { Posts } from './Entities/Posts'
import { ConvertPost } from './Entities/ConvertPost'
import puppeteer from 'puppeteer'
import { Worker } from 'worker_threads'

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!')
  })
  .catch((err) => {
    console.error('Error during Data Source initialization', err)
  })

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('createKeyword', async (event, ...args) => {
  const keywordRepository = AppDataSource.getRepository(Keywords)
  const newKeyword = keywordRepository.create(...args)
  await keywordRepository.save(newKeyword)
  console.log('Keyword created: ', newKeyword)
  return newKeyword
})

ipcMain.handle('getAllKeywords', async () => {
  const keywordRepository = AppDataSource.getRepository(Keywords)
  const keywords = await keywordRepository.find()
  return keywords
})

ipcMain.handle('getRedditPosts', async (event, keywords) => {
  // try {
  //   const reddit = 'https://www.reddit.com/search/?q='
  //   const browser = await puppeteer.launch({
  //     headless: false,
  //     args: ['--no-sandbox', '--disable-setuid-sandbox']
  //   })

  //   const processKeyword = async (keyword) => {
  //     const page = await browser.newPage()

  //     await page.goto(reddit + keyword, { waitUntil: 'domcontentloaded' })

  //     const posts = await page.evaluate(() => {
  //       const postTag = 'faceplate-tracker[data-testid="search-post"]'
  //       let items = document.querySelectorAll(postTag)
  //       let results = Array.from(items).map((item) => {
  //         const ariaLabelledBy = item.getAttribute('aria-labelledby')
  //         const linkedElement = ariaLabelledBy ? document.getElementById(ariaLabelledBy) : null

  //         return linkedElement
  //           ? {
  //               ariaLabelledBy,
  //               text: linkedElement.innerText,
  //               href: linkedElement.href
  //             }
  //           : null
  //       })

  //       return results.filter((result) => result !== null)
  //     })

  //     for (const post of posts) {
  //       const newPost = new Posts()
  //       newPost.keyword = keyword
  //       newPost.ariaLabelledBy = post.ariaLabelledBy?.split('search-post-title-').join('') + '-'
  //       newPost.title = post.text
  //       newPost.link = post.href

  //       await AppDataSource.manager.save(newPost)

  //       const postPage = await browser.newPage()
  //       await postPage.goto(post.href)

  //       const postId = newPost.ariaLabelledBy
  //       const content = await postPage.evaluate((postId) => {
  //         const contentElement = document.querySelector(`div[id="${postId}post-rtjson-content"] p`)
  //         return contentElement ? contentElement.innerHTML.trim() : null
  //       }, postId)

  //       if (content != null) {
  //         newPost.content = content
  //         await AppDataSource.manager.save(newPost)
  //       }

  //       await postPage.close()
  //     }

  //     await page.close()
  //   }

  //   // Tạo một mảng các promise cho mỗi từ khóa
  //   const promises = keywords.map((keyword) => processKeyword(keyword))

  //   // Chờ tất cả promise hoàn thành
  //   await Promise.all(promises)

  //   await browser.close()

  //   console.log('Các bài viết đã được lưu vào cơ sở dữ liệu')
  // } catch (error) {
  //   console.error('Lỗi khi lấy bài viết từ Reddit:', error)
  //   throw error
  // }
  const worker = new Worker(new URL('.././../src/main/Worker/redditWorker.ts', import.meta.url), {
    workerData: { keywords },
    execArgv: ['-r', 'ts-node/register']
  })

  worker.on('message', (message) => {
    console.log(`Message from worker: ${message}`)
  })

  worker.on('error', (error) => {
    console.error('Worker error:', error)
  })

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`)
    }
  })
})

ipcMain.handle('getAllPosts', async () => {
  const keywordRepository = AppDataSource.getRepository(Posts)
  const keywords = await keywordRepository.find()
  return keywords
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

ipcMain.handle('post', async (event, id) => {
  const getRepository = await AppDataSource.getRepository(Posts)
  const post = await getRepository.findOne({ where: { id } })

  if (!post) {
    console.error('Post not found.')
    return
  }

  let title = post.title
  if (title.length < 15) {
    const additionalContent = post.content ? post.content.slice(0, 15 - title.length) : ''
    title += ` ${additionalContent}`.trim()
    console.log(`Adjusted title: ${title}`)
  }

  const browser = await puppeteer.launch({
    headless: false, // Đặt thành true nếu không cần hiển thị trình duyệt
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  const hidemium = 'https://forum.hidemium.io/'
  await page.goto(hidemium, { waitUntil: 'domcontentloaded' })

  await sleep(2000) // Nghỉ 2 giây để kiểm tra trang đã tải

  const loginButton = await page.$(
    'button[class="btn btn-icon-text btn-primary btn-small login-button"]'
  )
  if (loginButton) {
    await loginButton.click()
    console.log('Clicked login button.')

    await sleep(1000) // Nghỉ 1 giây để kiểm tra form login

    await page.locator('input[id="login-account-name"]').fill('linhduyle6a1@gmail.com')
    await page.locator('input[id="login-account-password"]').fill('Linhduyle6a1@')
    await page.keyboard.press('Enter')
    console.log('Logged in successfully!')
  } else {
    console.error('Login button not found.')
    await browser.close()
    return
  }

  await page.waitForNavigation() // Đợi điều hướng sau khi login

  await sleep(2000) // Nghỉ 2 giây để kiểm tra điều hướng thành công

  const uploadButton = await page.$('button[id="create-topic"]')
  if (uploadButton) {
    await uploadButton.click()
    console.log('Clicked create topic button.')

    await sleep(1000) // Nghỉ 1 giây để kiểm tra form bài đăng

    await page
      .locator(
        'details[class="select-kit single-select dropdown-select-box composer-actions ember-view"]'
      )
      .click()
    await page.locator('li[data-value="create_topic"]').click()

    await sleep(1000) // Nghỉ 1 giây để kiểm tra form bài đăng

    await page.locator('input[id="reply-title"]').fill(title)
    await page
      .locator('textarea[class="ember-text-area ember-view d-editor-input"]')
      .fill(post.content || '')

    console.log('Filled post title and content.')

    // Chọn category
    const categoryDropdown = await page.$('details[class*="category-chooser"]')
    if (categoryDropdown) {
      await categoryDropdown.click()
      console.log('Opened category dropdown.')

      await sleep(1000) // Nghỉ 1 giây để kiểm tra dropdown

      await page.locator('input[class*="filter-input"]').fill(post.keyword)
      const firstCategory = await page.$('div[data-index="0"]')
      if (firstCategory) {
        await firstCategory.click()
        console.log('Selected category.')
      }
    }

    // Chọn tag nếu cần
    const tagDropdown = await page.$('details[class*="mini-tag-chooser"]')
    if (tagDropdown) {
      await tagDropdown.click()
      console.log('Opened tag dropdown.')

      await sleep(1000) // Nghỉ 1 giây để kiểm tra dropdown

      await page.locator('input[class*="filter-input"]').fill(post.keyword)
      const firstTag = await page.$('li[data-index="0"]')
      if (firstTag) {
        await firstTag.click()
        console.log('Selected tag.')
      }
    }

    // Nhấn nút đăng bài
    await page.locator('button[class*="btn-primary create"]').click()
    console.log('Uploaded post successfully!')
  } else {
    console.error('Upload button not found.')
  }

  await browser.close()
})

ipcMain.handle('updateKeyword', async (event, editingKeyword) => {
  const keywordRepository = AppDataSource.getRepository(Keywords)
  const id = editingKeyword['id']
  const newKeyword = editingKeyword['name']
  try {
    // Tìm bài viết theo ID
    const post = await keywordRepository.findOne({ where: { id } })

    if (!post) {
      console.error('Post not found.')
      return { success: false, message: 'Post not found.' }
    }

    // Cập nhật keyword và lưu vào database
    post.name = newKeyword
    await keywordRepository.save(post)

    console.log(`Keyword updated successfully for post ID: ` + id)
    return { success: true, message: 'Keyword updated successfully.' }
  } catch (error) {
    console.error('Error updating keyword:', error)
    return { success: false, message: 'Failed to update keyword.' }
  }
})

ipcMain.handle('deleteKeyword', async (event, id) => {
  const keywordRepository = AppDataSource.getRepository(Keywords)
  try {
    // Tìm bài viết theo ID
    const post = await keywordRepository.findOne({ where: { id } })

    if (!post) {
      console.error('Post not found.')
      return { success: false, message: 'Post not found.' }
    }

    await keywordRepository.delete(id)

    console.log(`Keyword deleted successfully for post ID: ` + id)
    return { success: true, message: 'Keyword deleted successfully.' }
  } catch (error) {
    console.error('Error updating keyword:', error)
    return { success: false, message: 'Failed to update keyword.' }
  }
})

ipcMain.handle('deletePosts', async (event, ids) => {
  const postRepository = AppDataSource.getRepository(Posts)

  try {
    await postRepository.delete(ids) // Xóa nhiều bài viết dựa vào danh sách ID
    console.log('Posts deleted successfully:', ids)
    return { success: true }
  } catch (error) {
    console.error('Error deleting posts:', error)
    return { success: false, error }
  }
})
