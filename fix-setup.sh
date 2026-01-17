#!/bin/bash

echo "🔧 修復 mail-wed 倉庫結構..."

# 1. 修正拼寫錯誤
if [ -f "sever.js" ]; then
    echo "✅ 重命名 sever.js → server.js"
    mv sever.js server.js
fi

# 2. 創建正確的目錄結構
mkdir -p src/public

# 3. 移動文件到正確位置
if [ -f "server.js" ]; then
    echo "✅ 移動 server.js 到 src/"
    mv server.js src/
fi

if [ -d "public" ]; then
    echo "✅ 移動 public/ 到 src/public/"
    mv public/* src/public/ 2>/dev/null
    rmdir public 2>/dev/null || true
fi

# 4. 創建 package.json（如果不存在）
if [ ! -f "package.json" ]; then
    echo "✅ 創建 package.json"
    cat > package.json << EOF
{
  "name": "mail-wed",
  "version": "1.0.0",
  "description": "maill.twdevs.com Email Service",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "nodemailer": "^6.9.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF
fi

# 5. 創建 render.yaml
echo "✅ 創建 render.yaml"
cat > render.yaml << EOF
services:
  - type: web
    name: mail-wed
    env: node
    region: oregon
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
    plan: free
    autoDeploy: true
EOF

# 6. 創建 .env.example
echo "✅ 創建 .env.example"
cat > .env.example << EOF
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
EOF

echo ""
echo "🎉 修復完成！"
echo ""
echo "下一步："
echo "1. 提交更改： git add . && git commit -m '修復項目結構'"
echo "2. 推送到 GitHub： git push origin main"
echo "3. 在 Render 中重新部署"
