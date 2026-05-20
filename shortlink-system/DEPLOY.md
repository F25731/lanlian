# 快速部署指南

## 一、准备工作

### 1. 服务器要求
- 操作系统：Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- 内存：至少 2GB
- 硬盘：至少 10GB
- 已安装Docker和Docker Compose

### 2. 安装Docker（如果未安装）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

## 二、上传项目

### 方法1：使用SCP上传

在本地电脑上：

```bash
# 打包项目
cd "c:\Users\F1589\Desktop\蓝链"
tar -czf shortlink-system.tar.gz shortlink-system/

# 上传到服务器
scp shortlink-system.tar.gz root@你的服务器IP:/root/

# SSH连接到服务器
ssh root@你的服务器IP

# 解压
cd /root
tar -xzf shortlink-system.tar.gz
cd shortlink-system
```

### 方法2：使用FTP工具

使用FileZilla、WinSCP等工具，将整个 `shortlink-system` 文件夹上传到服务器。

## 三、配置域名

### 1. 创建环境变量文件

```bash
cd /root/shortlink-system
cp .env.example .env
nano .env
```

修改为你的域名：

```bash
JUMP_DOMAIN=jump.yourdomain.com
SHORT_DOMAIN=s.yourdomain.com
```

保存并退出（Ctrl+X，然后Y，然后Enter）。

### 2. 配置DNS解析

登录你的域名服务商（阿里云、腾讯云、Cloudflare等），添加两条A记录：

```
类型    主机记录    记录值              TTL
A       jump       你的服务器IP        600
A       s          你的服务器IP        600
```

等待DNS生效（通常5-10分钟），测试：

```bash
ping jump.yourdomain.com
ping s.yourdomain.com
```

## 四、启动服务

```bash
cd /root/shortlink-system

# 启动所有服务
docker-compose up -d

# 查看启动状态
docker-compose ps

# 查看日志（确保没有错误）
docker-compose logs -f
```

等待所有服务启动完成（大约1-2分钟）。

## 五、访问系统

### 1. 访问管理后台

打开浏览器，访问：

- `http://你的服务器IP`
- 或 `http://s.yourdomain.com`

你应该能看到短链接管理系统的界面。

### 2. 测试创建短链接

1. 在"创建短链接"页面
2. 输入一个网盘链接，例如：`https://pan.quark.cn/s/xxxxx`
3. 点击"创建短链接"
4. 复制生成的短链接
5. 在浏览器中测试，应该能正常跳转

## 六、配置HTTPS（推荐）

### 1. 安装Certbot

```bash
# Ubuntu/Debian
apt update
apt install certbot python3-certbot-nginx -y

# CentOS
yum install certbot python3-certbot-nginx -y
```

### 2. 停止Docker中的Nginx

```bash
docker-compose stop frontend
```

### 3. 安装Nginx（宿主机）

```bash
# Ubuntu/Debian
apt install nginx -y

# CentOS
yum install nginx -y
```

### 4. 配置Nginx反向代理

创建配置文件：

```bash
nano /etc/nginx/sites-available/shortlink
```

粘贴以下内容（**修改域名**）：

```nginx
server {
    listen 80;
    server_name s.yourdomain.com jump.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/shortlink /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. 修改Docker配置

编辑 `docker-compose.yml`，修改前端端口映射：

```bash
nano docker-compose.yml
```

找到 frontend 部分，修改端口：

```yaml
frontend:
  ...
  ports:
    - "8080:80"  # 改为8080
```

重启服务：

```bash
docker-compose up -d
```

### 6. 申请SSL证书

```bash
certbot --nginx -d s.yourdomain.com -d jump.yourdomain.com
```

按提示操作，选择自动重定向HTTPS。

### 7. 测试HTTPS

访问 `https://s.yourdomain.com`，应该能看到绿色锁图标。

## 七、日常维护

### 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 查看特定服务
docker-compose logs -f backend
docker-compose logs -f mysql
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 备份数据

```bash
# 创建备份目录
mkdir -p /root/backups

# 备份数据库
docker-compose exec mysql mysqldump -uroot -proot123 shortlink > /root/backups/shortlink-$(date +%Y%m%d).sql

# 备份Redis
docker-compose exec redis redis-cli SAVE
cp /var/lib/docker/volumes/shortlink-system_redis_data/_data/dump.rdb /root/backups/redis-$(date +%Y%m%d).rdb
```

### 更新系统

```bash
cd /root/shortlink-system

# 停止服务
docker-compose down

# 上传新版本文件（覆盖）

# 重新构建并启动
docker-compose build
docker-compose up -d
```

## 八、常见问题

### Q1: 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep -E '80|3000|3306|6379'

# 停止占用端口的服务
systemctl stop nginx  # 如果有其他nginx
systemctl stop mysql  # 如果有其他mysql
```

### Q2: Docker容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查磁盘空间
df -h

# 清理Docker
docker system prune -a
```

### Q3: 数据库连接失败

```bash
# 检查MySQL容器
docker-compose ps mysql

# 进入MySQL容器
docker-compose exec mysql mysql -uroot -proot123

# 重置数据库
docker-compose down -v
docker-compose up -d
```

### Q4: 短链接无法跳转

```bash
# 检查后端日志
docker-compose logs backend

# 测试API
curl http://localhost:3000/health

# 检查环境变量
docker-compose exec backend env | grep DOMAIN
```

### Q5: 前端页面空白

```bash
# 检查前端日志
docker-compose logs frontend

# 检查Nginx配置
docker-compose exec frontend nginx -t

# 重启前端
docker-compose restart frontend
```

## 九、性能优化

### 1. 增加MySQL连接池

编辑 `backend/src/models/database.js`：

```javascript
connectionLimit: 20,  // 增加到20
```

### 2. 调整Redis内存

编辑 `docker-compose.yml`：

```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 3. 启用Nginx缓存

编辑 `frontend/nginx.conf`，添加：

```nginx
# 静态文件缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# 启用Gzip
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## 十、安全加固

### 1. 修改MySQL密码

```bash
# 编辑docker-compose.yml
nano docker-compose.yml

# 修改密码
MYSQL_ROOT_PASSWORD: 你的强密码

# 同时修改backend的DB_PASSWORD
```

### 2. 配置防火墙

```bash
# 安装ufw
apt install ufw -y

# 允许SSH、HTTP、HTTPS
ufw allow 22
ufw allow 80
ufw allow 443

# 启用防火墙
ufw enable
```

### 3. 限制管理后台访问

编辑 `frontend/nginx.conf`，添加IP白名单：

```nginx
location / {
    # 只允许特定IP访问
    allow 你的IP地址;
    deny all;
    
    try_files $uri $uri/ /index.html;
}
```

## 十一、监控告警

### 1. 安装监控工具

```bash
# 安装ctop（容器监控）
wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
chmod +x /usr/local/bin/ctop

# 运行
ctop
```

### 2. 设置自动重启

Docker Compose已配置 `restart: always`，容器会自动重启。

### 3. 日志轮转

```bash
# 创建日志轮转配置
cat > /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
```

## 十二、完成

恭喜！你的短链接管理系统已经部署完成。

**访问地址**：
- 管理后台：`https://s.yourdomain.com`
- API接口：`https://s.yourdomain.com/api`

**下一步**：
1. 创建几个测试短链接
2. 在B站等平台测试是否能正常跳转
3. 定期备份数据
4. 监控服务器资源使用情况

**需要帮助？**
- 查看 README.md 文档
- 检查 Docker 日志
- 确保域名DNS已生效

---

**部署时间估算**：30-60分钟  
**难度评级**：⭐⭐⭐（中等）

祝使用愉快！
