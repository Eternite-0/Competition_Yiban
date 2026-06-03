#!/bin/bash

# ============================================
# 易赛通 一键部署脚本 (Docker 多阶段构建)
# 使用方法: chmod +x deploy.sh && sudo ./deploy.sh
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${BLUE}==== $1 ====${NC}"; }

# 项目配置
PROJECT_NAME="etsaion"
PROJECT_DIR="/opt/${PROJECT_NAME}"
MYSQL_ROOT_PASSWORD="etsaion2024"

# ============================================
# 检查是否为 root 用户
# ============================================
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行: sudo ./deploy.sh"
        exit 1
    fi
}

# ============================================
# 检测操作系统
# ============================================
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/centos-release ]; then
        OS="centos"
    else
        log_error "不支持的操作系统"
        exit 1
    fi
    log_info "检测到系统: $OS $OS_VERSION"
}

# ============================================
# 安装 Docker
# ============================================
install_docker() {
    log_step "安装 Docker"

    if command -v docker &> /dev/null; then
        log_info "Docker 已安装: $(docker --version)"
    else
        log_info "正在安装 Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl start docker
        systemctl enable docker
        log_info "Docker 安装完成"
    fi

    # 安装 Docker Compose
    if docker compose version &> /dev/null; then
        log_info "Docker Compose 已安装: $(docker compose version)"
    else
        log_info "正在安装 Docker Compose 插件..."
        mkdir -p /usr/local/lib/docker/cli-plugins
        curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
        log_info "Docker Compose 安装完成"
    fi
}

# ============================================
# 复制项目文件
# ============================================
setup_project() {
    log_step "配置项目目录"

    # 创建项目目录
    mkdir -p $PROJECT_DIR

    # 获取脚本所在目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    log_info "从 $SCRIPT_DIR 复制项目文件..."

    # 复制必要文件（排除不需要的目录）
    rsync -av --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='target' \
        --exclude='.mvn' \
        --exclude='*.log' \
        "$SCRIPT_DIR/" "$PROJECT_DIR/"

    log_info "项目目录配置完成: $PROJECT_DIR"
}

# ============================================
# 构建并启动服务
# ============================================
start_services() {
    log_step "构建并启动 Docker 服务（首次构建需要几分钟）"

    cd "$PROJECT_DIR"

    # 设置环境变量
    export MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD"

    # 构建并启动
    log_info "正在构建镜像..."
    docker compose build --no-cache

    log_info "正在启动服务..."
    docker compose up -d

    # 等待服务启动
    log_info "等待服务启动..."
    sleep 15

    # 检查服务状态
    docker compose ps

    log_info "所有服务已启动"
}

# ============================================
# 创建管理脚本
# ============================================
create_scripts() {
    log_step "创建管理脚本"

    # 启动脚本
    cat > "$PROJECT_DIR/start.sh" << 'EOF'
#!/bin/bash
cd /opt/etsaion
docker compose up -d
echo "✅ 服务已启动"
EOF

    # 停止脚本
    cat > "$PROJECT_DIR/stop.sh" << 'EOF'
#!/bin/bash
cd /opt/etsaion
docker compose down
echo "⏹️ 服务已停止"
EOF

    # 重启脚本
    cat > "$PROJECT_DIR/restart.sh" << 'EOF'
#!/bin/bash
cd /opt/etsaion
docker compose restart
echo "🔄 服务已重启"
EOF

    # 查看日志脚本
    cat > "$PROJECT_DIR/logs.sh" << 'EOF'
#!/bin/bash
cd /opt/etsaion
docker compose logs -f --tail=100
EOF

    # 重新构建脚本（更新代码后使用）
    cat > "$PROJECT_DIR/rebuild.sh" << 'EOF'
#!/bin/bash
cd /opt/etsaion
echo "🔨 重新构建中..."
docker compose build --no-cache
docker compose up -d
echo "✅ 重新构建完成"
EOF

    # 更新代码脚本（从本地同步代码后使用）
    cat > "$PROJECT_DIR/update.sh" << 'EOF'
#!/bin/bash
cd /opt/etsaion
echo "📦 拉取最新代码..."
git pull 2>/dev/null || echo "未配置 git，请手动同步代码"
echo "🔨 重新构建中..."
docker compose build
docker compose up -d
echo "✅ 更新完成"
EOF

    chmod +x "$PROJECT_DIR"/*.sh

    log_info "管理脚本创建完成"
}

# ============================================
# 输出部署信息
# ============================================
print_summary() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ip.sb 2>/dev/null || echo "YOUR_SERVER_IP")

    echo ""
    echo "============================================"
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo "============================================"
    echo ""
    echo "📍 访问地址: http://$SERVER_IP"
    echo ""
    echo "📁 项目目录: $PROJECT_DIR"
    echo ""
    echo "🔧 管理命令:"
    echo "   启动服务:   $PROJECT_DIR/start.sh"
    echo "   停止服务:   $PROJECT_DIR/stop.sh"
    echo "   重启服务:   $PROJECT_DIR/restart.sh"
    echo "   查看日志:   $PROJECT_DIR/logs.sh"
    echo "   重新构建:   $PROJECT_DIR/rebuild.sh"
    echo "   更新代码:   $PROJECT_DIR/update.sh"
    echo ""
    echo "👤 测试账号:"
    echo "   管理员: admin / 123456"
    echo "   教师:   teacher1 / 123456"
    echo "   学生:   20230101 / 123456"
    echo ""
    echo "🗄️ 数据库密码: $MYSQL_ROOT_PASSWORD"
    echo ""
    echo "💡 后续更新代码:"
    echo "   1. 将新代码同步到 $PROJECT_DIR"
    echo "   2. 运行 $PROJECT_DIR/rebuild.sh"
    echo ""
    echo "============================================"
}

# ============================================
# 主流程
# ============================================
main() {
    echo "============================================"
    echo "     易赛通 一键部署脚本"
    echo "     (Docker 多阶段构建版)"
    echo "============================================"
    echo ""

    check_root
    detect_os
    install_docker
    setup_project
    start_services
    create_scripts
    print_summary
}

# 运行主流程
main "$@"