# FigureScout

> 文献数据集使用案例检索工具 - 从高质量期刊中提取数据集的使用案例、相关图表和方法描述

## 📖 项目简介

FigureScout 是一个智能文献检索工具，可以帮助您：
- 🔍 在高质量期刊中搜索特定数据集的使用案例
- 📊 自动提取相关图表和图注
- 📝 整理数据集的使用方法和分析流程
- 🔬 支持全文检索（不仅限于摘要）

### 支持的期刊

- Nature 系列（Nature, Nature Genetics, Nature Cancer 等）
- Cancer Discovery
- Cancer Research
- Cancer Cell
- 更多高影响因子期刊...

## ✨ 主要功能

### 1. 全文检索
- 支持方法和结果章节的深度搜索
- 不局限于摘要中提及的关键词
- 自动获取 PubMed Central (PMC) 全文

### 2. 智能排序
- **相关性排序**：按相关性评分排序
- **时间排序**：最新发布的文献在前
- **杂志排序**：按杂志名称字母顺序

### 3. 详细信息展示
- 📅 精确到天的发布日期（YYYY-MM-DD）
- 📖 杂志名称
- 🔢 关键词提及次数
- 📄 全文内容（方法、结果、讨论）
- 🖼️ 图表和图注
- 🔗 直接链接到 PMC 全文

### 4. 实时进度显示
- 搜索过程可视化
- 三阶段进度条：检索 → 处理 → 解析
- 实时百分比显示

## 🚀 快速开始

### 系统要求

- Python 3.8+
- Node.js 16+
- 网络连接（访问 PubMed 和 Europe PMC API）

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd FigureScout
```

#### 2. 后端设置

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. 前端设置

```bash
cd frontend
npm install
```

### 启动应用

#### 方式 1：使用启动脚本

**Linux/Mac:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

#### 方式 2：手动启动

**启动后端（终端1）:**
```bash
cd backend
source venv/bin/activate
python app.py
```

**启动前端（终端2）:**
```bash
cd frontend
npm run dev
```

### 访问应用

打开浏览器访问：
```
http://localhost:3000
```

后端 API 地址：
```
http://localhost:5000
```

## 📚 使用指南

### 基本使用

1. **输入关键词**
   - 数据集名称（如：DepMap, TCGA, GTEx）
   - 生物标记物（如：BRCA1, TP53）
   - 任何研究相关的关键词

2. **选择时间范围**
   - 1年、3年、5年或自定义

3. **点击搜索**
   - 观察进度条显示
   - 等待结果加载

4. **浏览结果**
   - 查看相关性评分
   - 点击展开查看详细信息
   - 使用排序功能调整顺序

5. **查看全文**
   - 点击"PMC 全文"按钮
   - 查看方法和结果章节
   - 浏览图表和图注

### 搜索示例

**示例 1：查找 DepMap 使用案例**
```
关键词：DepMap
时间范围：3年
期望结果：肿瘤依赖性数据的使用案例
```

**示例 2：查找 BRCA1 相关研究**
```
关键词：BRCA1
时间范围：5年
期望结果：BRCA1 基因相关的研究文献
```

## 🏗️ 项目结构

```
FigureScout/
├── backend/                 # Flask 后端
│   ├── app.py              # 主应用
│   ├── europepmc_searcher.py  # Europe PMC 搜索
│   ├── pmc_fetcher.py      # PMC 全文获取
│   ├── pdf_extractor.py    # PDF 处理（预留）
│   ├── requirements.txt    # Python 依赖
│   └── venv/              # 虚拟环境（不提交）
│
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/    # React 组件
│   │   │   ├── SearchBar.tsx
│   │   │   ├── ResultList.tsx
│   │   │   └── ResultItem.tsx
│   │   ├── types.ts       # TypeScript 类型定义
│   │   ├── App.tsx        # 主应用组件
│   │   └── main.tsx       # 入口文件
│   ├── package.json       # Node 依赖
│   ├── vite.config.ts     # Vite 配置
│   └── node_modules/      # Node 模块（不提交）
│
├── .gitignore             # Git 忽略文件
├── start.sh               # Linux/Mac 启动脚本
├── start.bat              # Windows 启动脚本
└── README.md              # 本文档
```

## 🛠️ 技术栈

### 后端
- **Flask**: Python Web 框架
- **Requests**: HTTP 客户端
- **Europe PMC API**: 全文文献搜索
- **PubMed E-utilities**: 文献元数据获取

### 前端
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **Tailwind CSS**: 样式框架
- **Lucide React**: 图标库

## 🔧 配置说明

### 后端配置

**支持的杂志列表** (`backend/app.py`):
```python
HIGH_QUALITY_JOURNALS = [
    "Nature", "Science", "Cell",
    "Nature Genetics", "Nature Cancer",
    "Cancer Discovery", "Cancer Research",
    "Cancer Cell", ...
]
```

**API 端点**:
- `GET /`: API 信息
- `GET /api/health`: 健康检查
- `POST /api/search`: 文献搜索

### 前端配置

**API 代理** (`frontend/vite.config.ts`):
```typescript
server: {
  host: '0.0.0.0',
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    }
  }
}
```

## 🐛 常见问题

### 1. 前端无法访问（WSL 用户）

**问题**: 在 WSL 中运行，Windows 浏览器无法访问 `localhost:3000`

**解决方案**: 
- 已在 `vite.config.ts` 中配置 `host: '0.0.0.0'`
- 可以使用 `http://localhost:3000` 或 `http://<WSL_IP>:3000`

### 2. 搜索结果为空

**可能原因**:
- 关键词太具体
- 时间范围内无相关文献
- API 连接问题

**解决方案**:
- 尝试更通用的关键词
- 扩大时间范围
- 检查网络连接

### 3. 前端显示旧版本

**问题**: 更新代码后前端没有变化

**解决方案**:
- 强制刷新：`Ctrl + Shift + R` (Windows) 或 `Cmd + Shift + R` (Mac)
- 清除浏览器缓存
- 使用无痕模式测试

### 4. 杂志名称不显示

**已修复**: 后端现在支持从 Europe PMC API 的嵌套结构中获取杂志名称

### 5. 时间过滤无效

**已修复**: 动态调整 `page_size` 参数，确保时间过滤器有效

## 📊 性能优化

### 搜索优化
- 使用 Europe PMC API 的全文搜索功能
- 动态调整返回数量（基于时间范围）
- 智能缓存机制（Vite HMR）

### 存储优化
- `node_modules/` 和 `venv/` 已加入 `.gitignore`
- 仅保留源代码和配置文件
- 实际代码库大小：< 1MB

## 🔐 API 限制

### Europe PMC API
- 无需 API key
- 无严格速率限制
- 仅返回开放获取（Open Access）文献

### PubMed E-utilities
- 无需 API key（匿名访问）
- 速率限制：3 请求/秒
- 建议注册 API key 以提高限制

## 🚧 已知限制

1. **仅支持开放获取文献**
   - 付费墙后的文献无法获取全文
   - 但可以看到摘要和元数据

2. **进度条为模拟**
   - 当前进度条是前端模拟
   - 未来可考虑 WebSocket 实现真实进度

3. **图片显示**
   - PMC 图片链接可能需要额外处理
   - 部分图片可能无法直接显示

## 🔄 版本历史

### v1.1.0 (2025-11-10)
- ✅ 修复 PMC 链接重复前缀问题
- ✅ 添加精确到天的日期显示
- ✅ 添加杂志名称显示
- ✅ 实现排序功能（相关性/时间/杂志）
- ✅ 添加搜索进度条和状态显示
- ✅ 修复时间过滤器无效问题
- ✅ 修复杂志名称不显示问题

### v1.0.0 (2025-11-10)
- ✅ 基础搜索功能
- ✅ Europe PMC 全文搜索集成
- ✅ PMC 全文内容提取
- ✅ 关键词高亮显示
- ✅ 响应式 UI 设计

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发路线图

### 短期计划
- [ ] 添加导出功能（PDF/CSV）
- [ ] 支持批量搜索
- [ ] 添加搜索历史
- [ ] 优化移动端体验

### 中期计划
- [ ] 整合更多数据源（Unpaywall, bioRxiv）
- [ ] AI 辅助摘要提取
- [ ] 图像识别和分析
- [ ] 用户账户系统

### 长期计划
- [ ] 知识图谱可视化
- [ ] 文献关系分析
- [ ] 引文网络展示
- [ ] 协作标注功能

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 🙏 致谢

- [PubMed E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [Europe PMC API](https://europepmc.org/RestfulWebService)
- [React](https://react.dev/)
- [Flask](https://flask.palletsprojects.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发起 Discussion
- Email: [您的邮箱]

---

**更新日期**: 2025-11-10  
**版本**: v1.1.0  
**状态**: 🟢 活跃开发中
