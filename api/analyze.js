export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. 设置跨域头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // 2. 只允许 POST 请求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
  }

  try {
    // 3. 解析请求体
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image data received' }), { status: 400, headers });
    }

    // 4. API Key (确保这里是纯文本，没有奇怪的空格)
    const apiKey = 'sk-d00322e83fdb4df391f73e593dc146a7';

    // 5. 呼叫阿里云
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

    // 6. 处理阿里云的错误
    if (!aliyunResp.ok) {
      const errText = await aliyunResp.text();
      return new Response(JSON.stringify({ error: `Aliyun API Error (${aliyunResp.status}): ${errText}` }), { status: 500, headers });
    }

    // 7. 成功返回
    const data = await aliyunResp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Backend Crash: ${error.message}` }), { status: 500, headers });
  }
}
