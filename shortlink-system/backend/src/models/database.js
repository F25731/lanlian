const mysql = require('mysql2/promise');
const redis = require('redis');

let pool;
let redisClient;

// MySQL连接池
async function initDatabase() {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'mysql',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root123',
        database: process.env.DB_NAME || 'shortlink',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    // 创建表
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            title VARCHAR(255),
            target_url TEXT NOT NULL,
            fake_domain VARCHAR(255) DEFAULT 'mall.bilibili.com',
            crafted_url TEXT NOT NULL,
            visits INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_code (code),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
        await pool.query(createTableSQL);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err);
        throw err;
    }

    // Redis连接
    redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379'
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    await redisClient.connect();
    console.log('Redis connected successfully');
}

// 获取数据库连接
function getPool() {
    return pool;
}

// 获取Redis客户端
function getRedis() {
    return redisClient;
}

module.exports = {
    initDatabase,
    getPool,
    getRedis
};
