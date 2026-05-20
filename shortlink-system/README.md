# 短链接管理系统

一个完整的短链接管理系统，支持单个和批量创建短链接，使用URL解析器差异技术实现B站等平台的链接绕过。

## 功能特性

✅ **单个创建**：创建单个短链接，支持自定义代码和标题  
✅ **批量创建**：支持批量导入，格式：`标题：链接`，一行一个  
✅ **链接管理**：查看、编辑、删除短链接  
✅ **访问统计**：记录每个短链接的访问次数  
✅ **搜索功能**：支持按标题、代码、URL搜索  
✅ **批量操作**：支持批量删除  
✅ **Docker部署**：一键部署，包含所有依赖

## 技术栈

- **后端**：Node.js + Express
- **数据库**：MySQL 8.0
- **缓存**：Redis 7
- **前端**：Vue.js 3 + Axios
- **容器化**：Docker + Docker Compose

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 域名（需要2个子域名或1个域名）

### 1. 克隆或下载项目

```bash
# 如果使用Git
git clone <repository-url>
cd shortlink-system

# 或者直接上传整个文件夹到服务器
```

### 2. 配置域名

复制环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改域名配置：

```bash
# 跳转服务器域名
JUMP_DOMAIN=jump.yourdomain.com

# 短链接域名
SHORT_DOMAIN=s.yourdomain.com
```

### 3. 配置DNS解析

在你的域名服务商（阿里云、腾讯云、Cloudflare等）添加A记录：

```
类型    主机记录    记录值
A       jump       你的服务器IP
A       s          你的服务器IP
```

或者使用同一个域名的不同路径（不推荐）。

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 5. 访问系统

打开浏览器访问：

- **管理后台**：`http://你的服务器IP` 或 `http://s.yourdomain.com`
- **API接口**：`http://你的服务器IP:3000/api`

## 使用说明

### 创建单个短链接

1. 进入"创建短链接"标签页
2. 填写表单：
   - **标题**（可选）：例如"概率论学习资料"
   - **目标URL**（必填）：例如 `https://pan.quark.cn/s/xxxxx`
   - **短代码**（可选）：留空自动生成，或自定义如 `math01`
   - **伪装域名**：选择要伪装的可信域名，默认 `mall.bilibili.com`
3. 点击"创建短链接"
4. 复制生成的短链接

### 批量创建短链接

1. 进入"批量创建"标签页
2. 在文本框中输入链接列表，每行一个，格式：
   ```
   概率论学习资料：https://pan.quark.cn/s/xxxxx
   线性代数课件：https://pan.quark.cn/s/yyyyy
   高等数学习题：https://pan.quark.cn/s/zzzzz
   ```
   或者直接输入URL（不带标题）：
   ```
   https://pan.quark.cn/s/xxxxx
   https://pan.quark.cn/s/yyyyy
   ```
3. 选择伪装域名
4. 点击"批量创建"
5. 查看创建结果，复制成功的短链接

### 管理链接

1. 进入"管理链接"标签页
2. 查看所有已创建的短链接
3. 功能：
   - **搜索**：在搜索框输入关键词
   - **复制**：点击📋图标复制短链接
   - **编辑**：修改标题、目标URL或伪装域名
   - **删除**：删除单个链接
   - **批量删除**：勾选多个链接后批量删除

## 工作原理

### 短链接跳转流程

```
用户点击短链接
  ↓
http://s.yourdomain.com/abc123
  ↓ 302重定向
http://jump.yourdomain.com://mall.bilibili.com?url=https://pan.quark.cn/s/xxxxx
  ↓ 浏览器解析（实际访问jump.yourdomain.com）
  ↓ 302重定向
https://pan.quark.cn/s/xxxxx
  ↓
到达目标页面
```

### 核心技术

使用**URL解析器差异**技术：

- 畸形URL：`http://jump.yourdomain.com://mall.bilibili.com?url=...`
- 人眼看到：包含 `mall.bilibili.com`
- 浏览器解析：主机名是 `jump.yourdomain.com`，路径是 `//mall.bilibili.com`
- 简单的字符串检查会被绕过

## API接口文档

### 创建短链接

```http
POST /api/links
Content-Type: application/json

{
  "title": "标题",
  "url": "https://example.com",
  "code": "custom-code",  // 可选
  "fakeDomain": "mall.bilibili.com"
}
```

### 批量创建

```http
POST /api/links/batch
Content-Type: application/json

{
  "links": [
    "标题1：https://example.com/1",
    "标题2：https://example.com/2"
  ],
  "fakeDomain": "mall.bilibili.com"
}
```

### 获取链接列表

```http
GET /api/links?page=1&limit=20&search=关键词
```

### 更新链接

```http
PUT /api/links/:id
Content-Type: application/json

{
  "title": "新标题",
  "url": "https://new-url.com",
  "fakeDomain": "www.bilibili.com"
}
```

### 删除链接

```http
DELETE /api/links/:id
```

### 批量删除

```http
POST /api/links/batch-delete
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```

### 获取统计

```http
GET /api/links/stats
```

## 目录结构

```
shortlink-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── app.js          # 应用入口
│   │   ├── routes/         # 路由
│   │   ├── controllers/    # 控制器
│   │   └── models/         # 数据模型
│   ├── package.json
│   └── Dockerfile
├── frontend/               # 前端界面
│   ├── index.html         # 主页面
│   ├── css/               # 样式
│   ├── js/                # JavaScript
│   ├── nginx.conf         # Nginx配置
│   └── Dockerfile
├── docker-compose.yml     # Docker编排
├── .env.example          # 环境变量示例
└── README.md             # 说明文档
```

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 进入容器
docker-compose exec backend sh
docker-compose exec mysql mysql -uroot -proot123

# 重新构建
docker-compose build
docker-compose up -d --build

# 清理数据（危险操作）
docker-compose down -v
```

## 数据备份

### 备份MySQL数据

```bash
# 导出数据库
docker-compose exec mysql mysqldump -uroot -proot123 shortlink > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -uroot -proot123 shortlink < backup.sql
```

### 备份Redis数据

```bash
# Redis数据自动持久化到 redis_data volume
docker-compose exec redis redis-cli SAVE
```

## 性能优化

### 1. 启用Redis缓存

系统已默认启用Redis缓存，短链接查询会优先从缓存读取。

### 2. 数据库索引

数据库表已创建索引：
- `code` 字段索引（用于快速查询）
- `created_at` 字段索引（用于排序）

### 3. Nginx优化

可以在 `frontend/nginx.conf` 中添加：

```nginx
# 启用Gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 静态文件缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 7d;
}
```

## 安全建议

### 1. 修改默认密码

编辑 `docker-compose.yml`，修改MySQL密码：

```yaml
environment:
  MYSQL_ROOT_PASSWORD: 你的强密码
```

同时修改后端环境变量中的密码。

### 2. 限制访问

使用防火墙限制端口访问：

```bash
# 只允许80和443端口
ufw allow 80
ufw allow 443
ufw enable
```

### 3. 启用HTTPS

使用Let's Encrypt免费证书：

```bash
# 安装certbot
apt install certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d s.yourdomain.com -d jump.yourdomain.com
```

### 4. 添加访问认证

可以在Nginx配置中添加HTTP Basic Auth：

```nginx
location / {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    ...
}
```

## 故障排查

### 问题1：容器启动失败

```bash
# 查看日志
docker-compose logs

# 检查端口占用
netstat -tulpn | grep -E '80|3000|3306|6379'
```

### 问题2：数据库连接失败

```bash
# 检查MySQL是否启动
docker-compose ps mysql

# 查看MySQL日志
docker-compose logs mysql

# 测试连接
docker-compose exec mysql mysql -uroot -proot123 -e "SELECT 1"
```

### 问题3：短链接不工作

```bash
# 检查后端日志
docker-compose logs backend

# 测试API
curl http://localhost:3000/health

# 检查Redis
docker-compose exec redis redis-cli ping
```

### 问题4：前端无法访问

```bash
# 检查Nginx配置
docker-compose exec frontend nginx -t

# 重启前端
docker-compose restart frontend
```

## 更新升级

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose build
docker-compose up -d
```

## 卸载

```bash
# 停止并删除容器
docker-compose down

# 删除数据卷（会删除所有数据）
docker-compose down -v

# 删除镜像
docker rmi shortlink-system_backend shortlink-system_frontend
```

## 许可证

本项目仅供学习和研究使用，请勿用于非法用途。

## 支持

如有问题，请查看：
- 项目文档
- Docker日志
- GitHub Issues

---

**重要提醒**：
1. 部署前务必修改 `.env` 文件中的域名配置
2. 修改MySQL默认密码
3. 配置DNS解析
4. 建议启用HTTPS
5. 仅用于合法用途，不要用于钓鱼、诈骗等违法活动
