// ✅ 强制使用 Edge Runtime (速度快，防超时)
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  // 1. 允许跨域（防止浏览器拦截）
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image data received' }), { status: 400, headers });
    }

    // 🔑【暴力测试】Key 已填入 (测试成功后建议删除，改回 process.env)
    const apiKey = 'sk-d00322e83fdb4df391f73e593dc146a7'; 

    // 2. 构造提示词
    let systemPrompt = "Detailed analysis of this image for Midjourney prompt. Include: subject, environment, lighting. Direct output in English.";
    
    // 3. 请求阿里云 (使用 qwen-vl-plus 提速)
    const aliyunResp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-vl-plus", // ⚡️ 使用 Plus 版，速度更快
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

    // 4. 检查阿里云是否报错
    if (!aliyunResp.ok) {
      const errText = await aliyunResp.text();
      return new Response(JSON.stringify({ error: `Aliyun API Error (${aliyunResp.status}): ${errText}` }), { status: 500, headers });
    }

    // 5. 成功！返回数据
    const data = await aliyunResp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Backend Crash: ${error.message}` }), { status: 500, headers });
  }
}
