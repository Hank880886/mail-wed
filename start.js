#!/usr/bin/env node
// Render 入口文件
console.log('🔧 Render 啟動中...');

// 加載環境變量
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

// 啟動服務
const app = require('./src/server.js');
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🎉 ======================================== 🎉
   maill.twdevs.com 郵件服務啟動成功！
   
   📍 本地: http://localhost:${PORT}
   🌐 公開: https://mail-wed.onrender.com
   ⏰ 時間: ${new Date().toLocaleString('zh-TW')}
   
   🚦 狀態: ✅ 運行中
🎉 ======================================== 🎉
  `);
});
