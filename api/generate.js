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
    const { prompt } = req.body;
    
    // 检查环境变量
    if (!process.env.DOUBAO_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'DOUBAO_API_KEY 未设置' 
      });
    }

    // 直接调用豆包 API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DOUBAO_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL || 'ep-20250917182847-vj4mj',
        prompt: prompt || '一个可爱的手办',
        n: 1,
        size: '1024x1024'
      })
    });

    // 检查响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('豆包 API 错误:', errorText);
      return res.status(500).json({ 
        success: false, 
        error: `豆包 API 错误: ${response.status} ${errorText}` 
      });
    }

    const data = await response.json();
    
    res.status(200).json({ 
      success: true, 
      imageUrl: data.data[0].url 
    });

  } catch (error) {
    console.error('生成错误:', error);
    res.status(500).json({ 
      success: false, 
      error: `生成失败: ${error.message}` 
    });
  }
}
