require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(helmet());
app.use(cors({
  origin: process.env.WEB_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100 // 每個IP 100個請求
});
app.use('/api/', limiter);

// 數據庫連接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis 連接
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL
  });
  redisClient.connect();
}

// 初始化數據庫
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        sender_email VARCHAR(255) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject TEXT,
        body TEXT,
        is_read BOOLEAN DEFAULT false,
        is_starred BOOLEAN DEFAULT false,
        labels TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        email_id INTEGER REFERENCES emails(id),
        filename VARCHAR(255),
        filepath VARCHAR(500),
        filesize INTEGER,
        mimetype VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mail-twdevs',
    version: '1.0.0'
  });
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    
    // 簡單驗證
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // 檢查郵件是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // 創建用戶（這裡需要實際的密碼哈希）
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) 
       VALUES ($1, $2, $3) RETURNING id, email, display_name`,
      [email, `hashed_${password}`, display_name || email.split('@')[0]]
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 簡單驗證
    const user = await pool.query(
      'SELECT id, email, display_name FROM users WHERE email = $1 AND password_hash = $2',
      [email, `hashed_${password}`]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 更新最後登錄時間
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.rows[0].id]
    );
    
    // 生成簡單的 token（實際項目應該用 JWT）
    const token = `token_${Date.now()}_${user.rows[0].id}`;
    
    // 存儲到 Redis
    if (redisClient) {
      await redisClient.set(`session:${token}`, JSON.stringify(user.rows[0]), {
        EX: 86400 // 24小時過期
      });
    }
    
    res.json({
      message: 'Login successful',
      token,
      user: user.rows[0]
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/emails', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // 從 Redis 驗證 token
    let user;
    if (redisClient) {
      const userData = await redisClient.get(`session:${token}`);
      if (!userData) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      user = JSON.parse(userData);
    }
    
    // 獲取用戶郵件
    const emails = await pool.query(
      `SELECT e.*, u.email as sender_display 
       FROM emails e 
       LEFT JOIN users u ON e.sender_email = u.email 
       WHERE e.recipient_email = $1 
       ORDER BY e.created_at DESC 
       LIMIT 50`,
      [user.email]
    );
    
    res.json(emails.rows);
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emails/send', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { to, subject, body } = req.body;
    
    if (!token || !to || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // 驗證 token
    let user;
    if (redisClient) {
      const userData = await redisClient.get(`session:${token}`);
      if (!userData) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      user = JSON.parse(userData);
    }
    
    // 保存郵件到數據庫
    const result = await pool.query(
      `INSERT INTO emails (user_id, sender_email, recipient_email, subject, body) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user.id, user.email, to, subject, body || '']
    );
    
    // 這裡可以添加實際的 SMTP 發送邏輯
    console.log(`Email sent from ${user.email} to ${to}: ${subject}`);
    
    res.json({
      message: 'Email sent successfully',
      emailId: result.rows[0].id
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 靜態文件服務
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動服務器
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`
    🚀 Server is running!
    🌐 Local: http://localhost:${PORT}
    📧 Service: Mail Service for maill.twdevs.com
    🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
    ⏰ Time: ${new Date().toLocaleString()}
    `);
  });
}

startServer().catch(console.error);
