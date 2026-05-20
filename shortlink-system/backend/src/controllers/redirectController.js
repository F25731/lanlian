const { getPool, getRedis } = require('../models/database');

// 处理短链接跳转
async function handleRedirect(req, res) {
    try {
        const code = req.params.code;

        if (!code) {
            return res.status(400).send('Invalid short link');
        }

        const pool = getPool();
        const redis = getRedis();

        // 先从Redis缓存获取
        let craftedUrl = await redis.get(`link:${code}`);

        if (!craftedUrl) {
            // 缓存未命中，从数据库获取
            const [links] = await pool.query('SELECT crafted_url FROM links WHERE code = ?', [code]);

            if (links.length === 0) {
                return res.status(404).send('Short link not found');
            }

            craftedUrl = links[0].crafted_url;

            // 更新缓存
            await redis.set(`link:${code}`, craftedUrl, { EX: 86400 });
        }

        // 异步更新访问次数
        pool.query('UPDATE links SET visits = visits + 1 WHERE code = ?', [code]).catch(err => {
            console.error('Failed to update visit count:', err);
        });

        // 记录访问日志（可选）
        const logData = {
            code,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            referer: req.get('referer'),
            timestamp: new Date().toISOString()
        };
        console.log('Visit:', JSON.stringify(logData));

        // 302重定向到畸形URL
        res.redirect(302, craftedUrl);
    } catch (err) {
        console.error('Redirect error:', err);
        res.status(500).send('Internal server error');
    }
}

// 处理跳转服务器请求
async function handleJump(req, res) {
    try {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).send('URL parameter is required');
        }

        // 记录跳转日志
        const logData = {
            targetUrl,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            referer: req.get('referer'),
            timestamp: new Date().toISOString()
        };
        console.log('Jump:', JSON.stringify(logData));

        // 302重定向到目标URL
        res.redirect(302, targetUrl);
    } catch (err) {
        console.error('Jump error:', err);
        res.status(500).send('Internal server error');
    }
}

module.exports = {
    handleRedirect,
    handleJump
};
