@echo off
REM FigureScout 启动脚本 (Windows)

echo 🚀 启动 FigureScout...

REM 检查是否在正确的目录
if not exist "plan.md" (
    echo ❌ 错误: 请在 FigureScout 项目根目录运行此脚本
    exit /b 1
)

REM 启动后端
echo 📡 启动后端服务...
cd backend
if not exist "venv" (
    echo 📦 创建虚拟环境...
    python -m venv venv
)

call venv\Scripts\activate
pip install -q -r requirements.txt
start "FigureScout Backend" cmd /k python app.py
cd ..

REM 等待后端启动
timeout /t 3 /nobreak > nul

REM 启动前端
echo 🎨 启动前端服务...
cd frontend
if not exist "node_modules" (
    echo 📦 安装前端依赖...
    call npm install
)

start "FigureScout Frontend" cmd /k npm run dev
cd ..

echo.
echo ✅ FigureScout 已启动!
echo 📡 后端服务: http://localhost:5000
echo 🎨 前端应用: http://localhost:3000
echo.
echo 关闭命令窗口以停止服务
pause

