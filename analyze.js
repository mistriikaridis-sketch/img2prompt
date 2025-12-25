export const config = {
  runtime: 'edge', // 继续使用 Edge，它比 Node.js 启动更快
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const { imageBase64, style } = await req.json();
    const apiKey = process.env.ALIYUN_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server Config Error: ALIYUN_API_KEY is missing.' }), { status: 500 });
    }

    // 提示词构建
    let systemPrompt = "Detailed analysis of this image for Midjourney prompt. Include: subject, environment, lighting, atmosphere, camera angles. Direct output in English.";
    if (style === 'photography') systemPrompt += " Focus on: camera gear, film stock (e.g. Kodak), realistic lighting.";
    if (style === 'anime') systemPrompt += " Focus on: anime style, line weight, cel shading, Studio Ghibli vibes.";
    if (style === '3d') systemPrompt += " Focus on: 3D render, Unreal Engine 5, octane render, subsurface scattering.";

    // 🚀 关键修改：使用 qwen-vl-plus (速度更快，避免超时)
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-vl-plus", // 👈 改为 Plus 版
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

    // 检查阿里云是否报错
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Aliyun API Error: ${errorText}` }), { status: response.status });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 });
  }
}
