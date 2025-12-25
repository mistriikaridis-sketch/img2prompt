// 使用 Node.js 运行时，更稳定
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // 1. 打印请求方法，确保是 POST
  console.log(`[API]收到请求: ${req.method}`);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 检查 API Key 环境变量
  const apiKey = process.env.ALIYUN_API_KEY;
  if (!apiKey) {
    console.error("❌ [API]严重错误: Vercel 环境变量中未找到 ALIYUN_API_KEY");
    // 返回一个明确的 JSON 错误，而不是让函数崩溃
    return res.status(500).json({ error: 'Server Configuration Error: API Key missing in Vercel Settings.' });
  }
  console.log("[API]成功读取到 API Key (已脱敏)");

  try {
    // 3. 解析请求体
    const { imageBase64, style } = req.body;
    if (!imageBase64) {
      console.error("❌ [API]错误: 请求体中缺少 imageBase64 数据");
      return res.status(400).json({ error: 'No image data provided in request body.' });
    }
    console.log(`[API]收到图片数据，长度: ${imageBase64.length}, 风格: ${style}`);

    // 4. 构建提示词
    let systemPrompt = "详细分析这张图片，生成一段高质量的英文 Prompt，用于 Midjourney 绘画。包含：主体描述、环境、光影、艺术风格、镜头语言。直接输出 Prompt 纯文本，不要任何中文解释。";
    if (style === 'photography') systemPrompt += " 重点：相机型号、胶片质感、真实光影。";
    if (style === 'anime') systemPrompt += " 重点：二次元风格、线条描边、赛璐璐上色。";
    if (style === '3d') systemPrompt += " 重点：3D渲染引擎(UE5)、材质、体积光。";

    console.log("[API]开始向阿里云发送请求...");
    const aliyunUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    
    const response = await fetch(aliyunUrl, {
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

    // 5. 检查阿里云的响应状态
    console.log(`[API]阿里云响应状态码: ${response.status}`);
    
    if (!response.ok) {
      // 如果阿里云返回错误，读取原始文本
      const errorText = await response.text();
      console.error(`❌ [API]阿里云 API 报错: ${errorText}`);
      return res.status(response.status).json({ error: `Aliyun API Error: ${errorText}` });
    }

    // 6. 成功获取数据
    const data = await response.json();
    console.log("[API]成功从阿里云获取 JSON 数据，准备返回前端");
    return res.status(200).json(data);

  } catch (error) {
    // 7. 捕获所有其他未知错误
    console.error("❌ [API]服务器内部发生未捕获异常:", error);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}
