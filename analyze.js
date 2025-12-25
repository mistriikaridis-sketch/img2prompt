// ✅ 强制使用 Edge Runtime，绕过 Node.js 的 10秒超时限制
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  // Edge 模式下，req 是标准的 Web Request 对象
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 1. 读取 Vercel 环境变量
    // 注意：Edge 模式下 process.env 可能拿不到，要用 process.env 或者 import.meta.env，但 Vercel 自动注入通常支持 process.env
    const apiKey = process.env.ALIYUN_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server Config Error: API Key is missing.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 解析请求体
    const { imageBase64, style } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image data provided.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 构建 Prompt
    let systemPrompt = "详细分析这张图片，生成一段高质量的英文 Prompt，用于 Midjourney 绘画。包含：主体描述、环境、光影、艺术风格、镜头语言。直接输出 Prompt 纯文本，不要任何中文解释。";
    if (style === 'photography') systemPrompt += " 重点：相机型号、胶片质感、真实光影。";
    if (style === 'anime') systemPrompt += " 重点：二次元风格、线条描边、赛璐璐上色。";
    if (style === '3d') systemPrompt += " 重点：3D渲染引擎(UE5)、材质、体积光。";

    // 4. 请求阿里云 (Qwen-VL)
    const aliyunResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
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

    // 5. 检查阿里云响应
    if (!aliyunResponse.ok) {
      const errorText = await aliyunResponse.text();
      return new Response(JSON.stringify({ error: `Aliyun Error: ${errorText}` }), {
        status: aliyunResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await aliyunResponse.json();

    // 6. 成功返回
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Internal Error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
