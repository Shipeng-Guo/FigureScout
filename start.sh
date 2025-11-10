#!/bin/bash

# FigureScout 启动脚本

echo "🚀 启动 FigureScout..."

# 检查是否在正确的目录
if [ ! -f "plan.md" ]; then
    echo "❌ 错误: 请在 FigureScout 项目根目录运行此脚本"
    exit 1
fi

# 启动后端
echo "📡 启动后端服务..."
cd backend
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
python app.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ FigureScout 已启动!"
echo "📡 后端服务: http://localhost:5000"
echo "🎨 前端应用: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
trap "echo ''; echo '🛑 停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

