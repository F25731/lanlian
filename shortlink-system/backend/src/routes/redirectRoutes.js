const express = require('express');
const router = express.Router();
const { handleRedirect, handleJump } = require('../controllers/redirectController');

// 跳转服务器路由（处理畸形URL的实际跳转）
router.get('/jump', handleJump);

// 畸形URL到达服务端时路径通常是 //mall.bilibili.com，真实目标在 url/oid 参数中
router.get(/^\/.*$/, (req, res, next) => {
    if (req.query && (req.query.url || req.query.oid)) {
        return handleJump(req, res);
    }

    return next();
});

// 短链接跳转路由
router.get('/:code', handleRedirect);

module.exports = router;
