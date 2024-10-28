import 'reflect-metadata'
import { parentPort, workerData } from 'node:worker_threads'
import puppeteer from 'puppeteer'
import { DataSource } from 'typeorm'
import { Posts } from '../Entities/Posts'

// Khởi tạo DataSource
const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'crawl-data.sqlite',
  entities: [Posts],
  synchronize: true,
  logging: false
})

// Hàm xử lý từ khóa
async function processKeyword(keyword: string) {
  const reddit = 'https://www.reddit.com/search/?q='
  const browser = await puppeteer.launch({
    headless: false, // Thay đổi thành true nếu bạn không muốn hiển thị Chrome
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.goto(reddit + keyword, { waitUntil: 'domcontentloaded' })

  const posts = await page.evaluate(() => {
    const postTag = 'faceplate-tracker[data-testid="search-post"]'
    const items = document.querySelectorAll(postTag)
    return Array.from(items)
      .map((item) => {
        const ariaLabelledBy = item.getAttribute('aria-labelledby')
        const linkedElement = ariaLabelledBy
          ? (document.getElementById(ariaLabelledBy) as HTMLAnchorElement)
          : null // Ép kiểu thành HTMLAnchorElement
        return linkedElement
          ? {
              ariaLabelledBy,
              text: linkedElement.innerText,
              href: linkedElement.href // Bây giờ TypeScript sẽ biết href là hợp lệ
            }
          : null
      })
      .filter((result) => result !== null)
  })

  for (const post of posts) {
    const newPost = new Posts()
    newPost.keyword = keyword
    newPost.ariaLabelledBy = post.ariaLabelledBy?.split('search-post-title-').join('') + '-'
    newPost.title = post.text
    newPost.link = post.href

    await AppDataSource.manager.save(newPost)

    const postPage = await browser.newPage()

    // Chờ 100ms sau khi mở tab mới để ổn định
    await new Promise((resolve) => setTimeout(resolve, 100))

    await postPage.goto(post.href, { waitUntil: 'domcontentloaded' })

    const content = await postPage.evaluate((postId) => {
      const contentElement = document.querySelector(`div[id="${postId}post-rtjson-content"] p`)
      return contentElement ? contentElement.innerHTML.trim() : null
    }, newPost.ariaLabelledBy)

    if (content != null) {
      newPost.content = content
      await AppDataSource.manager.save(newPost)
    }

    await postPage.close()

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  await page.close()
  await browser.close()
}

// Chạy worker
;(async () => {
  try {
    await AppDataSource.initialize()

    const keywords = workerData.keywords || []
    await Promise.allSettled(keywords.map((keyword) => processKeyword(keyword)))

    parentPort.postMessage({ status: 'completed' })
  } catch (error) {
    console.error('Error in worker:', error)
    parentPort.postMessage({ status: 'error', error: error.message })
  }
})()
