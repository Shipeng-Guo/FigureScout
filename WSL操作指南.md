# FigureScout 在 WSL 中的启动与关闭指南

> 本文档提供在Windows Subsystem for Linux (WSL)中启动和关闭FigureScout应用的详细步骤

---

## 📋 目录

1. [快速启动](#快速启动)
2. [手动启动](#手动启动)
3. [关闭应用](#关闭应用)
4. [检查运行状态](#检查运行状态)
5. [常见问题](#常见问题)
6. [命令速查表](#命令速查表)

---

## 快速启动

### 方法1：使用启动脚本（推荐）

```bash
# 进入项目目录
cd /home/shipeng/wsl_projects/FigureScout

# 使用启动脚本
bash start.sh
```

**预期输出：**
```
启动 FigureScout...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
启动后端服务...
后端已启动 (PID: 12345)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
启动前端服务...
前端已启动 (PID: 12346)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FigureScout 启动成功！

后端服务: http://localhost:5000
前端应用: http://localhost:3000

按 Ctrl+C 停止前端，或关闭终端窗口
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**访问应用：**
- 在浏览器中打开：`http://localhost:3000`

---

## 手动启动

如果启动脚本不可用，可以手动启动前后端。

### 第1步：启动后端

```bash
# 进入后端目录
cd /home/shipeng/wsl_projects/FigureScout/backend

# 激活Python虚拟环境
source venv/bin/activate

# 启动Flask后端（前台运行）
python app.py
```

**或在后台运行：**

```bash
# 后台启动
nohup python app.py > backend.log 2>&1 &

# 记录进程ID
echo $! > backend.pid

# 查看日志
tail -f backend.log
```

**预期输出：**
```
✅ 数据库初始化完成: figurescout_projects.db
Starting FigureScout API Server...
API available at: http://localhost:5000
 * Running on http://127.0.0.1:5000
 * Restarting with stat
 * Debugger is active!
```

**验证后端运行：**
```bash
# 测试健康检查
curl http://localhost:5000/api/health

# 应该返回：
# {"message": "FigureScout API is running", "status": "healthy"}
```

### 第2步：启动前端（新终端）

**打开新的WSL终端窗口：**

```bash
# 进入前端目录
cd /home/shipeng/wsl_projects/FigureScout/frontend

# 启动Vite开发服务器（前台运行）
npm run dev
```

**或在后台运行：**

```bash
# 后台启动
nohup npm run dev > frontend.log 2>&1 &

# 记录进程ID
echo $! > frontend.pid

# 查看日志
tail -f frontend.log
```

**预期输出：**
```
> figurescout-frontend@1.5.0 dev
> vite

  VITE v5.4.21  ready in 493 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://172.23.178.122:3000/
```

**验证前端运行：**
```bash
# 测试前端
curl http://localhost:3000

# 或在浏览器打开
# http://localhost:3000
```

### 第3步：访问应用

在Windows浏览器中打开：
- 🌐 **http://localhost:3000**

---

## 关闭应用

### 方法1：前台运行时关闭

如果应用在前台运行（没有使用`nohup`）：

```bash
# 在运行应用的终端窗口按：
Ctrl + C

# 对前端和后端分别操作
```

### 方法2：后台运行时关闭

#### 快速关闭所有服务

```bash
# 关闭所有FigureScout相关进程
pkill -f "python app.py"
pkill -f "node.*vite"

# 验证是否关闭
ps aux | grep -E "(python app.py|node.*vite)" | grep -v grep
```

#### 精确关闭（使用PID）

**如果记录了PID：**

```bash
# 关闭后端
kill $(cat /home/shipeng/wsl_projects/FigureScout/backend/backend.pid)

# 关闭前端
kill $(cat /home/shipeng/wsl_projects/FigureScout/frontend/frontend.pid)

# 清理PID文件
rm -f /home/shipeng/wsl_projects/FigureScout/backend/backend.pid
rm -f /home/shipeng/wsl_projects/FigureScout/frontend/frontend.pid
```

**手动查找PID：**

```bash
# 查找后端进程
ps aux | grep "python app.py" | grep -v grep

# 输出示例：
# shipeng  12345  0.5  0.0  43220  36352  python app.py
#          ^^^^^ 
#          这是PID

# 关闭后端
kill 12345

# 查找前端进程
ps aux | grep "node.*vite" | grep -v grep

# 输出示例：
# shipeng  12346  2.0  0.1  22341632  103952  node .../vite
#          ^^^^^
#          这是PID

# 关闭前端
kill 12346
```

#### 强制关闭（如果正常关闭失败）

```bash
# 强制关闭后端
pkill -9 -f "python app.py"

# 强制关闭前端
pkill -9 -f "node.*vite"
```

### 方法3：一键关闭脚本

创建关闭脚本：

```bash
cat > /home/shipeng/wsl_projects/FigureScout/stop.sh << 'EOF'
#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "关闭 FigureScout..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 关闭后端
echo "🛑 关闭后端服务..."
pkill -f "python app.py" && echo "✅ 后端已关闭" || echo "⚠️  后端未运行"

# 关闭前端
echo "🛑 关闭前端服务..."
pkill -f "node.*vite" && echo "✅ 前端已关闭" || echo "⚠️  前端未运行"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FigureScout 已关闭"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EOF

# 添加执行权限
chmod +x /home/shipeng/wsl_projects/FigureScout/stop.sh
```

**使用关闭脚本：**

```bash
cd /home/shipeng/wsl_projects/FigureScout
bash stop.sh
```

---

## 检查运行状态

### 快速检查

```bash
# 一键检查前后端状态
cd /home/shipeng/wsl_projects/FigureScout

echo "🔍 检查后端..."
ps aux | grep "python app.py" | grep -v grep && echo "✅ 后端运行中" || echo "❌ 后端未运行"

echo ""
echo "🔍 检查前端..."
ps aux | grep "node.*vite" | grep -v grep && echo "✅ 前端运行中" || echo "❌ 前端未运行"

echo ""
echo "🔍 检查端口..."
lsof -i:5000 2>/dev/null | grep LISTEN && echo "✅ 端口 5000（后端）正常" || echo "❌ 端口 5000 空闲"
lsof -i:3000 2>/dev/null | grep LISTEN && echo "✅ 端口 3000（前端）正常" || echo "❌ 端口 3000 空闲"
```

### 详细检查

```bash
# 创建检查脚本
cat > /home/shipeng/wsl_projects/FigureScout/status.sh << 'EOF'
#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FigureScout 运行状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查后端进程
echo "📡 后端服务:"
BACKEND_PID=$(ps aux | grep "python app.py" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
    echo "   ✅ 运行中 (PID: $BACKEND_PID)"
    echo "   📍 监听: http://localhost:5000"
else
    echo "   ❌ 未运行"
fi
echo ""

# 检查前端进程
echo "🎨 前端服务:"
FRONTEND_PID=$(ps aux | grep "node.*vite" | grep -v grep | awk '{print $2}')
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
EOF

chmod +x /home/shipeng/wsl_projects/FigureScout/status.sh
```

**使用状态检查脚本：**

```bash
cd /home/shipeng/wsl_projects/FigureScout
bash status.sh
```

---

## 常见问题

### 问题1：端口已被占用

**错误信息：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方法：**

```bash
# 查找占用端口的进程
lsof -i:3000

# 示例输出：
# COMMAND   PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345 shipeng   34u  IPv4 8797909      0t0  TCP *:3000 (LISTEN)

# 关闭该进程
kill 12345

# 或强制关闭所有占用3000端口的进程
fuser -k 3000/tcp

# 对5000端口执行相同操作
fuser -k 5000/tcp
```

### 问题2：Python虚拟环境未激活

**错误信息：**
```
ModuleNotFoundError: No module named 'flask'
```

**解决方法：**

```bash
# 激活虚拟环境
cd /home/shipeng/wsl_projects/FigureScout/backend
source venv/bin/activate

# 验证
which python
# 应该显示: /home/shipeng/wsl_projects/FigureScout/backend/venv/bin/python

# 如果虚拟环境不存在，创建它
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 问题3：npm依赖缺失

**错误信息：**
```
Error: Cannot find module 'vite'
```

**解决方法：**

```bash
# 安装依赖
cd /home/shipeng/wsl_projects/FigureScout/frontend
npm install

# 如果npm install很慢，使用国内镜像
npm install --registry=https://registry.npmmirror.com
```

### 问题4：无法访问http://localhost:3000

**可能原因：**
1. 前端服务未启动
2. WSL网络问题
3. 浏览器缓存

**解决方法：**

```bash
# 1. 检查前端是否运行
ps aux | grep vite

# 2. 检查端口
lsof -i:3000

# 3. 测试连接
curl http://localhost:3000

# 4. 如果curl能访问但浏览器不行，清除浏览器缓存
# Windows浏览器: Ctrl + Shift + R

# 5. 如果WSL2网络有问题，使用WSL的IP
# 在WSL中运行：
hostname -I
# 例如输出: 172.23.178.122

# 在Windows浏览器访问:
# http://172.23.178.122:3000
```

### 问题5：后台进程僵死

**症状：**
- `ps aux` 显示进程存在但无响应
- 端口被占用但API不响应

**解决方法：**

```bash
# 强制杀死所有相关进程
pkill -9 -f "python app.py"
pkill -9 -f "node.*vite"

# 清理残留端口
fuser -k 5000/tcp
fuser -k 3000/tcp

# 等待几秒
sleep 3

# 重新启动
cd /home/shipeng/wsl_projects/FigureScout
bash start.sh
```

### 问题6：数据库锁定

**错误信息：**
```
sqlite3.OperationalError: database is locked
```

**解决方法：**

```bash
# 1. 关闭所有FigureScout进程
pkill -f "python app.py"

# 2. 等待几秒让数据库连接关闭
sleep 3

# 3. 如果问题持续，检查数据库文件
cd /home/shipeng/wsl_projects/FigureScout/backend
ls -la figurescout_projects.db*

# 4. 删除锁文件（如果存在）
rm -f figurescout_projects.db-journal
rm -f figurescout_projects.db-shm
rm -f figurescout_projects.db-wal

# 5. 重启后端
python app.py
```

---

## 命令速查表

### 启动命令

```bash
# 快速启动（推荐）
cd /home/shipeng/wsl_projects/FigureScout && bash start.sh

# 后端启动
cd /home/shipeng/wsl_projects/FigureScout/backend
source venv/bin/activate
python app.py

# 后端后台启动
cd /home/shipeng/wsl_projects/FigureScout/backend
source venv/bin/activate
nohup python app.py > backend.log 2>&1 &

# 前端启动
cd /home/shipeng/wsl_projects/FigureScout/frontend
npm run dev

# 前端后台启动
cd /home/shipeng/wsl_projects/FigureScout/frontend
nohup npm run dev > frontend.log 2>&1 &
```

### 关闭命令

```bash
# 快速关闭所有
pkill -f "python app.py"
pkill -f "node.*vite"

# 使用关闭脚本
cd /home/shipeng/wsl_projects/FigureScout && bash stop.sh

# 前台运行时
Ctrl + C

# 强制关闭
pkill -9 -f "python app.py"
pkill -9 -f "node.*vite"
```

### 检查命令

```bash
# 检查状态
cd /home/shipeng/wsl_projects/FigureScout && bash status.sh

# 检查进程
ps aux | grep -E "(python app.py|node.*vite)" | grep -v grep

# 检查端口
lsof -i:5000
lsof -i:3000

# 测试API
curl http://localhost:5000/api/health
curl http://localhost:3000
```

### 日志查看

```bash
# 后端日志
tail -f /home/shipeng/wsl_projects/FigureScout/backend/backend.log

# 前端日志
tail -f /home/shipeng/wsl_projects/FigureScout/frontend/frontend.log

# 实时查看（如果前台运行）
# 直接在运行的终端查看输出
```

---

## 推荐工作流

### 日常使用（简单）

```bash
# 1. 启动
cd /home/shipeng/wsl_projects/FigureScout
bash start.sh

# 2. 在浏览器使用
# http://localhost:3000

# 3. 完成后关闭终端窗口即可
# 或使用 Ctrl+C
```

### 开发调试（详细）

```bash
# 1. 打开终端1 - 后端
cd /home/shipeng/wsl_projects/FigureScout/backend
source venv/bin/activate
python app.py
# 保持此终端打开，观察后端日志

# 2. 打开终端2 - 前端
cd /home/shipeng/wsl_projects/FigureScout/frontend
npm run dev
# 保持此终端打开，观察前端日志

# 3. 打开终端3 - 操作命令
cd /home/shipeng/wsl_projects/FigureScout
# 用于执行其他命令、查看状态等

# 4. 完成后
# 在终端1和2分别按 Ctrl+C
```

### 长期后台运行

```bash
# 1. 后台启动
cd /home/shipeng/wsl_projects/FigureScout/backend
source venv/bin/activate
nohup python app.py > backend.log 2>&1 &
echo $! > backend.pid

cd /home/shipeng/wsl_projects/FigureScout/frontend
nohup npm run dev > frontend.log 2>&1 &
echo $! > frontend.pid

# 2. 验证运行
bash status.sh

# 3. 需要时关闭
kill $(cat backend/backend.pid)
kill $(cat frontend/frontend.pid)
```

---

## Windows快捷方式（可选）

### 创建Windows批处理文件

**启动脚本 `启动FigureScout.bat`：**

```batch
@echo off
echo 启动 FigureScout...
wsl -d Ubuntu -e bash -c "cd /home/shipeng/wsl_projects/FigureScout && bash start.sh"
pause
```

**关闭脚本 `关闭FigureScout.bat`：**

```batch
@echo off
echo 关闭 FigureScout...
wsl -d Ubuntu -e bash -c "pkill -f 'python app.py'; pkill -f 'node.*vite'"
echo 已关闭
pause
```

**检查状态 `检查FigureScout.bat`：**

```batch
@echo off
wsl -d Ubuntu -e bash -c "cd /home/shipeng/wsl_projects/FigureScout && bash status.sh"
pause
```

**使用方法：**
1. 在Windows中创建这些`.bat`文件
2. 双击运行
3. 可以创建桌面快捷方式

---

## 系统要求

- **WSL版本**: WSL 2（推荐）
- **Linux发行版**: Ubuntu 20.04+
- **Python**: 3.8+
- **Node.js**: 16+
- **可用内存**: 至少 2GB
- **磁盘空间**: 至少 1GB

---

## 快速命令卡片

**打印此卡片贴在显示器旁：**

```
╔═══════════════════════════════════════════╗
║      FigureScout WSL 快速命令             ║
╠═══════════════════════════════════════════╣
║ 启动: cd ~/wsl_projects/FigureScout      ║
║       bash start.sh                      ║
║                                           ║
║ 关闭: Ctrl+C 或 bash stop.sh             ║
║                                           ║
║ 状态: bash status.sh                     ║
║                                           ║
║ 访问: http://localhost:3000              ║
║                                           ║
║ 紧急: pkill -9 -f "python app.py"        ║
║       pkill -9 -f "node.*vite"           ║
╚═══════════════════════════════════════════╝
```

---

## 总结

### 最简单的使用方式

```bash
# 启动
cd /home/shipeng/wsl_projects/FigureScout && bash start.sh

# 访问
浏览器打开 http://localhost:3000

# 关闭
Ctrl + C
```

### 完整的专业方式

1. ✅ 使用 `start.sh` 启动
2. ✅ 使用 `status.sh` 检查状态
3. ✅ 使用 `stop.sh` 关闭
4. ✅ 遇到问题查看日志文件

**记住：简单永远是最好的！** 🚀

---

**最后更新**: 2025-11-11  
**适用版本**: FigureScout v1.5.0+  
**WSL版本**: WSL 2 / Ubuntu 20.04+

