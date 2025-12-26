// 注意：删掉了 export const config = { runtime: 'edge' };
// 这会强制 Vercel 使用默认的 Node.js 环境，这是最不容易出错的。

export default async function handler(req, res) {
  // 1. 设置跨域，允许你的前端访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // 2. 处理预检请求 (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data' });
    }

    // Key 直接填在这里测试，通了再改
    const apiKey = 'sk-d00322e83fdb4df391f73e593dc146a7';

    // 4. 呼叫阿里云
    const aliyunResp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Detailed analysis of this image for Midjourney prompt. Include: subject, environment, lighting, atmosphere. Direct output in English." },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!aliyunResp.ok) {
      const errText = await aliyunResp.text();
      return res.status(500).json({ error: `Aliyun Error: ${errText}` });
    }

    const data = await aliyunResp.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: `Crash: ${error.message}` });
  }
}
