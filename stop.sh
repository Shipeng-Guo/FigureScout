#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "关闭 FigureScout..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 关闭后端
echo "🛑 关闭后端服务..."
if pkill -f "python app.py" 2>/dev/null; then
    echo "✅ 后端已关闭"
else
    echo "⚠️  后端未运行"
fi

# 关闭前端
echo "🛑 关闭前端服务..."
if pkill -f "node.*vite" 2>/dev/null; then
    echo "✅ 前端已关闭"
else
    echo "⚠️  前端未运行"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FigureScout 已关闭"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

