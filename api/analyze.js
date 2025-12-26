// 切换回 Node.js 运行时，兼容性最强，防止 404
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  console.log("收到请求：", req.method); // 用于调试日志

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.ALIYUN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server Config Error: Missing API Key' });
  }

  try {
    const { imageBase64, style } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // 简单的提示词逻辑
    let systemPrompt = "Detailed analysis of this image for Midjourney prompt. Include: subject, environment, lighting, atmosphere. Direct output in English.";
    if (style === 'photography') systemPrompt += " Focus on: camera gear, realistic lighting.";
    if (style === 'anime') systemPrompt += " Focus on: anime style, cel shading.";
    if (style === '3d') systemPrompt += " Focus on: 3D render, Unreal Engine 5.";

    // 请求阿里云 (使用 qwen-vl-plus 以防超时)
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
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
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Aliyun Error: ${errText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: `Internal Error: ${error.message}` });
  }
}
