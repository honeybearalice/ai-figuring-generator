
// server.js - 豆包API集成的完整后端
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// 创建上传目录
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 豆包API配置
const DOUBAO_API_URL = process.env.DOUBAO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/images/generations'; // 豆包API地址
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'ep-20250917182847-vj4mj'; // 从环境变量读取模型ID

// 图片生成API路由
app.post('/api/generate', async (req, res) => {
    try {
        console.log('收到生成请求...');
        const { prompt, image, style, options } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: '提示词不能为空' });
        }

        console.log('生成参数:', { prompt: prompt.substring(0, 100), style, options });

        // 调用AI生成图片 - 使用直接的图像生成API
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

// 豆包API调用函数
async function generateWithDoubao(prompt, image, style, options) {
    try {
        // 构建消息内容
        const messages = [
            {
                role: "system",
                content: "你是一个专业的AI图像生成助手，专门用于生成高质量的手办模型图片。请根据用户的描述生成对应的图像。"
            }
        ];

        // 如果有上传的图片，添加到消息中
        if (image) {
            messages.push({
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `请根据这张图片和以下描述生成手办：${prompt}`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: image // base64格式的图片
                        }
                    }
                ]
            });
        } else {
            messages.push({
                role: "user",
                content: prompt
            });
        }

        const requestBody = {
            model: DOUBAO_MODEL,
            messages: messages,
            max_tokens: 1000,
            temperature: 0.8,
            // 豆包特定的图像生成参数
            tools: [{
                type: "function",
                function: {
                    name: "generate_image",
                    description: "生成图片",
                    parameters: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "图片生成提示词"
                            },
                            size: {
                                type: "string",
                                description: "图片尺寸",
                                enum: ["1024x1024", "1024x1536", "1536x1024"]
                            },
                            quality: {
                                type: "string",
                                description: "图片质量",
                                enum: ["standard", "hd"]
                            }
                        },
                        required: ["prompt"]
                    }
                }
            }],
            tool_choice: {
                type: "function",
                function: { name: "generate_image" }
            }
        };

        console.log('调用豆包API...');
        
        const response = await fetch(DOUBAO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`豆包API调用失败: ${response.status} ${errorData}`);
        }

        const data = await response.json();
        console.log('豆包API响应:', JSON.stringify(data, null, 2));

        // 解析响应，获取图片URL
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.tool_calls) {
            const toolCall = data.choices[0].message.tool_calls[0];
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // 这里需要根据豆包API的实际响应格式调整
            // 如果豆包返回的是图片URL
            if (functionArgs.image_url) {
                return {
                    imageUrl: functionArgs.image_url,
                    prompt: prompt
                };
            }
        }

        // 如果没有找到图片URL，抛出错误
        throw new Error('豆包API未返回有效的图片URL');

    } catch (error) {
        console.error('豆包API调用错误:', error);
        throw error;
    }
}

// 使用豆包的直接图像生成API
async function generateWithDoubaoDirect(prompt, image) {
    try {
        // 根据示例代码调整请求参数
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
            requestBody.image_strength = 0.8; // 参考图片的影响强度
        }

        console.log('调用豆包图像生成API:', DOUBAO_API_URL);
        console.log('请求参数:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(DOUBAO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API调用失败: ${response.status} ${errorData}`);
        }

        const data = await response.json();
        console.log('豆包API响应:', JSON.stringify(data, null, 2));
        
        // 根据示例代码的响应格式获取图片URL
        if (data.data && data.data[0] && data.data[0].url) {
            return {
                imageUrl: data.data[0].url,
                prompt: prompt
            };
        }

        throw new Error('API未返回有效的图片URL');

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

// 获取生成历史（可选功能）
app.get('/api/history', (req, res) => {
    // 这里可以添加生成历史的存储和获取逻辑
    res.json({ history: [] });
});

// 根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ 
        error: '服务器内部错误',
        message: error.message 
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`🔑 豆包API密钥: ${DOUBAO_API_KEY ? '已配置' : '未配置'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('接收到 SIGTERM 信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('接收到 SIGINT 信号，正在关闭服务器...');
    process.exit(0);
});
