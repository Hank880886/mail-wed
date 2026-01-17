// index.js - 主入口文件
require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 基本路由
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'maill.twdevs.com',
    timestamp: new Date().toISOString() 
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>maill.twdevs.com - 郵件服務</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        .success { color: #28a745; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>📧 maill.twdevs.com</h1>
      <p class="success">✅ 郵件服務運行正常</p>
      <p>企業郵箱系統已啟動</p>
      <p><a href="/health">查看健康狀態</a></p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`
========================================
✅ maill.twdevs.com 啟動成功！
📍 端口: ${PORT}
🌐 服務: 企業郵件系統
========================================
  `);
});
