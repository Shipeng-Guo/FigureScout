# 推送新版本到GitHub - 完整指南

> 本文档提供将FigureScout新版本推送到GitHub的完整步骤

---

## 📋 目录

1. [前置条件检查](#前置条件检查)
2. [版本更新流程](#版本更新流程)
3. [Git提交步骤](#git提交步骤)
4. [推送到GitHub](#推送到github)
5. [创建GitHub Release](#创建github-release)
6. [常见问题处理](#常见问题处理)

---

## 前置条件检查

### 1. 确认SSH配置

**检查SSH密钥是否配置：**

```bash
# 检查SSH密钥
ls -la ~/.ssh/

# 应该看到：
# id_rsa (私钥)
# id_rsa.pub (公钥)
```

**如果没有SSH密钥，创建新的：**

```bash
# 生成SSH密钥
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 按提示操作（可以直接回车使用默认设置）
```

**添加SSH密钥到GitHub：**

```bash
# 复制公钥内容
cat ~/.ssh/id_rsa.pub

# 然后：
# 1. 访问 https://github.com/settings/keys
# 2. 点击 "New SSH key"
# 3. 粘贴公钥内容
# 4. 点击 "Add SSH key"
```

**测试SSH连接：**

```bash
ssh -T git@github.com

# 成功会显示：
# Hi Shipeng-Guo! You've successfully authenticated...
```

### 2. 确认Git Remote配置

```bash
cd /home/shipeng/wsl_projects/FigureScout

# 检查remote URL
git remote -v

# 应该显示SSH格式：
# origin  git@github.com:Shipeng-Guo/FigureScout.git (fetch)
# origin  git@github.com:Shipeng-Guo/FigureScout.git (push)
```

**如果是HTTPS格式，改为SSH：**

```bash
# 移除旧的remote
git remote remove origin

# 添加SSH格式的remote
git remote add origin git@github.com:Shipeng-Guo/FigureScout.git

# 验证
git remote -v
```

---

## 版本更新流程

### 第1步：更新VERSION文件

```bash
cd /home/shipeng/wsl_projects/FigureScout

# 编辑VERSION文件，例如改为 1.6.0
echo "1.6.0" > VERSION

# 确认
cat VERSION
```

### 第2步：更新CHANGELOG.md

在 `CHANGELOG.md` 开头添加新版本的更新日志：

```markdown
## [1.6.0] - 2025-11-XX

### ✨ 新增功能

- 功能1：描述
- 功能2：描述

### 🐛 Bug修复

- 修复问题1
- 修复问题2

### 🔧 优化改进

- 优化1
- 优化2

---
```

### 第3步：更新README.md

更新README中的版本徽章：

```markdown
[![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)](./VERSION)
```

### 第4步：同步前端版本号

使用自动同步脚本：

```bash
cd /home/shipeng/wsl_projects/FigureScout

# 运行版本同步脚本
bash sync_version.sh

# 输出示例：
# 📦 当前版本: 1.6.0
# 🔄 更新 frontend/package.json...
# ✅ frontend/package.json 已更新到 v1.6.0
# 🎉 版本号同步完成！
```

### 第5步：验证版本一致性

```bash
# 检查所有版本号是否一致
echo "VERSION文件:"
cat VERSION

echo ""
echo "package.json:"
grep '"version"' frontend/package.json

echo ""
echo "README.md:"
grep 'version-' README.md | head -1

echo ""
echo "CHANGELOG.md:"
head -20 CHANGELOG.md | grep "^\[1\."
```

**所有版本号应该一致！**

---

## Git提交步骤

### 第1步：检查修改状态

```bash
cd /home/shipeng/wsl_projects/FigureScout

# 查看修改的文件
git status

# 查看具体修改内容
git diff
```

### 第2步：添加修改到暂存区

```bash
# 添加所有修改的文件
git add .

# 或者选择性添加：
# git add VERSION
# git add CHANGELOG.md
# git add README.md
# git add frontend/package.json
```

### 第3步：提交修改

```bash
# 提交（使用规范的commit message）
git commit -m "chore: release v1.6.0 - 版本更新说明"

# commit message格式建议：
# - chore: 日常维护
# - feat: 新功能
# - fix: Bug修复
# - docs: 文档更新
# - style: 代码格式
# - refactor: 代码重构
# - perf: 性能优化
# - test: 测试相关
```

**示例：**

```bash
git commit -m "chore: release v1.6.0 - 添加导出功能和性能优化"
```

### 第4步：创建Git标签

```bash
# 创建标签
git tag v1.6.0

# 查看所有标签
git tag -l

# 查看标签详情
git show v1.6.0
```

**创建带注释的标签（推荐）：**

```bash
git tag -a v1.6.0 -m "Release v1.6.0: 添加导出功能和性能优化"
```

---

## 推送到GitHub

### 第1步：推送代码

```bash
cd /home/shipeng/wsl_projects/FigureScout

# 推送到main分支
git push origin main
```

**预期输出：**

```
To github.com:Shipeng-Guo/FigureScout.git
   abc1234..def5678  main -> main
```

### 第2步：推送标签

```bash
# 推送单个标签
git push origin v1.6.0

# 或推送所有标签
git push origin --tags
```

**预期输出：**

```
To github.com:Shipeng-Guo/FigureScout.git
 * [new tag]         v1.6.0 -> v1.6.0
```

### 第3步：验证推送成功

```bash
# 查看远程仓库状态
git log --oneline -5

# 查看远程标签
git ls-remote --tags origin
```

**访问GitHub验证：**

1. 打开：https://github.com/Shipeng-Guo/FigureScout
2. 检查最新提交是否显示
3. 检查Tags页面是否有新标签

---

## 创建GitHub Release

### 方法1：通过Web界面（推荐）

**第1步：访问Releases页面**

访问：https://github.com/Shipeng-Guo/FigureScout/releases

**第2步：创建新Release**

1. 点击 **"Draft a new release"** 按钮

2. **选择标签**：
   - 在 "Choose a tag" 下拉框中选择 `v1.6.0`

3. **填写Release标题**：
   ```
   v1.6.0 - 添加导出功能和性能优化
   ```

4. **填写描述内容**（从CHANGELOG复制）：

```markdown
## 🎉 v1.6.0 更新内容

### ✨ 新增功能

- **导出功能**：支持导出结果为PDF和Excel格式
- **批注系统**：可以为文章添加个人标注
- **高级筛选**：支持按期刊、年份、全文状态筛选

### 🐛 Bug修复

- 修复大量文章时的内存泄漏问题
- 修复排序后序号错位的问题
- 修复项目加载失败的边界情况

### 🔧 性能优化

- 优化数据库查询性能（提升50%）
- 减少不必要的重新渲染
- 优化大文件处理速度

### 📊 性能指标

- 处理速度：提升30%
- 内存占用：降低40%
- 启动时间：< 2秒

---

**完整更新日志**：查看 [CHANGELOG.md](https://github.com/Shipeng-Guo/FigureScout/blob/main/CHANGELOG.md)

**安装说明**：查看 [README.md](https://github.com/Shipeng-Guo/FigureScout/blob/main/README.md)
```

5. **选择Release类型**：
   - ✅ 勾选 "Set as the latest release"
   - 如果是预发布版，勾选 "Set as a pre-release"

6. **点击 "Publish release"**

**第3步：验证Release**

访问：https://github.com/Shipeng-Guo/FigureScout/releases/tag/v1.6.0

检查：
- ✅ Release标题正确
- ✅ 描述内容完整
- ✅ 标签正确
- ✅ 源代码包自动生成

### 方法2：使用GitHub CLI（高级）

**安装GitHub CLI：**

```bash
# Ubuntu/Debian
sudo apt install gh

# 或从官网下载
# https://cli.github.com/
```

**创建Release：**

```bash
# 登录GitHub
gh auth login

# 创建Release
gh release create v1.6.0 \
  --title "v1.6.0 - 添加导出功能和性能优化" \
  --notes-file RELEASE_NOTES.md

# 或从CHANGELOG提取
gh release create v1.6.0 \
  --title "v1.6.0 - 添加导出功能和性能优化" \
  --generate-notes
```

---

## 常见问题处理

### 问题1：推送被拒绝（Permission denied）

**错误信息：**

```
Permission denied (publickey).
fatal: Could not read from remote repository.
```

**解决方法：**

```bash
# 1. 检查SSH密钥
ssh -T git@github.com

# 2. 如果失败，重新添加SSH密钥到ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# 3. 再次测试
ssh -T git@github.com
```

### 问题2：远程仓库有更新

**错误信息：**

```
! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com:Shipeng-Guo/FigureScout.git'
```

**解决方法：**

```bash
# 1. 拉取远程更新
git pull origin main --rebase

# 2. 解决冲突（如果有）
# 编辑冲突文件，然后：
git add .
git rebase --continue

# 3. 重新推送
git push origin main
```

### 问题3：数据库文件被误提交

**警告信息：**

```
remote: warning: File backend/figurescout_projects.db is 61.09 MB
remote: warning: GH001: Large files detected.
```

**解决方法：**

```bash
# 1. 添加到.gitignore
echo "*.db" >> .gitignore
echo "backend/figurescout_projects.db" >> .gitignore

# 2. 从Git缓存中移除
git rm --cached backend/figurescout_projects.db

# 3. 提交更改
git add .gitignore
git commit -m "chore: add database files to .gitignore"

# 4. 推送
git push origin main
```

### 问题4：忘记创建标签就推送了

**解决方法：**

```bash
# 1. 创建标签（指向最新提交）
git tag v1.6.0

# 2. 推送标签
git push origin v1.6.0
```

### 问题5：标签推送错误

**错误信息：**

```
error: tag 'v1.6.0' already exists
```

**解决方法：**

```bash
# 1. 删除本地标签
git tag -d v1.6.0

# 2. 重新创建标签
git tag v1.6.0

# 3. 强制推送标签（谨慎使用）
git push origin v1.6.0 --force
```

---

## 完整流程快速参考

### 快速命令清单

```bash
# 1. 进入项目目录
cd /home/shipeng/wsl_projects/FigureScout

# 2. 更新版本号
echo "1.6.0" > VERSION

# 3. 同步前端版本
bash sync_version.sh

# 4. 编辑CHANGELOG和README（手动）

# 5. 查看修改
git status
git diff

# 6. 提交修改
git add .
git commit -m "chore: release v1.6.0 - 更新说明"

# 7. 创建标签
git tag v1.6.0

# 8. 推送到GitHub
git push origin main
git push origin v1.6.0

# 9. 验证
git log --oneline -3
git tag -l

# 10. 访问GitHub创建Release
# https://github.com/Shipeng-Guo/FigureScout/releases/new
```

### 推送前检查清单

- [ ] VERSION文件已更新
- [ ] CHANGELOG.md已添加新版本说明
- [ ] README.md版本徽章已更新
- [ ] frontend/package.json版本已同步
- [ ] 代码已通过测试
- [ ] 已执行 `git status` 检查修改
- [ ] commit message格式正确
- [ ] 已创建Git标签
- [ ] SSH连接正常

### 推送后检查清单

- [ ] GitHub上看到最新提交
- [ ] Tags页面显示新标签
- [ ] README显示正确版本号
- [ ] 已创建GitHub Release
- [ ] Release描述完整准确

---

## 版本号规范

FigureScout遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

### 格式：MAJOR.MINOR.PATCH

- **MAJOR（主版本号）**：不兼容的API修改
  - 例如：1.0.0 → 2.0.0
  - 使用场景：重大架构调整、不兼容更新

- **MINOR（次版本号）**：向下兼容的功能新增
  - 例如：1.5.0 → 1.6.0
  - 使用场景：新功能、新特性

- **PATCH（修订号）**：向下兼容的Bug修复
  - 例如：1.5.0 → 1.5.1
  - 使用场景：Bug修复、小优化

### 版本号示例

| 版本号 | 说明 |
|-------|------|
| 1.0.0 | 初始正式版本 |
| 1.1.0 | 新增排序功能 |
| 1.1.1 | 修复排序Bug |
| 1.2.0 | 新增渐进式加载 |
| 2.0.0 | 重构整个架构（不兼容） |

---

## 自动化脚本（可选）

创建一个自动化发布脚本 `release.sh`：

```bash
#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 请提供版本号${NC}"
    echo "用法: ./release.sh <version>"
    echo "示例: ./release.sh 1.6.0"
    exit 1
fi

VERSION=$1

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}开始发布 v${VERSION}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. 更新VERSION文件
echo -e "${YELLOW}[1/8]${NC} 更新VERSION文件..."
echo "$VERSION" > VERSION
echo -e "${GREEN}✓${NC} VERSION已更新为 $VERSION"
echo ""

# 2. 同步前端版本
echo -e "${YELLOW}[2/8]${NC} 同步前端版本..."
bash sync_version.sh
echo ""

# 3. 提示编辑CHANGELOG和README
echo -e "${YELLOW}[3/8]${NC} 请确认已更新 CHANGELOG.md 和 README.md"
read -p "按回车继续..."
echo ""

# 4. 显示修改
echo -e "${YELLOW}[4/8]${NC} 查看修改内容..."
git status
echo ""

# 5. 提交修改
echo -e "${YELLOW}[5/8]${NC} 提交修改..."
git add .
git commit -m "chore: release v${VERSION}"
echo -e "${GREEN}✓${NC} 已提交"
echo ""

# 6. 创建标签
echo -e "${YELLOW}[6/8]${NC} 创建Git标签..."
git tag "v${VERSION}"
echo -e "${GREEN}✓${NC} 已创建标签 v${VERSION}"
echo ""

# 7. 推送到GitHub
echo -e "${YELLOW}[7/8]${NC} 推送到GitHub..."
git push origin main
git push origin "v${VERSION}"
echo -e "${GREEN}✓${NC} 已推送到GitHub"
echo ""

# 8. 完成
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ v${VERSION} 发布完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "下一步："
echo "  1. 访问 https://github.com/Shipeng-Guo/FigureScout/releases"
echo "  2. 创建新的Release"
echo "  3. 从CHANGELOG.md复制更新内容"
echo ""
```

**使用方法：**

```bash
# 添加执行权限
chmod +x release.sh

# 发布新版本
./release.sh 1.6.0
```

---

## 参考链接

- **GitHub官方文档**：https://docs.github.com/
- **语义化版本规范**：https://semver.org/lang/zh-CN/
- **Git标签管理**：https://git-scm.com/book/zh/v2/Git-基础-打标签
- **SSH密钥配置**：https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

## 总结

完成版本发布需要以下步骤：

1. ✅ **更新版本号**（VERSION + sync_version.sh）
2. ✅ **更新文档**（CHANGELOG.md + README.md）
3. ✅ **Git提交**（git add + commit）
4. ✅ **创建标签**（git tag）
5. ✅ **推送代码**（git push）
6. ✅ **推送标签**（git push tag）
7. ✅ **创建Release**（GitHub Web界面）
8. ✅ **验证发布**（检查GitHub页面）

**遵循这个流程，确保每次发布都规范、完整、可追溯！**

---

**最后更新**: 2025-11-11  
**适用版本**: FigureScout v1.5.0+

