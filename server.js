const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'maill.twdevs.com',
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    message: '郵件服務運行中',
    domain: 'twdevs.com',
    version: '1.0.0'
  });
});

// 用戶註冊
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: '請提供郵箱和密碼' });
  }
  
  res.json({
    success: true,
    message: '註冊成功',
    user: { email, id: Date.now() }
  });
});

// 發送郵件
app.post('/api/send', (req, res) => {
  const { to, subject, body } = req.body;
  
  if (!to || !subject) {
    return res.status(400).json({ error: '請填寫收件人和主題' });
  }
  
  res.json({
    success: true,
    message: '郵件發送成功',
    emailId: 'mock_' + Date.now()
  });
});

// 主頁路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`
  ==================================
  📧 maill.twdevs.com 啟動成功！
  
  本地: http://localhost:${PORT}
  公開: https://mail-wed.onrender.com
  
  API 端點:
  - GET  /api/health
  - POST /api/register
  - POST /api/send
  ==================================
  `);
});
