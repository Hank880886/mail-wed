// src/start.js
console.log('🚀 Starting maill.twdevs.com email service...');

// 設置環境變量
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 啟動服務器
const app = require('./server.js');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
========================================
✅ maill.twdevs.com 啟動成功！
📍 端口: ${PORT}
🌐 訪問: https://mail-wed.onrender.com
📧 服務: 企業郵件系統
========================================
  `);
});
