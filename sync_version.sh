#!/bin/bash

# 版本号同步脚本
# 自动将根目录的 VERSION 文件同步到 frontend/package.json

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 读取 VERSION 文件
if [ ! -f "VERSION" ]; then
    echo "❌ 错误: VERSION 文件不存在"
    exit 1
fi

VERSION=$(cat VERSION | tr -d '[:space:]')

if [ -z "$VERSION" ]; then
    echo "❌ 错误: VERSION 文件为空"
    exit 1
fi

echo "📦 当前版本: $VERSION"

# 更新 frontend/package.json
if [ -f "frontend/package.json" ]; then
    echo "🔄 更新 frontend/package.json..."
    
    # 使用 sed 替换版本号
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json
    rm -f frontend/package.json.bak
    
    echo "✅ frontend/package.json 已更新到 v$VERSION"
else
    echo "⚠️  警告: frontend/package.json 不存在"
fi

# 更新 CHANGELOG.md 中的当前版本
if [ -f "CHANGELOG.md" ]; then
    echo "🔄 更新 CHANGELOG.md..."
    
    sed -i.bak "s/\*\*当前版本\*\*: v.*/\*\*当前版本\*\*: v$VERSION/" CHANGELOG.md
    rm -f CHANGELOG.md.bak
    
    echo "✅ CHANGELOG.md 已更新"
fi

echo ""
echo "🎉 版本号同步完成！"
echo "   版本: v$VERSION"
echo ""
echo "📝 下一步:"
echo "   1. 检查 CHANGELOG.md 确认更新"
echo "   2. 提交更改: git add . && git commit -m 'chore: bump version to $VERSION'"
echo "   3. 重启服务以生效"

