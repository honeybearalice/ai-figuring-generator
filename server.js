
// server.js - 豆包API集成的完整后端（Vercel兼容版）
const express = require('express');
const multer = require('multer');
const path = require('path');
// 导入axios用于API调用
const axios = require('axios');
require('dotenv').config();

const app = express();

// 中间件配置
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 跨域配置
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 豆包API配置
const DOUBAO_API_URL = process.env.DOUBAO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'ep-20250917182847-vj4mj';

// 图片生成API路由
app.post('/api/generate', async (req, res) => {
    try {
        console.log('收到生成请求...');
        const { prompt, image, style, options } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: '提示词不能为空' });
        }

        console.log('生成参数:', { prompt: prompt.substring(0, 100), style, options });

        // 调用AI生成图片
        const result = await generateWithDoubaoDirect(prompt, image);

        console.log('生成成功，返回图片URL');
        res.json({
            success: true,
            imageUrl: result.imageUrl,
            prompt: result.prompt
        });
    } catch (error) {
        console.error('生成失败:', error);
        res.status(500).json({
            success: false,
            error: `生成失败: ${error.message}`
        });
    }
});

// 使用豆包的直接图像生成API
async function generateWithDoubaoDirect(prompt, image) {
    try {
        // 检查API密钥是否配置
        if (!DOUBAO_API_KEY) {
            throw new Error('豆包API密钥未配置');
        }

        const requestBody = {
            model: DOUBAO_MODEL,
            prompt: prompt,
            sequential_image_generation: "disabled",
            response_format: "url",
            size: "2K",
            stream: false,
            watermark: true
        };

        // 如果有参考图片，可以添加相应参数
        if (image) {
            requestBody.image = image;
            requestBody.image_strength = 0.8;
        }

        console.log('调用豆包图像生成API:', DOUBAO_API_URL);
        console.log('请求参数:', JSON.stringify(requestBody, null, 2));
        
        try {
            const response = await axios.post(DOUBAO_API_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DOUBAO_API_KEY}`
                },
                responseType: 'json'
            });

            const data = response.data;
            console.log('豆包API响应状态:', response.status);
            console.log('豆包API响应:', JSON.stringify(data, null, 2));
            
            // 保持与原有代码的兼容性，返回符合预期格式的对象
            if (data.data && data.data[0] && data.data[0].url) {
                return {
                    imageUrl: data.data[0].url,
                    prompt: prompt
                };
            }
            
            throw new Error('API未返回有效的图片URL');
        } catch (error) {
            console.error('豆包API调用错误详情:', error);
            if (error.response) {
                // 服务器返回了错误状态码
                const errorMsg = `API调用失败: ${error.response.status} ${JSON.stringify(error.response.data)}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            } else if (error.request) {
                // 请求已发送但没有收到响应
                throw new Error(`网络错误: 无法连接到豆包API服务器`);
            } else {
                // 其他错误
                throw new Error(`请求配置错误: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('豆包直接API调用错误:', error);
        throw error;
    }
}

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: '豆包API集成服务运行正常',
        hasApiKey: !!DOUBAO_API_KEY 
    });
});

// 获取生成历史
app.get('/api/history', (req, res) => {
    res.json({ history: [] });
});

// 根路由 - 返回简单的HTML响应而不是文件
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AI手办生成器</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>🎯 AI手办生成器</h1>
            <p>服务器运行正常！</p>
            <p>API端点：</p>
            <ul>
                <li><a href="/api/health">/api/health</a> - 健康检查</li>
                <li>POST /api/generate - 生成手办图片</li>
            </ul>
        </body>
        </html>
    `);
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).json({
        success: false,
        error: `服务器内部错误: ${err.message}`
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '请求的资源不存在'
    });
});

// 启动服务器（仅在本地运行时，Vercel会自动检测和运行）
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`本地开发服务器运行在 http://localhost:${PORT}`);
        console.log(`豆包API配置: ${DOUBAO_API_KEY ? '已配置' : '未配置'}`);
    });
}

// 导出Express应用（用于Vercel）
module.exports = app;
