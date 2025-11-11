"""
FigureScout 后端服务
提供文献检索和内容提取API
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional
import re
from pmc_fetcher import PMCFetcher
from europepmc_searcher import EuropePMCSearcher
from database import ProjectDatabase

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化数据库
db = ProjectDatabase()

# 配置高质量期刊列表
HIGH_QUALITY_JOURNALS = [
    "Nature",
    "Nature Cancer",
    "Nature Medicine",
    "Nature Genetics",
    "Nature Biotechnology",
    "Cancer Discovery",
    "Cancer Research",
    "Cancer Cell",
    "Cell",
    "Science",
    "Cell Reports",
    "Nature Communications"
]

class PubMedSearcher:
    """PubMed文献检索类"""
    
    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    
    def __init__(self):
        self.email = "figurescout@example.com"  # 建议设置邮箱
    
    def search_articles(self, keyword: str, years: int = 3) -> List[str]:
        """
        搜索包含关键词的文章
        
        Args:
            keyword: 搜索关键词（如 DepMap）
            years: 搜索近几年的文章
            
        Returns:
            文章ID列表
        """
        # 计算日期范围
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years*365)
        
        # 构建搜索查询
        date_range = f"{start_date.strftime('%Y/%m/%d')}:{end_date.strftime('%Y/%m/%d')}"
        journal_query = " OR ".join([f'"{journal}"[Journal]' for journal in HIGH_QUALITY_JOURNALS])
        
        # 修复：日期范围不应该用引号括起来
        query = f'({keyword}) AND ({journal_query}) AND {date_range}[PDAT]'
        
        # 执行搜索
        search_url = f"{self.BASE_URL}esearch.fcgi"
        params = {
            "db": "pubmed",
            "term": query,
            "retmax": 100,  # 最多返回100篇文章
            "retmode": "xml",
            "sort": "relevance"
        }
        
        try:
            response = requests.get(search_url, params=params, timeout=10)
            response.raise_for_status()
            
            # 解析XML响应
            root = ET.fromstring(response.content)
            id_list = root.find(".//IdList")
            
            if id_list is not None:
                return [id_elem.text for id_elem in id_list.findall("Id")]
            return []
        except Exception as e:
            print(f"搜索错误: {e}")
            return []
    
    def fetch_article_details(self, pmid_list: List[str]) -> List[Dict]:
        """
        获取文章详细信息
        
        Args:
            pmid_list: PubMed ID列表
            
        Returns:
            文章详情列表
        """
        if not pmid_list:
            return []
        
        fetch_url = f"{self.BASE_URL}efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": ",".join(pmid_list),
            "retmode": "xml"
        }
        
        try:
            response = requests.get(fetch_url, params=params, timeout=30)
            response.raise_for_status()
            
            # 解析文章信息
            root = ET.fromstring(response.content)
            articles = []
            
            for article in root.findall(".//PubmedArticle"):
                article_data = self._parse_article(article)
                if article_data:
                    articles.append(article_data)
            
            return articles
        except Exception as e:
            print(f"获取文章详情错误: {e}")
            return []
    
    def _parse_article(self, article_elem) -> Optional[Dict]:
        """解析单篇文章信息"""
        try:
            medline = article_elem.find(".//MedlineCitation")
            pmid_elem = medline.find(".//PMID")
            article_node = medline.find(".//Article")
            
            title_elem = article_node.find(".//ArticleTitle")
            abstract_elem = article_node.find(".//Abstract/AbstractText")
            journal_elem = article_node.find(".//Journal/Title")
            pub_date = article_node.find(".//Journal/JournalIssue/PubDate")
            
            # 提取作者
            authors = []
            author_list = article_node.find(".//AuthorList")
            if author_list is not None:
                for author in author_list.findall("Author")[:3]:  # 只取前3位作者
                    lastname = author.find("LastName")
                    forename = author.find("ForeName")
                    if lastname is not None:
                        name = lastname.text
                        if forename is not None:
                            name = f"{forename.text} {name}"
                        authors.append(name)
            
            # 提取年份
            year = ""
            if pub_date is not None:
                year_elem = pub_date.find("Year")
                if year_elem is not None:
                    year = year_elem.text
            
            # 获取DOI
            doi = None
            article_id_list = article_elem.find(".//PubmedData/ArticleIdList")
            if article_id_list is not None:
                for article_id in article_id_list.findall("ArticleId"):
                    if article_id.get("IdType") == "doi":
                        doi = article_id.text
                        break
            
            return {
                "pmid": pmid_elem.text if pmid_elem is not None else "",
                "title": title_elem.text if title_elem is not None else "",
                "abstract": abstract_elem.text if abstract_elem is not None else "",
                "journal": journal_elem.text if journal_elem is not None else "",
                "year": year,
                "authors": authors,
                "doi": doi,
                "figures": []  # 图表信息将在后续步骤提取
            }
        except Exception as e:
            print(f"解析文章错误: {e}")
            return None

@app.route('/', methods=['GET'])
def index():
    """根路径 - 显示API信息"""
    return jsonify({
        "name": "FigureScout API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "search": "/api/search (POST)",
            "article": "/api/article/<pmid> (GET)"
        },
        "frontend": "http://localhost:3000"
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({"status": "ok", "message": "FigureScout API is running"})

@app.route('/api/search', methods=['POST'])
def search_literature():
    """
    文献搜索接口 - 使用 Europe PMC 全文搜索
    
    Request JSON:
        {
            "keyword": "DepMap",
            "years": 3,
            "fetch_fulltext": true  // 可选，是否获取详细全文分析
        }
    """
    try:
        data = request.get_json()
        keyword = data.get('keyword', '')
        years = data.get('years', 3)
        fetch_fulltext = data.get('fetch_fulltext', True)  # 默认获取详细全文分析
        max_fulltext = data.get('max_fulltext', 20)  # 渐进式加载：初次只处理20篇
        
        if not keyword:
            return jsonify({"error": "关键词不能为空"}), 400
        
        print(f"\n{'='*60}")
        print(f"搜索关键词: {keyword}")
        print(f"时间范围: 近{years}年")
        print(f"初次全文处理: {max_fulltext}篇")
        print(f"使用 Europe PMC 全文搜索（包括方法、结果章节）")
        print(f"{'='*60}\n")
        
        # 使用 Europe PMC 全文搜索
        # 根据时间范围动态调整返回数量
        # 时间越长，可能的文章越多
        page_size = min(50 * years, 500)  # 每年50篇，最多500篇
        
        europepmc_searcher = EuropePMCSearcher()
        articles = europepmc_searcher.search_fulltext(
            keyword=keyword,
            years=years,
            journals=HIGH_QUALITY_JOURNALS,
            page_size=page_size
        )
        
        if not articles:
            print("⚠️ Europe PMC 未找到文章，尝试 PubMed 搜索...")
            # 降级到 PubMed 搜索
            searcher = PubMedSearcher()
            pmid_list = searcher.search_articles(keyword, years)
            if pmid_list:
                articles = searcher.fetch_article_details(pmid_list)
                for article in articles:
                    article['relevance'] = analyze_relevance(article, keyword)
                    article['keyword'] = keyword
                    article['has_fulltext'] = False
        
        if not articles:
            return jsonify({
                "keyword": keyword,
                "total": 0,
                "fulltext_available": 0,
                "results": []
            })
        
        print(f"✅ Europe PMC 找到 {len(articles)} 篇文章\n")
        
        # 🔧 修复：先按相关性排序，确保处理的是最相关的文章
        articles.sort(key=lambda x: x.get('relevance', {}).get('score', 0), reverse=True)
        
        # 获取详细的全文分析（PMC XML 解析）
        if fetch_fulltext:
            pmc_fetcher = PMCFetcher()
            max_process = min(len(articles), max_fulltext)
            print(f"开始获取详细全文分析（已排序），共 {max_process} 篇...\n")
            
            processed_count = 0
            for idx, article in enumerate(articles[:max_process], 1):
                # 修改：不再直接跳过没有 pmc_id 的文章
                # pmc_fetcher.get_fulltext_info 会尝试通过 PMID 获取 PMC ID
                article['fulltext_processed'] = True  # 标记已尝试处理
                
                try:
                    # 获取详细的章节分析、图表等
                    # 注意：这个方法内部会先通过 PMID 获取 PMC ID
                    fulltext_info = pmc_fetcher.get_fulltext_info(article['pmid'], keyword)
                    
                    if fulltext_info and fulltext_info.get('fulltext'):
                        # 成功获取全文
                        article['fulltext'] = fulltext_info['fulltext']
                        article['has_fulltext'] = True  # 只有成功获取才设为True
                        article['pmc_id'] = fulltext_info.get('pmc_id') or article.get('pmc_id')
                        article['pmc_available'] = True
                        
                        mentions = fulltext_info['fulltext']['total_mentions']
                        pmc_id = article.get('pmc_id', 'N/A')
                        print(f"[{idx}/{max_process}] ✅ {pmc_id}: 找到 {mentions} 处提及")
                        
                        # 基于全文提及次数调整相关性分数
                        if mentions > 0:
                            article['relevance']['score'] += mentions * 5
                        
                        processed_count += 1
                    else:
                        # 无法获取全文（可能没有PMC ID或全文不可用）
                        pmid = article.get('pmid', 'N/A')
                        pmc_id = article.get('pmc_id', '')
                        
                        if not pmc_id:
                            print(f"[{idx}/{max_process}] ⚠️ PMID {pmid}: 无PMC ID，无法获取全文")
                        else:
                            print(f"[{idx}/{max_process}] ⚠️ {pmc_id}: 全文不可用或解析失败")
                        
                        article['has_fulltext'] = False
                        article['pmc_available'] = bool(pmc_id)
                        
                except Exception as e:
                    print(f"[{idx}/{max_process}] ❌ PMID {article.get('pmid', 'N/A')}: 处理失败 - {e}")
                    article['has_fulltext'] = False
                    article['pmc_available'] = bool(article.get('pmc_id'))
            
            print(f"\n✅ 完成详细分析: {processed_count}/{max_process} 篇\n")
        
        # 🔧 修复：统计已尝试处理和成功获取的数量
        attempted_count = sum(1 for a in articles if a.get('fulltext_processed', False))
        fulltext_count = sum(1 for a in articles if a.get('has_fulltext', False))
        
        print(f"{'='*60}")
        print(f"搜索完成:")
        print(f"  总文章数: {len(articles)}")
        print(f"  已尝试处理: {attempted_count}") 
        print(f"  成功获取全文: {fulltext_count}")
        if len(articles) >= page_size:
            print(f"  ⚠️  结果可能被截断（达到{page_size}篇上限）")
        print(f"{'='*60}\n")
        
        # 检查是否达到上限
        is_truncated = len(articles) >= page_size
        
        return jsonify({
            "keyword": keyword,
            "total": len(articles),
            "processed": attempted_count if fetch_fulltext else 0,  # ✅ 修复：返回已尝试处理的数量
            "fulltext_available": fulltext_count,  # 成功获取全文的数量
            "search_method": "Europe PMC Full-Text Search",
            "is_truncated": is_truncated,
            "page_size": page_size,
            "results": articles
        })
        
    except Exception as e:
        print(f"搜索错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/retry-failed', methods=['POST'])
def retry_failed():
    """
    重新处理失败的文章
    
    请求体: {articles: [失败的文章列表], keyword}
    返回: {processed, failed, results}
    """
    try:
        data = request.get_json()
        failed_articles = data.get('articles', [])
        keyword = data.get('keyword', '')
        
        if not failed_articles:
            return jsonify({"processed": 0, "failed": 0, "results": []})
        
        print(f"\n{'='*60}")
        print(f"重新处理失败的文章: 共 {len(failed_articles)} 篇")
        print(f"{'='*60}\n")
        
        pmc_fetcher = PMCFetcher()
        processed_articles = []
        processed_count = 0
        still_failed = 0
        
        for idx, article in enumerate(failed_articles, 1):
            # 修改：不再直接跳过没有 pmc_id 的文章
            # 尝试通过 PMID 获取
            article['fulltext_processed'] = True
            
            try:
                fulltext_info = pmc_fetcher.get_fulltext_info(article['pmid'], keyword)
                
                if fulltext_info and fulltext_info.get('fulltext'):
                    # 成功获取全文
                    article['fulltext'] = fulltext_info['fulltext']
                    article['has_fulltext'] = True
                    article['pmc_id'] = fulltext_info.get('pmc_id') or article.get('pmc_id')
                    article['pmc_available'] = True
                    article['fulltext_error'] = None
                    
                    mentions = fulltext_info['fulltext']['total_mentions']
                    pmc_id = article.get('pmc_id', 'N/A')
                    print(f"[{idx}/{len(failed_articles)}] ✅ {pmc_id}: 重试成功，找到 {mentions} 处提及")
                    
                    if mentions > 0:
                        article['relevance']['score'] += mentions * 5
                    
                    processed_count += 1
                else:
                    # 重试失败
                    pmid = article.get('pmid', 'N/A')
                    pmc_id = article.get('pmc_id', '')
                    
                    if not pmc_id:
                        print(f"[{idx}/{len(failed_articles)}] ⚠️ PMID {pmid}: 无PMC ID")
                        article['fulltext_error'] = 'NO_PMC_ID'
                    else:
                        print(f"[{idx}/{len(failed_articles)}] ⚠️ {pmc_id}: 全文不可用")
                        article['fulltext_error'] = 'FETCH_FAILED'
                    
                    article['has_fulltext'] = False
                    article['pmc_available'] = bool(pmc_id)
                    still_failed += 1
                    
            except Exception as e:
                print(f"[{idx}/{len(failed_articles)}] ❌ PMID {article.get('pmid', 'N/A')}: 重试出错 - {e}")
                article['fulltext_error'] = str(e)
                article['has_fulltext'] = False
                article['pmc_available'] = bool(article.get('pmc_id'))
                still_failed += 1
            
            processed_articles.append(article)
        
        print(f"\n✅ 重试完成: 成功 {processed_count} 篇，仍失败 {still_failed} 篇\n")
        
        return jsonify({
            "processed": processed_count,
            "failed": still_failed,
            "results": processed_articles
        })
    
    except Exception as e:
        print(f"重试错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/continue-fulltext', methods=['POST'])
def continue_fulltext():
    """
    继续处理更多文章的详细全文（渐进式加载）
    
    请求体: {articles: [待处理的文章列表], keyword}
    返回: {processed, results}
    """
    try:
        data = request.get_json()
        articles_to_process = data.get('articles', [])
        keyword = data.get('keyword', '')
        
        if not keyword:
            return jsonify({"error": "关键词不能为空"}), 400
        
        if not articles_to_process:
            return jsonify({
                "processed": 0,
                "results": []
            })
        
        print(f"\n{'='*60}")
        print(f"继续处理全文: {keyword}")
        print(f"待处理文章数: {len(articles_to_process)}")
        print(f"{'='*60}\n")
        
        # 直接使用传入的文章列表，不再重新搜索！
        target_articles = articles_to_process
        
        # 处理全文
        pmc_fetcher = PMCFetcher()
        processed_articles = []
        processed_count = 0
        
        for idx, article in enumerate(target_articles, 1):
            # 修改：不再直接跳过没有 pmc_id 的文章
            article['fulltext_processed'] = True
            
            try:
                fulltext_info = pmc_fetcher.get_fulltext_info(article['pmid'], keyword)
                
                if fulltext_info and fulltext_info.get('fulltext'):
                    # 成功获取全文
                    article['fulltext'] = fulltext_info['fulltext']
                    article['has_fulltext'] = True
                    article['pmc_id'] = fulltext_info.get('pmc_id') or article.get('pmc_id')
                    article['pmc_available'] = True
                    
                    mentions = fulltext_info['fulltext']['total_mentions']
                    pmc_id = article.get('pmc_id', 'N/A')
                    print(f"[{idx}/{len(target_articles)}] ✅ {pmc_id}: 找到 {mentions} 处提及")
                    
                    if mentions > 0:
                        article['relevance']['score'] += mentions * 5
                    
                    processed_count += 1
                else:
                    # 无法获取全文
                    pmid = article.get('pmid', 'N/A')
                    pmc_id = article.get('pmc_id', '')
                    
                    if not pmc_id:
                        print(f"[{idx}/{len(target_articles)}] ⚠️ PMID {pmid}: 无PMC ID")
                    else:
                        print(f"[{idx}/{len(target_articles)}] ⚠️ {pmc_id}: 全文不可用")
                    
                    article['has_fulltext'] = False
                    article['pmc_available'] = bool(pmc_id)
                    
            except Exception as e:
                print(f"[{idx}/{len(target_articles)}] ❌ PMID {article.get('pmid', 'N/A')}: 处理失败 - {e}")
                article['has_fulltext'] = False
                article['pmc_available'] = bool(article.get('pmc_id'))
            
            # 无论成功还是失败，都返回文章
            processed_articles.append(article)
        
        print(f"\n✅ 完成增量处理: {processed_count}/{len(target_articles)} 篇\n")
        
        return jsonify({
            "processed": processed_count,
            "results": processed_articles
        })
    
    except Exception as e:
        print(f"错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def analyze_relevance(article: Dict, keyword: str) -> Dict:
    """
    分析文章与关键词的相关性
    
    Returns:
        {
            "score": 相关性分数,
            "mentions": 关键词出现位置列表,
            "context": 关键词上下文片段
        }
    """
    title = article.get('title', '').lower()
    abstract = article.get('abstract', '').lower()
    keyword_lower = keyword.lower()
    
    score = 0
    mentions = []
    contexts = []
    
    # 在标题中出现，分数更高
    if keyword_lower in title:
        score += 50
        mentions.append("title")
    
    # 在摘要中查找关键词
    if keyword_lower in abstract:
        score += 30
        mentions.append("abstract")
        
        # 提取关键词周围的上下文
        pattern = re.compile(f'.{{0,100}}{re.escape(keyword_lower)}.{{0,100}}', re.IGNORECASE)
        matches = pattern.findall(article.get('abstract', ''))
        contexts = [match.strip() for match in matches[:3]]  # 最多3个上下文
    
    return {
        "score": score,
        "mentions": mentions,
        "contexts": contexts
    }

@app.route('/api/article/<pmid>', methods=['GET'])
def get_article_detail(pmid: str):
    """
    获取单篇文章的详细信息
    """
    try:
        searcher = PubMedSearcher()
        articles = searcher.fetch_article_details([pmid])
        
        if articles:
            return jsonify(articles[0])
        else:
            return jsonify({"error": "文章未找到"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== 项目管理API ====================

@app.route('/api/projects', methods=['POST'])
def create_project():
    """
    创建新项目
    
    请求体: {name, keyword, years, description (可选)}
    返回: {project_id, message}
    """
    try:
        data = request.get_json()
        name = data.get('name', '')
        keyword = data.get('keyword', '')
        years = data.get('years', 3)
        description = data.get('description', '')
        
        if not name or not keyword:
            return jsonify({"error": "项目名称和关键词不能为空"}), 400
        
        project_id = db.create_project(name, keyword, years, description)
        
        return jsonify({
            "project_id": project_id,
            "message": "项目创建成功"
        })
    
    except Exception as e:
        print(f"创建项目错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects', methods=['GET'])
def list_projects():
    """
    获取项目列表
    
    查询参数: limit (默认50), offset (默认0)
    返回: {projects: [...]}
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        projects = db.list_projects(limit, offset)
        
        return jsonify({
            "projects": projects,
            "count": len(projects)
        })
    
    except Exception as e:
        print(f"获取项目列表错误: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id: str):
    """
    获取项目详情和所有文章
    
    返回: {project: {...}, articles: [...]}
    """
    try:
        result = db.load_project(project_id)
        
        if result is None:
            return jsonify({"error": "项目未找到"}), 404
        
        return jsonify(result)
    
    except Exception as e:
        print(f"加载项目错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id: str):
    """
    更新项目元数据
    
    请求体: {name (可选), description (可选)}
    返回: {message}
    """
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        
        success = db.update_project_metadata(project_id, name, description)
        
        if success:
            return jsonify({"message": "项目更新成功"})
        else:
            return jsonify({"error": "项目未找到或无更新"}), 404
    
    except Exception as e:
        print(f"更新项目错误: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id: str):
    """
    删除项目及所有相关文章
    
    返回: {message}
    """
    try:
        success = db.delete_project(project_id)
        
        if success:
            return jsonify({"message": "项目删除成功"})
        else:
            return jsonify({"error": "项目未找到"}), 404
    
    except Exception as e:
        print(f"删除项目错误: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects/<project_id>/articles', methods=['POST'])
def save_project_articles(project_id: str):
    """
    保存文章到项目（批量保存/更新）
    
    请求体: {articles: [...]}
    返回: {saved_count, message}
    """
    try:
        data = request.get_json()
        articles = data.get('articles', [])
        
        if not articles:
            return jsonify({"error": "文章列表不能为空"}), 400
        
        saved_count = db.save_articles(project_id, articles)
        
        # 获取更新后的统计信息
        stats = db.get_project_stats(project_id)
        
        return jsonify({
            "saved_count": saved_count,
            "message": f"成功保存 {saved_count} 篇文章",
            "stats": stats
        })
    
    except Exception as e:
        print(f"保存文章错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/projects/<project_id>/stats', methods=['GET'])
def get_project_statistics(project_id: str):
    """
    获取项目统计信息
    
    返回: {project_id, name, total_articles, processed_articles, ...}
    """
    try:
        stats = db.get_project_stats(project_id)
        
        if stats is None:
            return jsonify({"error": "项目未找到"}), 404
        
        return jsonify(stats)
    
    except Exception as e:
        print(f"获取统计信息错误: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("Starting FigureScout API Server...")
    print("API available at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

