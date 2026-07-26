# 🚀 部署说明（Docker 多阶段构建版）

## 优势

- ✅ **服务器只需安装 Docker**，无需 Java、Node.js、Maven
- ✅ **构建全在容器内完成**，环境一致性有保障
- ✅ **后续更新只需同步代码 + 重新构建**

---

## 快速部署（2 步）

### 第 1 步：上传项目到服务器

```bash
# 方式一：scp 上传整个目录
scp -r D:\易班\Competition_Yiban user@your-server-ip:/opt/etsaion

# 方式二：用 Git（推荐，方便后续更新）
# 先在服务器上克隆仓库
ssh user@your-server-ip
git clone https://github.com/your-username/your-repo.git /opt/etsaion
```

### 第 2 步：一键部署

```bash
# 登录服务器后执行
cd /opt/etsaion
chmod +x deploy.sh
sudo ./deploy.sh
```

脚本会自动完成：
- ✅ 安装 Docker（如果没有）
- ✅ 构建后端镜像（Maven 在容器内运行）
- ✅ 构建前端镜像（Node.js 在容器内运行）
- ✅ 启动所有服务

首次构建需要 5-10 分钟，后续构建会利用缓存更快。

---

## 部署完成后

### 访问系统

打开浏览器访问: `http://你的服务器IP`

### 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | 123456 |
| 教师 | teacher1 | 123456 |
| 学生 | 20230101 | 123456 |

### 管理命令

```bash
/opt/etsaion/start.sh      # 启动服务
/opt/etsaion/stop.sh       # 停止服务
/opt/etsaion/restart.sh    # 重启服务
/opt/etsaion/logs.sh       # 查看日志
/opt/etsaion/rebuild.sh    # 重新构建（更新代码后使用）
```

---

## 🔄 后续更新代码

### 方式一：手动同步代码

```bash
# 1. 本地修改代码后，上传到服务器
scp -r Yiban/src user@server:/opt/etsaion/Yiban/
scp -r Yiban_backend/src user@server:/opt/etsaion/Yiban_backend/

# 2. 在服务器上重新构建
ssh user@server
/opt/etsaion/rebuild.sh
```

### 方式二：使用 Git（推荐）

```bash
# 1. 本地推送代码到 GitHub
git add .
git commit -m "update"
git push

# 2. 服务器拉取并重新构建
ssh user@server
cd /opt/etsaion
git pull
./rebuild.sh
```

---

## 常见问题

### Q: 首次构建很慢？

首次构建需要下载 Maven 依赖和 npm 包，大约 5-10 分钟。后续构建会利用 Docker 缓存，通常 1-2 分钟。

### Q: 如何查看构建进度？

```bash
# 查看构建日志
docker compose build

# 或者实时查看
docker compose build --progress=plain
```

### Q: 端口被占用怎么办？

编辑 `/opt/etsaion/docker-compose.yml`，修改前端端口映射：

```yaml
frontend:
  ports:
    - "8080:80"  # 改成 8080 或其他端口
```

然后重新构建：

```bash
/opt/etsaion/rebuild.sh
```

### Q: 如何配置域名和 HTTPS？

1. 将域名 A 记录指向服务器 IP
2. 安装 Nginx 并配置反向代理，或者使用 Caddy 自动 HTTPS

### Q: 如何查看数据库？

```bash
# 进入 MySQL 容器
docker exec -it etsaion-mysql mysql -u root -p

# 根目录 docker-compose 默认不暴露 MySQL 到公网；需要查看时使用上面的 docker exec。
```

---

## 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **内存**: 4GB 以上（构建时需要较多内存）
- **硬盘**: 30GB 以上
- **端口**: 80、443（MySQL 默认仅在 Docker 网络内部访问）

### 防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

---

## 目录结构

```
/opt/etsaion/
├── docker-compose.yml      # Docker 配置
├── deploy.sh               # 部署脚本
├── start.sh                # 启动脚本
├── stop.sh                 # 停止脚本
├── restart.sh              # 重启脚本
├── rebuild.sh              # 重新构建脚本
├── logs.sh                 # 日志脚本
├── Yiban/                  # 前端源码
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   └── package.json
└── Yiban_backend/          # 后端源码
    ├── Dockerfile
    ├── db/                 # Flyway 指引、已有库认领与旧脚本归档
    ├── src/main/resources/db/migration/  # V1-V5 baseline 及后续迁移
    ├── src/
    └── pom.xml
```
