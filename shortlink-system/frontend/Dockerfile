FROM nginx:alpine

# 复制前端文件
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css/
COPY js /usr/share/nginx/html/js/

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制管理员认证文件
COPY .htpasswd /etc/nginx/.htpasswd

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
