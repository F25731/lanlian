# 快速部署指南 - 香港服务器版

适用于：已有VPS服务器，需要快速部署短链接跳转系统

---

## 前置准备

### 你需要准备的信息

1. **服务器信息**
   - IP地址：`___________`
   - SSH端口：`___________`（默认22）
   - Root密码或SSH密钥

2. **域名信息**
   - 跳转域名：`___________`（例如：jump.yourdomain.com）
   - 短链接域名：`___________`（例如：s.yourdomain.com）

3. **目标设置**
   - 要伪装的可信域名：`mall.bilibili.com`（或其他）
   - 实际跳转目标：网盘链接

---

## 方案选择

### 推荐：方案A - 纯Nginx（15分钟部署）
- 优点：简单快速、稳定可靠、资源占用低
- 缺点：功能固定、需要手动修改配置文件
- 适合：个人使用、链接数量不多

### 可选：方案B - PHP动态（1小时部署）
- 优点：动态管理、访问统计、Web界面
- 缺点：需要安装PHP环境
- 适合：需要经常更新链接、需要统计数据

---

## 方案A：纯Nginx快速部署

### 步骤1：连接服务器

```bash
# Windows用户使用PowerShell或安装Git Bash
ssh root@你的服务器IP

# 或者使用SSH密钥
ssh -i /path/to/key.pem root@你的服务器IP
```

### 步骤2：安装Nginx

```bash
# 更新系统
apt update && apt upgrade -y

# 安装Nginx
apt install nginx -y

# 启动并设置开机自启
systemctl start nginx
systemctl enable nginx

# 检查状态
systemctl status nginx
```

### 步骤3：配置DNS解析

在你的域名服务商（阿里云、腾讯云、Cloudflare等）添加A记录：

```
类型    主机记录    记录值
A       jump       你的服务器IP
A       s          你的服务器IP
```

等待DNS生效（通常5-10分钟），测试：
```bash
ping jump.yourdomain.com
ping s.yourdomain.com
```

### 步骤4：创建跳转服务器配置

```bash
# 创建配置文件
nano /etc/nginx/sites-available/jump
```

粘贴以下内容（**记得修改域名**）：

```nginx
server {
    listen 80;
    server_name jump.yourdomain.com;  # 改成你的域名
    
    # 访问日志
    access_log /var/log/nginx/jump.access.log;
    error_log /var/log/nginx/jump.error.log;
    
    # 默认跳转（如果没有指定URL参数）
    location / {
        return 302 https://www.baidu.com;
    }
    
    # 带URL参数的跳转
    # 访问：http://jump.yourdomain.com?url=https://example.com
    location = / {
        if ($arg_url) {
            return 302 $arg_url;
        }
    }
}
```

保存并退出（Ctrl+X，然后Y，然后Enter）

### 步骤5：创建短链接服务器配置

```bash
# 创建配置文件
nano /etc/nginx/sites-available/shortlink
```

粘贴以下内容（**记得修改域名和链接映射**）：

```nginx
server {
    listen 80;
    server_name s.yourdomain.com;  # 改成你的域名
    
    access_log /var/log/nginx/shortlink.access.log;
    
    # 短链接映射
    # 格式：/短代码 -> 目标URL
    
    # 示例1：/quark1 -> 夸克网盘链接
    location = /quark1 {
        return 302 "http://jump.yourdomain.com://mall.bilibili.com?url=https://pan.quark.cn/s/你的分享码";
    }
    
    # 示例2：/quark2 -> 另一个夸克链接
    location = /quark2 {
        return 302 "http://jump.yourdomain.com://mall.bilibili.com?url=https://pan.quark.cn/s/另一个分享码";
    }
    
    # 示例3：/ali1 -> 阿里云盘链接
    location = /ali1 {
        return 302 "http://jump.yourdomain.com://mall.bilibili.com?url=https://www.aliyundrive.com/s/你的分享码";
    }
    
    # 示例4：/bd1 -> 百度网盘链接
    location = /bd1 {
        return 302 "http://jump.yourdomain.com://mall.bilibili.com?url=https://pan.baidu.com/s/你的分享码";
    }
    
    # 默认404
    location / {
        return 404 "Short link not found";
    }
}
```

**重要**：把上面的 `jump.yourdomain.com` 和 `s.yourdomain.com` 改成你的实际域名！

保存并退出。

### 步骤6：启用配置并重启Nginx

```bash
# 创建软链接启用配置
ln -s /etc/nginx/sites-available/jump /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/shortlink /etc/nginx/sites-enabled/

# 测试配置是否正确
nginx -t

# 如果显示 "syntax is ok" 和 "test is successful"，则重启Nginx
systemctl reload nginx
```

### 步骤7：测试

```bash
# 测试跳转服务器
curl -I "http://jump.yourdomain.com?url=https://www.baidu.com"
# 应该看到：Location: https://www.baidu.com

# 测试短链接
curl -I "http://s.yourdomain.com/quark1"
# 应该看到：Location: http://jump.yourdomain.com://mall.bilibili.com?url=...
```

### 步骤8：添加更多短链接

每次要添加新的短链接，编辑配置文件：

```bash
nano /etc/nginx/sites-available/shortlink
```

添加新的 location 块：

```nginx
location = /新代码 {
    return 302 "http://jump.yourdomain.com://mall.bilibili.com?url=你的网盘链接";
}
```

保存后重启Nginx：

```bash
nginx -t && systemctl reload nginx
```

---

## 方案B：PHP动态系统（推荐）

### 步骤1：安装PHP环境

```bash
# 安装PHP和Redis
apt install php-fpm php-redis redis-server -y

# 启动Redis
systemctl start redis-server
systemctl enable redis-server
```

### 步骤2：创建项目目录

```bash
# 创建目录
mkdir -p /var/www/jump
mkdir -p /var/www/shortlink

# 设置权限
chown -R www-data:www-data /var/www/jump
chown -R www-data:www-data /var/www/shortlink
```

### 步骤3：创建跳转服务器脚本

```bash
nano /var/www/jump/index.php
```

粘贴以下内容：

```php
<?php
// 跳转服务器

// 记录访问日志
$log = [
    'time' => date('Y-m-d H:i:s'),
    'ip' => $_SERVER['REMOTE_ADDR'],
    'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'path' => $_SERVER['REQUEST_URI'],
    'referer' => $_SERVER['HTTP_REFERER'] ?? ''
];
file_put_contents('/var/log/nginx/jump-access.log', json_encode($log) . "\n", FILE_APPEND);

// 从URL参数获取目标
if (isset($_GET['url'])) {
    $url = $_GET['url'];
    
    // 简单验证
    if (filter_var($url, FILTER_VALIDATE_URL)) {
        header("Location: $url", true, 302);
        exit;
    }
}

// 从路径获取短代码
$code = trim($_SERVER['REQUEST_URI'], '/');
if ($code && $code !== 'index.php') {
    $redis = new Redis();
    $redis->connect('127.0.0.1', 6379);
    
    $target = $redis->get("link:$code");
    if ($target) {
        $redis->incr("link:$code:count");
        header("Location: $target", true, 302);
        exit;
    }
}

// 默认跳转
header("Location: https://www.baidu.com", true, 302);
exit;
?>
```

### 步骤4：创建短链接管理脚本

```bash
nano /var/www/shortlink/index.php
```

粘贴以下内容：

```php
<?php
// 短链接服务器

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// 获取路径
$path = trim($_SERVER['REQUEST_URI'], '/');

// 如果是根路径，显示管理界面
if ($path === '' || $path === 'index.php') {
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>短链接管理</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; box-sizing: border-box; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        button:hover { background: #0056b3; }
        .result { margin-top: 20px; padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; }
        .link-list { margin-top: 30px; }
        .link-item { padding: 10px; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>短链接管理系统</h1>
    
    <form method="POST" action="create.php">
        <div class="form-group">
            <label>短代码（留空自动生成）：</label>
            <input type="text" name="code" placeholder="例如：quark1">
        </div>
        
        <div class="form-group">
            <label>目标URL：</label>
            <input type="url" name="url" required placeholder="https://pan.quark.cn/s/xxxxx">
        </div>
        
        <div class="form-group">
            <label>伪装域名：</label>
            <select name="fake_domain">
                <option value="mall.bilibili.com">mall.bilibili.com</option>
                <option value="www.bilibili.com">www.bilibili.com</option>
                <option value="space.bilibili.com">space.bilibili.com</option>
                <option value="live.bilibili.com">live.bilibili.com</option>
            </select>
        </div>
        
        <button type="submit">生成短链接</button>
    </form>
    
    <div class="link-list">
        <h2>已创建的短链接</h2>
        <?php
        $keys = $redis->keys('link:*');
        foreach ($keys as $key) {
            if (strpos($key, ':count') !== false || strpos($key, ':created') !== false) continue;
            
            $code = str_replace('link:', '', $key);
            $target = $redis->get($key);
            $count = $redis->get("link:$code:count") ?: 0;
            
            echo "<div class='link-item'>";
            echo "<strong>代码：</strong> $code<br>";
            echo "<strong>短链接：</strong> <a href='http://" . $_SERVER['HTTP_HOST'] . "/$code' target='_blank'>http://" . $_SERVER['HTTP_HOST'] . "/$code</a><br>";
            echo "<strong>目标：</strong> $target<br>";
            echo "<strong>访问次数：</strong> $count<br>";
            echo "</div>";
        }
        ?>
    </div>
</body>
</html>
    <?php
    exit;
}

// 短链接跳转
$crafted = $redis->get("link:$path");
if ($crafted) {
    header("Location: $crafted", true, 302);
    exit;
}

http_response_code(404);
echo "Short link not found";
?>
```

### 步骤5：创建短链接生成脚本

```bash
nano /var/www/shortlink/create.php
```

粘贴以下内容：

```php
<?php
// 短链接生成

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $url = $_POST['url'] ?? '';
    $code = $_POST['code'] ?? '';
    $fake_domain = $_POST['fake_domain'] ?? 'mall.bilibili.com';
    
    if (!$url) {
        die('URL required');
    }
    
    // 生成代码
    if (!$code) {
        $code = substr(md5($url . time()), 0, 6);
    }
    
    // 检查是否已存在
    if ($redis->exists("link:$code")) {
        die('Code already exists');
    }
    
    // 构造畸形URL
    $jump_domain = 'jump.yourdomain.com';  // 改成你的跳转域名
    $crafted = "http://$jump_domain://$fake_domain?url=" . urlencode($url);
    
    // 存储
    $redis->set("link:$code", $crafted);
    $redis->set("link:$code:target", $url);
    $redis->set("link:$code:created", time());
    
    // 返回结果
    $short_url = "http://" . $_SERVER['HTTP_HOST'] . "/$code";
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>创建成功</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { padding: 20px; background: #d4edda; border: 1px solid #c3e6cb; }
        .info { margin: 10px 0; }
        a { color: #007bff; }
    </style>
</head>
<body>
    <div class="success">
        <h2>短链接创建成功！</h2>
        <div class="info"><strong>短链接：</strong> <a href="<?php echo $short_url; ?>" target="_blank"><?php echo $short_url; ?></a></div>
        <div class="info"><strong>代码：</strong> <?php echo $code; ?></div>
        <div class="info"><strong>目标URL：</strong> <?php echo htmlspecialchars($url); ?></div>
        <div class="info"><strong>畸形URL：</strong> <?php echo htmlspecialchars($crafted); ?></div>
    </div>
    <p><a href="/">返回管理页面</a></p>
</body>
</html>
    <?php
    exit;
}

header('Location: /');
?>
```

**重要**：把 `jump.yourdomain.com` 改成你的实际跳转域名！

### 步骤6：配置Nginx（PHP版本）

```bash
nano /etc/nginx/sites-available/jump-php
```

粘贴：

```nginx
server {
    listen 80;
    server_name jump.yourdomain.com;  # 改成你的域名
    root /var/www/jump;
    index index.php;
    
    access_log /var/log/nginx/jump.access.log;
    
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

```bash
nano /etc/nginx/sites-available/shortlink-php
```

粘贴：

```nginx
server {
    listen 80;
    server_name s.yourdomain.com;  # 改成你的域名
    root /var/www/shortlink;
    index index.php;
    
    access_log /var/log/nginx/shortlink.access.log;
    
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

### 步骤7：启用配置

```bash
# 启用配置
ln -s /etc/nginx/sites-available/jump-php /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/shortlink-php /etc/nginx/sites-enabled/

# 测试并重启
nginx -t && systemctl reload nginx
```

### 步骤8：访问管理界面

打开浏览器访问：`http://s.yourdomain.com`

你会看到一个Web管理界面，可以：
- 创建新的短链接
- 查看已有的短链接
- 查看访问统计

---

## 安全加固（可选但推荐）

### 1. 安装SSL证书（HTTPS）

```bash
# 安装certbot
apt install certbot python3-certbot-nginx -y

# 申请证书（会自动配置Nginx）
certbot --nginx -d jump.yourdomain.com -d s.yourdomain.com

# 设置自动续期
certbot renew --dry-run
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

### 3. 限制管理界面访问

编辑 `/etc/nginx/sites-available/shortlink-php`，添加IP白名单：

```nginx
location / {
    # 只允许特定IP访问管理界面
    allow 你的IP地址;
    deny all;
    
    try_files $uri $uri/ /index.php?$query_string;
}
```

---

## 使用示例

### 创建短链接

访问：`http://s.yourdomain.com`

填写表单：
- 短代码：`quark1`（或留空自动生成）
- 目标URL：`https://pan.quark.cn/s/你的分享码`
- 伪装域名：`mall.bilibili.com`

点击"生成短链接"，得到：`http://s.yourdomain.com/quark1`

### 分享链接

把 `http://s.yourdomain.com/quark1` 分享到B站评论、私信等地方。

### 访问流程

1. 用户点击：`http://s.yourdomain.com/quark1`
2. 返回302：`http://jump.yourdomain.com://mall.bilibili.com?url=https://pan.quark.cn/s/xxxxx`
3. 浏览器解析：实际访问 `jump.yourdomain.com`
4. 再次302：`https://pan.quark.cn/s/xxxxx`
5. 到达网盘页面

---

## 常见问题

### Q1: DNS解析不生效？
A: 等待5-30分钟，或者清除本地DNS缓存：
```bash
# Windows
ipconfig /flushdns

# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches
```

### Q2: Nginx配置测试失败？
A: 检查语法错误，特别是：
- 域名是否正确
- 分号是否缺失
- 引号是否匹配

### Q3: PHP页面显示空白？
A: 查看错误日志：
```bash
tail -f /var/log/nginx/error.log
```

检查PHP-FPM状态：
```bash
systemctl status php-fpm
```

### Q4: Redis连接失败？
A: 检查Redis状态：
```bash
systemctl status redis-server
redis-cli ping  # 应该返回 PONG
```

### Q5: 短链接不工作？
A: 测试每一步：
```bash
# 测试跳转服务器
curl -I "http://jump.yourdomain.com?url=https://www.baidu.com"

# 测试短链接
curl -I "http://s.yourdomain.com/你的代码"

# 查看日志
tail -f /var/log/nginx/shortlink.access.log
```

---

## 维护命令

```bash
# 查看访问日志
tail -f /var/log/nginx/shortlink.access.log

# 查看错误日志
tail -f /var/log/nginx/error.log

# 重启Nginx
systemctl restart nginx

# 重启PHP-FPM
systemctl restart php-fpm

# 重启Redis
systemctl restart redis-server

# 查看Redis中的所有短链接
redis-cli keys "link:*"

# 删除某个短链接
redis-cli del "link:代码"

# 查看某个短链接的访问次数
redis-cli get "link:代码:count"
```

---

## 下一步

部署完成后，你可以：

1. **测试功能**：创建几个测试链接，确保工作正常
2. **配置HTTPS**：使用Let's Encrypt免费证书
3. **添加统计**：记录访问来源、时间、设备等
4. **优化性能**：配置Nginx缓存、Gzip压缩
5. **备份数据**：定期备份Redis数据

---

**部署时间估算**：
- 方案A（纯Nginx）：15-30分钟
- 方案B（PHP动态）：1-2小时

**难度评级**：⭐⭐⭐（中等）

祝部署顺利！有问题随时问。
