#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FigureScout 运行状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查后端进程
echo "📡 后端服务:"
BACKEND_PID=$(ps aux | grep "python app.py" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$BACKEND_PID" ]; then
    echo "   ✅ 运行中 (PID: $BACKEND_PID)"
    echo "   📍 监听: http://localhost:5000"
else
    echo "   ❌ 未运行"
fi
echo ""

# 检查前端进程
echo "🎨 前端服务:"
FRONTEND_PID=$(ps aux | grep "node.*vite" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$FRONTEND_PID" ]; then
    echo "   ✅ 运行中 (PID: $FRONTEND_PID)"
    echo "   📍 监听: http://localhost:3000"
else
    echo "   ❌ 未运行"
fi
echo ""

# 测试API
echo "🔌 API测试:"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "   ✅ 后端API响应正常"
else
    echo "   ❌ 后端API无响应"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ 前端页面可访问"
else
    echo "   ❌ 前端页面无法访问"
fi
echo ""

# 端口占用
echo "🔌 端口占用:"
lsof -i:5000 2>/dev/null | grep LISTEN > /dev/null && echo "   ✅ 5000（后端）" || echo "   ⚪ 5000 空闲"
lsof -i:3000 2>/dev/null | grep LISTEN > /dev/null && echo "   ✅ 3000（前端）" || echo "   ⚪ 3000 空闲"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 如果服务运行中，显示访问信息
if [ -n "$BACKEND_PID" ] && [ -n "$FRONTEND_PID" ]; then
    echo ""
    echo "🌐 应用访问地址："
    echo "   前端: http://localhost:3000"
    echo "   后端: http://localhost:5000"
    echo ""
fi

