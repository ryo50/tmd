// server.js
import express from 'express'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

const app = express()
const PORT = process.env.PORT || 3000

app.get('/download', async (req, res) => {
  const targetUrl = req.query.target
  if (!targetUrl) return res.status(400).send('target URL is required')

  try {
    // 1. HTMLを取得
    const htmlRes = await fetch(targetUrl)
    const html = await htmlRes.text()

    // 2. DOM解析
    const dom = new JSDOM(html)
    const sources = [...dom.window.document.querySelectorAll('video source')]
    const videoUrl = sources
      .map((el) => el.src)
      .find(
        (src) => src && src.startsWith('https://www.tokyomotion.net/vsrc/sd/')
      )

    if (!videoUrl) return res.status(404).send('Video not found')

    // 3. Referer付きで動画取得
    const videoRes = await fetch(videoUrl, {
      headers: { Referer: targetUrl },
    })

    if (!videoRes.ok) return res.status(500).send('Failed to fetch video')

    // ✅ CORSヘッダーを追加
    res.setHeader('Access-Control-Allow-Origin', '*')

    // 元のレスポンスから Content-Type / Content-Length を転送
    res.setHeader(
      'Content-Type',
      videoRes.headers.get('content-type') || 'video/mp4'
    )
    if (videoRes.headers.get('content-length')) {
      res.setHeader('Content-Length', videoRes.headers.get('content-length'))
    }

    // 4. ブラウザにストリームで返す
    const videoFileName = videoUrl.split('/').pop() // URLの最後の部分
    console.log('videoFileName: ' + videoFileName)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${videoFileName}"`
    )
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    res.setHeader('Access-Control-Allow-Origin', '*')

    // ストリーミング転送
    videoRes.body.pipe(res)
  } catch (err) {
    console.error(err)
    res.status(500).send('Error occurred')
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
