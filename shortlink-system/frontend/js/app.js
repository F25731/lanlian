const { createApp } = Vue;

createApp({
    data() {
        return {
            // API基础URL
            apiUrl: window.location.hostname === 'localhost'
                ? 'http://localhost:3000/api'
                : '/api',

            // 当前标签页
            activeTab: 'create',

            // 加载状态
            loading: false,

            // 统计数据
            stats: {
                totalLinks: 0,
                totalVisits: 0,
                todayLinks: 0
            },

            // 单个创建表单
            singleForm: {
                title: '',
                url: '',
                code: '',
                fakeDomain: 'mall.bilibili.com'
            },

            // 批量创建表单
            batchForm: {
                text: '',
                fakeDomain: 'mall.bilibili.com'
            },

            // 创建结果
            createResult: null,
            batchResult: null,

            // 链接列表
            links: [],
            selectedLinks: [],
            searchQuery: '',
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                pages: 0
            },

            // 编辑
            editingLink: null,
            editForm: {
                title: '',
                url: '',
                fakeDomain: ''
            },

            // 消息提示
            message: null
        };
    },

    mounted() {
        this.loadStats();
    },

    methods: {
        // 加载统计数据
        async loadStats() {
            try {
                const response = await axios.get(`${this.apiUrl}/links/stats`);
                if (response.data.success) {
                    this.stats = response.data.data;
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        },

        // 创建单个短链接
        async createSingleLink() {
            this.loading = true;
            this.createResult = null;

            try {
                const response = await axios.post(`${this.apiUrl}/links`, {
                    title: this.singleForm.title,
                    url: this.singleForm.url,
                    code: this.singleForm.code || undefined,
                    fakeDomain: this.singleForm.fakeDomain
                });

                if (response.data.success) {
                    this.createResult = response.data.data;
                    this.showMessage('创建成功！', 'success');

                    // 重置表单
                    this.singleForm.title = '';
                    this.singleForm.url = '';
                    this.singleForm.code = '';

                    // 更新统计
                    this.loadStats();
                }
            } catch (error) {
                this.showMessage('创建失败：' + (error.response?.data?.error || error.message), 'error');
            } finally {
                this.loading = false;
            }
        },

        // 批量创建短链接
        async createBatchLinks() {
            this.loading = true;
            this.batchResult = null;

            try {
                // 解析文本
                const lines = this.batchForm.text.split('\n').filter(line => line.trim());

                const response = await axios.post(`${this.apiUrl}/links/batch`, {
                    links: lines,
                    fakeDomain: this.batchForm.fakeDomain
                });

                if (response.data.success) {
                    this.batchResult = response.data.data;
                    this.showMessage(`批量创建完成：成功 ${this.batchResult.success} 个`, 'success');

                    // 更新统计
                    this.loadStats();
                }
            } catch (error) {
                this.showMessage('批量创建失败：' + (error.response?.data?.error || error.message), 'error');
            } finally {
                this.loading = false;
            }
        },

        // 加载链接列表
        async loadLinks() {
            try {
                const response = await axios.get(`${this.apiUrl}/links`, {
                    params: {
                        page: this.pagination.page,
                        limit: this.pagination.limit,
                        search: this.searchQuery
                    }
                });

                if (response.data.success) {
                    this.links = response.data.data.links;
                    this.pagination = response.data.data.pagination;
                }
            } catch (error) {
                this.showMessage('加载失败：' + (error.response?.data?.error || error.message), 'error');
            }
        },

        // 搜索链接
        searchLinks() {
            this.pagination.page = 1;
            this.loadLinks();
        },

        // 切换页码
        changePage(page) {
            this.pagination.page = page;
            this.loadLinks();
        },

        // 全选/取消全选
        toggleSelectAll(event) {
            if (event.target.checked) {
                this.selectedLinks = this.links.map(link => link.id);
            } else {
                this.selectedLinks = [];
            }
        },

        // 编辑链接
        editLink(link) {
            this.editingLink = link;
            this.editForm = {
                title: link.title,
                url: link.target_url,
                fakeDomain: link.fake_domain
            };
        },

        // 更新链接
        async updateLink() {
            try {
                const response = await axios.put(`${this.apiUrl}/links/${this.editingLink.id}`, {
                    title: this.editForm.title,
                    url: this.editForm.url,
                    fakeDomain: this.editForm.fakeDomain
                });

                if (response.data.success) {
                    this.showMessage('更新成功！', 'success');
                    this.editingLink = null;
                    this.loadLinks();
                }
            } catch (error) {
                this.showMessage('更新失败：' + (error.response?.data?.error || error.message), 'error');
            }
        },

        // 删除单个链接
        async deleteLink(id) {
            if (!confirm('确定要删除这个短链接吗？')) {
                return;
            }

            try {
                const response = await axios.delete(`${this.apiUrl}/links/${id}`);

                if (response.data.success) {
                    this.showMessage('删除成功！', 'success');
                    this.loadLinks();
                    this.loadStats();
                }
            } catch (error) {
                this.showMessage('删除失败：' + (error.response?.data?.error || error.message), 'error');
            }
        },

        // 批量删除
        async batchDelete() {
            if (!confirm(`确定要删除选中的 ${this.selectedLinks.length} 个短链接吗？`)) {
                return;
            }

            try {
                const response = await axios.post(`${this.apiUrl}/links/batch-delete`, {
                    ids: this.selectedLinks
                });

                if (response.data.success) {
                    this.showMessage('批量删除成功！', 'success');
                    this.selectedLinks = [];
                    this.loadLinks();
                    this.loadStats();
                }
            } catch (error) {
                this.showMessage('批量删除失败：' + (error.response?.data?.error || error.message), 'error');
            }
        },

        // 复制到剪贴板
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.showMessage('已复制到剪贴板！', 'success');
            } catch (error) {
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showMessage('已复制到剪贴板！', 'success');
            }
        },

        // 显示消息
        showMessage(text, type = 'info') {
            this.message = { text, type };
            setTimeout(() => {
                this.message = null;
            }, 3000);
        },

        // 格式化日期
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // 截断文本
        truncate(text, length) {
            if (text.length <= length) return text;
            return text.substring(0, length) + '...';
        }
    }
}).mount('#app');
