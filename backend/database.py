"""
项目存储系统 - 数据库模块
使用 SQLite 存储检索项目和结果
"""
import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional
import os

class ProjectDatabase:
    """项目数据库管理类"""
    
    def __init__(self, db_path: str = "figurescout_projects.db"):
        """初始化数据库连接"""
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """初始化数据库表结构"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 项目表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                keyword TEXT NOT NULL,
                years INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                total_articles INTEGER DEFAULT 0,
                processed_articles INTEGER DEFAULT 0,
                fulltext_articles INTEGER DEFAULT 0,
                search_method TEXT,
                description TEXT
            )
        ''')
        
        # 文章表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                pmid TEXT NOT NULL,
                pmc_id TEXT,
                title TEXT NOT NULL,
                abstract TEXT,
                journal TEXT,
                year TEXT,
                date TEXT,
                authors TEXT,
                doi TEXT,
                keyword TEXT,
                relevance_data TEXT,
                has_fulltext BOOLEAN DEFAULT 0,
                pmc_available BOOLEAN DEFAULT 0,
                fulltext_processed BOOLEAN DEFAULT 0,
                fulltext_data TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
                UNIQUE(project_id, pmid)
            )
        ''')
        
        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_project_id ON articles(project_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_pmid ON articles(pmid)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_updated_at ON projects(updated_at)')
        
        conn.commit()
        conn.close()
        
        print(f"✅ 数据库初始化完成: {self.db_path}")
    
    def create_project(self, name: str, keyword: str, years: int, 
                      description: str = "") -> str:
        """
        创建新项目
        
        Returns:
            project_id: 项目唯一ID
        """
        project_id = str(uuid.uuid4())[:8]  # 使用8位UUID
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO projects 
            (project_id, name, keyword, years, created_at, updated_at, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (project_id, name, keyword, years, now, now, description))
        
        conn.commit()
        conn.close()
        
        print(f"✅ 项目创建成功: {project_id}")
        return project_id
    
    def save_articles(self, project_id: str, articles: List[Dict]) -> int:
        """
        保存文章到项目（批量保存/更新）
        
        Args:
            project_id: 项目ID
            articles: 文章列表
            
        Returns:
            保存/更新的文章数量
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        saved_count = 0
        
        for article in articles:
            # 准备数据
            authors_json = json.dumps(article.get('authors', []))
            relevance_json = json.dumps(article.get('relevance', {}))
            fulltext_json = json.dumps(article.get('fulltext', {})) if article.get('fulltext') else None
            
            # 尝试插入或更新
            cursor.execute('''
                INSERT INTO articles 
                (project_id, pmid, pmc_id, title, abstract, journal, year, date, 
                 authors, doi, keyword, relevance_data, has_fulltext, pmc_available,
                 fulltext_processed, fulltext_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(project_id, pmid) DO UPDATE SET
                    pmc_id = excluded.pmc_id,
                    title = excluded.title,
                    abstract = excluded.abstract,
                    journal = excluded.journal,
                    year = excluded.year,
                    date = excluded.date,
                    authors = excluded.authors,
                    doi = excluded.doi,
                    relevance_data = excluded.relevance_data,
                    has_fulltext = excluded.has_fulltext,
                    pmc_available = excluded.pmc_available,
                    fulltext_processed = excluded.fulltext_processed,
                    fulltext_data = excluded.fulltext_data,
                    updated_at = excluded.updated_at
            ''', (
                project_id,
                article['pmid'],
                article.get('pmc_id'),
                article['title'],
                article.get('abstract'),
                article.get('journal'),
                article.get('year'),
                article.get('date'),
                authors_json,
                article.get('doi'),
                article.get('keyword'),
                relevance_json,
                article.get('has_fulltext', False),
                article.get('pmc_available', False),
                article.get('fulltext_processed', False),
                fulltext_json,
                now,
                now
            ))
            
            saved_count += 1
        
        # 更新项目统计
        cursor.execute('''
            UPDATE projects SET
                total_articles = (SELECT COUNT(*) FROM articles WHERE project_id = ?),
                processed_articles = (SELECT COUNT(*) FROM articles WHERE project_id = ? AND fulltext_processed = 1),
                fulltext_articles = (SELECT COUNT(*) FROM articles WHERE project_id = ? AND has_fulltext = 1),
                updated_at = ?
            WHERE project_id = ?
        ''', (project_id, project_id, project_id, now, project_id))
        
        conn.commit()
        conn.close()
        
        print(f"✅ 保存文章: {saved_count} 篇到项目 {project_id}")
        return saved_count
    
    def load_project(self, project_id: str) -> Optional[Dict]:
        """
        加载项目信息和所有文章
        
        Returns:
            {
                'project': {...},
                'articles': [...]
            }
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 加载项目信息
        cursor.execute('SELECT * FROM projects WHERE project_id = ?', (project_id,))
        project_row = cursor.fetchone()
        
        if not project_row:
            conn.close()
            return None
        
        project = dict(project_row)
        
        # 加载文章
        cursor.execute('''
            SELECT * FROM articles 
            WHERE project_id = ? 
            ORDER BY updated_at DESC
        ''', (project_id,))
        
        articles = []
        for row in cursor.fetchall():
            article = dict(row)
            # 解析JSON字段
            article['authors'] = json.loads(article['authors']) if article['authors'] else []
            article['relevance'] = json.loads(article['relevance_data']) if article['relevance_data'] else {}
            if article['fulltext_data']:
                article['fulltext'] = json.loads(article['fulltext_data'])
            
            # 🔧 修复：确保布尔字段正确转换（SQLite存储为0/1）
            article['has_fulltext'] = bool(article.get('has_fulltext', 0))
            article['pmc_available'] = bool(article.get('pmc_available', 0))
            article['fulltext_processed'] = bool(article.get('fulltext_processed', 0))
            
            # 移除内部字段
            del article['id']
            del article['relevance_data']
            del article['fulltext_data']
            del article['created_at']
            del article['updated_at']
            
            articles.append(article)
        
        conn.close()
        
        return {
            'project': project,
            'articles': articles
        }
    
    def list_projects(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """
        获取项目列表（按更新时间倒序）
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM projects 
            ORDER BY updated_at DESC 
            LIMIT ? OFFSET ?
        ''', (limit, offset))
        
        projects = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return projects
    
    def delete_project(self, project_id: str) -> bool:
        """删除项目及所有相关文章"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # SQLite 会通过 ON DELETE CASCADE 自动删除相关文章
        cursor.execute('DELETE FROM projects WHERE project_id = ?', (project_id,))
        
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        if deleted:
            print(f"✅ 项目已删除: {project_id}")
        
        return deleted
    
    def update_project_metadata(self, project_id: str, name: str = None, 
                                description: str = None) -> bool:
        """更新项目元数据"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        updates = []
        params = []
        
        if name is not None:
            updates.append('name = ?')
            params.append(name)
        
        if description is not None:
            updates.append('description = ?')
            params.append(description)
        
        if not updates:
            conn.close()
            return False
        
        updates.append('updated_at = ?')
        params.append(now)
        params.append(project_id)
        
        sql = f"UPDATE projects SET {', '.join(updates)} WHERE project_id = ?"
        cursor.execute(sql, params)
        
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return updated
    
    def get_project_stats(self, project_id: str) -> Optional[Dict]:
        """获取项目统计信息"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM projects WHERE project_id = ?', (project_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None


# 使用示例
if __name__ == "__main__":
    # 测试数据库
    db = ProjectDatabase()
    
    # 创建测试项目
    project_id = db.create_project(
        name="DepMap数据集研究",
        keyword="DepMap",
        years=3,
        description="探索DepMap在癌症研究中的应用"
    )
    
    print(f"项目ID: {project_id}")
    
    # 列出所有项目
    projects = db.list_projects()
    print(f"总项目数: {len(projects)}")
    for p in projects[:5]:
        print(f"  - {p['project_id']}: {p['name']} ({p['total_articles']} 篇文章)")
