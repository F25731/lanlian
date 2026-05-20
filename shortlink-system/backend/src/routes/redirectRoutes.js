const express = require('express');
const router = express.Router();
const { handleRedirect, handleJump } = require('../controllers/redirectController');

// 跳转服务器路由（处理畸形URL的实际跳转）
router.get('/jump', handleJump);

// 短链接跳转路由
router.get('/:code', handleRedirect);

module.exports = router;
