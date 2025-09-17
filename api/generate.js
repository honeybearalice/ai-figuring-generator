import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.DOUBAO_API_KEY, // 👈 改成 DOUBAO_API_KEY
});

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查环境变量
    if (!process.env.DOUBAO_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'DOUBAO_API_KEY environment variable is missing' 
      });
    }

    const { prompt, image } = req.body;

    const response = await openai.images.generate({
      model: process.env.DOUBAO_MODEL || "ep-20250917182847-vj4mj", // 👈 使用环境变量
      prompt: prompt || "一个可爱的手办",
      n: 1,
      size: "1024x1024"
    });

    res.status(200).json({ 
      success: true, 
      imageUrl: response.data[0].url 
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
