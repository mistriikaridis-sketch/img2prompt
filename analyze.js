export const config = {
  runtime: 'edge', // 使用 Edge 运行时，速度极快
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { imageBase64, style } = await req.json();

    // 从环境变量中获取 Key (后面会在 Vercel 网页上填)
    const apiKey = process.env.ALIYUN_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: API Key missing' }), { status: 500 });
    }

    // 依然使用通义千问 Qwen-VL-Max
    const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    
    // 构建提示词
    const systemPrompt = "详细分析这张图片，生成一段高质量的英文 Prompt，用于 Midjourney 绘画。包含：主体描述、环境、光影、艺术风格、镜头语言、渲染引擎。直接输出 Prompt 纯文本，不要任何中文解释，不要Markdown格式。";

    const response = await fetch(url, {
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

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}