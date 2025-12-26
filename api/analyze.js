export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
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

    // 你的 Key (测试用)
    const apiKey = 'sk-d00322e83fdb4df391f73e593dc146a7';

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
              { type: "text", text: "Describe this image for Midjourney prompt in English." },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!aliyunResp.ok) {
      const errText = await aliyunResp.text();
      return new Response(JSON.stringify({ error: `Aliyun API Error: ${errText}` }), { status: 500, headers });
    }

    const data = await aliyunResp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Crash: ${error.message}` }), { status: 500, headers });
  }
}
