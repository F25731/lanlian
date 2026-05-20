const express = require('express');
const router = express.Router();
const {
    createLink,
    createBatchLinks,
    getLinks,
    getLink,
    updateLink,
    deleteLink,
    deleteBatchLinks,
    getStats
} = require('../controllers/linkController');

// 创建单个短链接
router.post('/', createLink);

// 批量创建短链接
router.post('/batch', createBatchLinks);

// 获取所有短链接（支持分页和搜索）
router.get('/', getLinks);

// 获取统计信息
router.get('/stats', getStats);

// 获取单个短链接
router.get('/:id', getLink);

// 更新短链接
router.put('/:id', updateLink);

// 删除单个短链接
router.delete('/:id', deleteLink);

// 批量删除短链接
router.post('/batch-delete', deleteBatchLinks);

module.exports = router;
