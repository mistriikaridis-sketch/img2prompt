// api/ask.js
// 切换到 Node.js 模式，更稳定

export default async function handler(req, res) {
  // 1. 设置跨域头 (允许前端访问)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // 2. 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 验证请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data' });
    }

    // Key (测试用，成功后记得改回环境变量)
    const apiKey = 'sk-d00322e83fdb4df391f73e593dc146a7';

    console.log("正在呼叫阿里云...");

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

    // 5. 处理阿里云错误
    if (!aliyunResp.ok) {
      const errText = await aliyunResp.text();
      console.error("阿里云报错:", errText);
      return res.status(500).json({ error: `Aliyun Error (${aliyunResp.status}): ${errText}` });
    }

    // 6. 成功
    const data = await aliyunResp.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("后端崩溃:", error);
    return res.status(500).json({ error: `Backend Crash: ${error.message}` });
  }
}
