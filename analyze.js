export default async function handler(req, res) {
  // 1. 允许跨域（可选，防止部分浏览器拦截）
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 2. 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 3. 检查 API Key 是否存在
  // ⚠️ 极其重要：请确保你在 Vercel 后台 Settings -> Environment Variables 里填了 ALIYUN_API_KEY
  const apiKey = process.env.ALIYUN_API_KEY;
  if (!apiKey) {
    console.error("❌ 错误：Vercel 环境变量未读取到 Key");
    return res.status(500).json({ error: 'Server Config Error: ALIYUN_API_KEY is missing in Vercel Settings.' });
  }

  try {
    // 4. 获取前端数据 (Node.js 模式下 req.body 自动就是对象)
    const { imageBase64, style } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // 5. 构建 Prompt
    let systemPrompt = "详细分析这张图片，生成一段高质量的英文 Prompt，用于 Midjourney 绘画。包含：主体描述、环境、光影、艺术风格、镜头语言。直接输出 Prompt 纯文本，不要任何中文解释。";
    if (style === 'photography') systemPrompt += " 重点：相机型号、胶片质感、真实光影。";
    if (style === 'anime') systemPrompt += " 重点：二次元风格、线条描边、赛璐璐上色。";
    if (style === '3d') systemPrompt += " 重点：3D渲染引擎(UE5)、材质、体积光。";

    // 6. 请求阿里云
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-vl-max",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    // 7. 错误处理：如果阿里云报错，把错误文字透传给前端
    if (!response.ok) {
        const errorText = await response.text();
        console.error("阿里云报错:", errorText);
        return res.status(response.status).json({ error: `Aliyun API Error: ${errorText}` });
    }

    // 8. 成功返回
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("服务器内部错误:", error);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}