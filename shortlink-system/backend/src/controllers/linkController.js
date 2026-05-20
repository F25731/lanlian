const { getPool, getRedis } = require('../models/database');
const crypto = require('crypto');

// 生成短代码
function generateCode(length = 6) {
    return crypto.randomBytes(length).toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, length);
}

// 创建单个短链接
async function createLink(req, res) {
    try {
        const { title, url, code, fakeDomain } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const pool = getPool();
        const redis = getRedis();

        // 生成或使用提供的代码
        let shortCode = code || generateCode();

        // 检查代码是否已存在
        const [existing] = await pool.query('SELECT id FROM links WHERE code = ?', [shortCode]);
        if (existing.length > 0) {
            if (code) {
                return res.status(400).json({ error: 'Code already exists' });
            }
            // 如果是自动生成的代码冲突，重新生成
            shortCode = generateCode(8);
        }

        // 构造畸形URL
        const jumpDomain = process.env.JUMP_DOMAIN || 'jump.yourdomain.com';
        const fake = fakeDomain || 'mall.bilibili.com';
        const craftedUrl = `http://${jumpDomain}://${fake}?url=${encodeURIComponent(url)}`;

        // 插入数据库
        const [result] = await pool.query(
            'INSERT INTO links (code, title, target_url, fake_domain, crafted_url) VALUES (?, ?, ?, ?, ?)',
            [shortCode, title || '', url, fake, craftedUrl]
        );

        // 缓存到Redis
        await redis.set(`link:${shortCode}`, craftedUrl, { EX: 86400 }); // 24小时过期

        const shortUrl = `http://${process.env.SHORT_DOMAIN || 's.yourdomain.com'}/${shortCode}`;

        res.json({
            success: true,
            data: {
                id: result.insertId,
                code: shortCode,
                title: title || '',
                shortUrl,
                targetUrl: url,
                craftedUrl
            }
        });
    } catch (err) {
        console.error('Create link error:', err);
        res.status(500).json({ error: 'Failed to create link', message: err.message });
    }
}

// 批量创建短链接
async function createBatchLinks(req, res) {
    try {
        const { links, fakeDomain } = req.body;

        if (!links || !Array.isArray(links) || links.length === 0) {
            return res.status(400).json({ error: 'Links array is required' });
        }

        const pool = getPool();
        const redis = getRedis();
        const results = [];
        const errors = [];

        for (let i = 0; i < links.length; i++) {
            const item = links[i];
            let title = '';
            let url = '';

            // 解析格式：标题：链接
            if (typeof item === 'string') {
                const parts = item.split('：');
                if (parts.length === 2) {
                    title = parts[0].trim();
                    url = parts[1].trim();
                } else {
                    url = item.trim();
                }
            } else if (typeof item === 'object') {
                title = item.title || '';
                url = item.url || '';
            }

            if (!url) {
                errors.push({ line: i + 1, error: 'URL is empty' });
                continue;
            }

            try {
                // 生成短代码
                let shortCode = generateCode();

                // 检查代码是否已存在
                const [existing] = await pool.query('SELECT id FROM links WHERE code = ?', [shortCode]);
                if (existing.length > 0) {
                    shortCode = generateCode(8);
                }

                // 构造畸形URL
                const jumpDomain = process.env.JUMP_DOMAIN || 'jump.yourdomain.com';
                const fake = fakeDomain || 'mall.bilibili.com';
                const craftedUrl = `http://${jumpDomain}://${fake}?url=${encodeURIComponent(url)}`;

                // 插入数据库
                const [result] = await pool.query(
                    'INSERT INTO links (code, title, target_url, fake_domain, crafted_url) VALUES (?, ?, ?, ?, ?)',
                    [shortCode, title, url, fake, craftedUrl]
                );

                // 缓存到Redis
                await redis.set(`link:${shortCode}`, craftedUrl, { EX: 86400 });

                const shortUrl = `http://${process.env.SHORT_DOMAIN || 's.yourdomain.com'}/${shortCode}`;

                results.push({
                    line: i + 1,
                    id: result.insertId,
                    code: shortCode,
                    title,
                    shortUrl,
                    targetUrl: url
                });
            } catch (err) {
                errors.push({ line: i + 1, error: err.message });
            }
        }

        res.json({
            success: true,
            data: {
                total: links.length,
                success: results.length,
                failed: errors.length,
                results,
                errors
            }
        });
    } catch (err) {
        console.error('Batch create error:', err);
        res.status(500).json({ error: 'Failed to create batch links', message: err.message });
    }
}

// 获取所有短链接
async function getLinks(req, res) {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const pool = getPool();

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'WHERE title LIKE ? OR code LIKE ? OR target_url LIKE ?';
            const searchPattern = `%${search}%`;
            params = [searchPattern, searchPattern, searchPattern];
        }

        // 获取总数
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM links ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // 获取数据
        const [links] = await pool.query(
            `SELECT * FROM links ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // 添加短链接URL
        const shortDomain = process.env.SHORT_DOMAIN || 's.yourdomain.com';
        const linksWithUrl = links.map(link => ({
            ...link,
            shortUrl: `http://${shortDomain}/${link.code}`
        }));

        res.json({
            success: true,
            data: {
                links: linksWithUrl,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (err) {
        console.error('Get links error:', err);
        res.status(500).json({ error: 'Failed to get links', message: err.message });
    }
}

// 获取单个短链接
async function getLink(req, res) {
    try {
        const { id } = req.params;
        const pool = getPool();

        const [links] = await pool.query('SELECT * FROM links WHERE id = ?', [id]);

        if (links.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const shortDomain = process.env.SHORT_DOMAIN || 's.yourdomain.com';
        const link = {
            ...links[0],
            shortUrl: `http://${shortDomain}/${links[0].code}`
        };

        res.json({ success: true, data: link });
    } catch (err) {
        console.error('Get link error:', err);
        res.status(500).json({ error: 'Failed to get link', message: err.message });
    }
}

// 更新短链接
async function updateLink(req, res) {
    try {
        const { id } = req.params;
        const { title, url, fakeDomain } = req.body;

        const pool = getPool();
        const redis = getRedis();

        // 获取原有数据
        const [links] = await pool.query('SELECT * FROM links WHERE id = ?', [id]);
        if (links.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const link = links[0];

        // 更新数据
        const newTitle = title !== undefined ? title : link.title;
        const newUrl = url !== undefined ? url : link.target_url;
        const newFakeDomain = fakeDomain !== undefined ? fakeDomain : link.fake_domain;

        // 重新构造畸形URL
        const jumpDomain = process.env.JUMP_DOMAIN || 'jump.yourdomain.com';
        const craftedUrl = `http://${jumpDomain}://${newFakeDomain}?url=${encodeURIComponent(newUrl)}`;

        await pool.query(
            'UPDATE links SET title = ?, target_url = ?, fake_domain = ?, crafted_url = ? WHERE id = ?',
            [newTitle, newUrl, newFakeDomain, craftedUrl, id]
        );

        // 更新Redis缓存
        await redis.set(`link:${link.code}`, craftedUrl, { EX: 86400 });

        res.json({ success: true, message: 'Link updated successfully' });
    } catch (err) {
        console.error('Update link error:', err);
        res.status(500).json({ error: 'Failed to update link', message: err.message });
    }
}

// 删除短链接
async function deleteLink(req, res) {
    try {
        const { id } = req.params;
        const pool = getPool();
        const redis = getRedis();

        // 获取代码以删除Redis缓存
        const [links] = await pool.query('SELECT code FROM links WHERE id = ?', [id]);
        if (links.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const code = links[0].code;

        // 删除数据库记录
        await pool.query('DELETE FROM links WHERE id = ?', [id]);

        // 删除Redis缓存
        await redis.del(`link:${code}`);

        res.json({ success: true, message: 'Link deleted successfully' });
    } catch (err) {
        console.error('Delete link error:', err);
        res.status(500).json({ error: 'Failed to delete link', message: err.message });
    }
}

// 批量删除短链接
async function deleteBatchLinks(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs array is required' });
        }

        const pool = getPool();
        const redis = getRedis();

        // 获取所有代码
        const [links] = await pool.query('SELECT code FROM links WHERE id IN (?)', [ids]);
        const codes = links.map(link => link.code);

        // 删除数据库记录
        await pool.query('DELETE FROM links WHERE id IN (?)', [ids]);

        // 删除Redis缓存
        for (const code of codes) {
            await redis.del(`link:${code}`);
        }

        res.json({ success: true, message: `${ids.length} links deleted successfully` });
    } catch (err) {
        console.error('Batch delete error:', err);
        res.status(500).json({ error: 'Failed to delete links', message: err.message });
    }
}

// 获取统计信息
async function getStats(req, res) {
    try {
        const pool = getPool();

        const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM links');
        const [visitsResult] = await pool.query('SELECT SUM(visits) as total_visits FROM links');
        const [todayResult] = await pool.query(
            'SELECT COUNT(*) as today FROM links WHERE DATE(created_at) = CURDATE()'
        );
        const [topLinks] = await pool.query(
            'SELECT code, title, visits FROM links ORDER BY visits DESC LIMIT 10'
        );

        res.json({
            success: true,
            data: {
                totalLinks: totalResult[0].total,
                totalVisits: visitsResult[0].total_visits || 0,
                todayLinks: todayResult[0].today,
                topLinks
            }
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Failed to get stats', message: err.message });
    }
}

module.exports = {
    createLink,
    createBatchLinks,
    getLinks,
    getLink,
    updateLink,
    deleteLink,
    deleteBatchLinks,
    getStats
};
