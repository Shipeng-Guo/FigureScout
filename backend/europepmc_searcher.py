"""
Europe PMC 全文搜索模块
真正的全文搜索，不只是摘要 - 能找到方法部分使用数据集的文章
"""
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class EuropePMCSearcher:
    """Europe PMC 全文搜索器"""
    
    BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest"
    
    def __init__(self):
        self.session = requests.Session()
    
    def search_fulltext(self, keyword: str, years: int = 3, 
                       journals: List[str] = None, page_size: int = 1000) -> List[Dict]:
        """
        在全文中搜索关键词（特别关注方法和结果章节）
        
        Args:
            keyword: 搜索关键词（如 DepMap）
            years: 搜索近几年
            journals: 期刊列表
            page_size: 返回结果数量
            
        Returns:
            文章列表，包含全文匹配信息
        """
        try:
            # 构建查询
            query_parts = []
            
            # 1. 核心：在方法或结果章节中搜索（这是关键！）
            # 同时搜索全文，确保不遗漏
            section_query = f"(METHODS:{keyword} OR RESULTS:{keyword} OR {keyword})"
            query_parts.append(section_query)
            
            # 2. 期刊筛选
            if journals:
                # Europe PMC 的期刊名称可能不完全匹配，使用宽松匹配
                journal_conditions = []
                for journal in journals:
                    # 处理期刊名称
                    if "Nature" in journal:
                        journal_conditions.append(f'JOURNAL:"{journal}"')
                    elif "Cancer" in journal:
                        journal_conditions.append(f'JOURNAL:"{journal}"')
                    elif "Cell" in journal:
                        journal_conditions.append(f'JOURNAL:"{journal}"')
                    elif "Science" in journal:
                        journal_conditions.append(f'JOURNAL:"{journal}"')
                
                if journal_conditions:
                    journal_query = " OR ".join(journal_conditions)
                    query_parts.append(f"({journal_query})")
            
            # 3. 时间范围
            end_year = datetime.now().year
            start_year = end_year - years
            query_parts.append(f"PUB_YEAR:[{start_year} TO {end_year}]")
            
            # 4. 只要开放获取（必须，否则无法获取全文）
            query_parts.append("OPEN_ACCESS:Y")
            
            # 5. 只要研究文章（排除评论、社论等）
            query_parts.append('(SRC:MED OR SRC:PMC)')
            
            # 组合查询
            query = " AND ".join(query_parts)
            
            print(f"Europe PMC 查询: {query}")
            
            # 执行搜索
            url = f"{self.BASE_URL}/search"
            params = {
                "query": query,
                "resultType": "core",  # 返回完整信息
                "pageSize": page_size,
                "format": "json",
                "synonym": "true",  # 包含同义词
                "cursorMark": "*"  # 用于分页
            }
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # 解析结果
            articles = []
            results = data.get("resultList", {}).get("result", [])
            
            print(f"Europe PMC 返回 {len(results)} 篇文章")
            
            for result in results:
                article = self._parse_result(result, keyword)
                if article:
                    articles.append(article)
            
            return articles
            
        except Exception as e:
            print(f"Europe PMC 搜索错误: {e}")
            return []
    
    def _parse_result(self, result: Dict, keyword: str) -> Optional[Dict]:
        """解析搜索结果"""
        try:
            # 提取基本信息
            pmid = result.get("pmid", "")
            pmcid = result.get("pmcid", "")
            
            if not pmid and not pmcid:
                return None
            
            # 修复PMC ID（避免重复PMC前缀）
            if pmcid:
                pmc_id = pmcid if pmcid.startswith("PMC") else f"PMC{pmcid}"
            else:
                pmc_id = None
            
            # 获取完整日期（精确到天）
            pub_date = result.get("firstPublicationDate", "")  # 格式：YYYY-MM-DD
            # 转换为YYYYMMDD格式
            date_formatted = pub_date.replace("-", "") if pub_date else ""
            
            # 获取杂志名称（处理不同的返回格式）
            journal = result.get("journalTitle", "")
            if not journal:
                # resultType="core" 时，杂志信息在嵌套结构中
                journal_info = result.get("journalInfo", {})
                if journal_info:
                    journal_obj = journal_info.get("journal", {})
                    journal = journal_obj.get("title", "")
            
            article = {
                "pmid": pmid,
                "pmc_id": pmc_id,
                "title": result.get("title", ""),
                "abstract": result.get("abstractText", ""),
                "journal": journal,
                "year": str(result.get("pubYear", "")),
                "date": date_formatted,  # 新增：精确日期YYYYMMDD
                "doi": result.get("doi"),
                "keyword": keyword,
                "has_fulltext": True,  # Europe PMC 搜索结果都有全文
                
                # Europe PMC 特有：全文匹配信息
                "fulltext_snippets": []
            }
            
            # 提取匹配的文本片段（上下文）
            # Europe PMC 会返回关键词周围的文本
            snippets_data = result.get("snippets", {})
            if isinstance(snippets_data, dict):
                snippets = snippets_data.get("snippets", [])
            else:
                snippets = []
            
            for snippet in snippets[:10]:  # 限制数量
                if keyword.lower() in snippet.lower():
                    article["fulltext_snippets"].append({
                        "text": snippet,
                        "has_keyword": True
                    })
            
            # 作者
            authors = []
            author_list = result.get("authorList", {})
            if author_list:
                author_data = author_list.get("author", [])
                for author in author_data[:3]:
                    first_name = author.get("firstName", "")
                    last_name = author.get("lastName", "")
                    if first_name or last_name:
                        name = f"{first_name} {last_name}".strip()
                        if name:
                            authors.append(name)
            
            article["authors"] = authors
            
            # 相关性评分（基于片段数量）
            article["relevance"] = {
                "score": len(article["fulltext_snippets"]) * 10,
                "mentions": ["fulltext"],
                "contexts": [s["text"] for s in article["fulltext_snippets"][:3]]
            }
            
            return article
            
        except Exception as e:
            print(f"解析 Europe PMC 结果错误: {e}")
            return None
    
    def get_article_fulltext(self, pmc_id: str) -> Optional[str]:
        """
        获取文章的完整全文
        
        Args:
            pmc_id: PMC ID (如 'PMC1234567')
            
        Returns:
            全文XML内容
        """
        try:
            # 移除 PMC 前缀
            pmc_numeric = pmc_id.replace("PMC", "")
            
            url = f"{self.BASE_URL}/{pmc_numeric}/fullTextXML"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            return response.text
            
        except Exception as e:
            print(f"获取 Europe PMC 全文错误 ({pmc_id}): {e}")
            return None


# 使用示例和测试
if __name__ == "__main__":
    searcher = EuropePMCSearcher()
    
    print("=" * 60)
    print("测试 Europe PMC 全文搜索")
    print("=" * 60)
    
    # 测试搜索
    keyword = "DepMap"
    journals = ["Nature", "Cancer Discovery", "Cancer Cell", "Nature Communications"]
    
    print(f"\n搜索关键词: {keyword}")
    print(f"期刊: {', '.join(journals)}")
    print(f"时间范围: 近3年")
    print("\n开始搜索...\n")
    
    articles = searcher.search_fulltext(
        keyword=keyword,
        years=3,
        journals=journals,
        page_size=50
    )
    
    print(f"\n{'=' * 60}")
    print(f"找到 {len(articles)} 篇文章")
    print(f"{'=' * 60}\n")
    
    for idx, article in enumerate(articles[:10], 1):
        print(f"{idx}. {article['title'][:70]}...")
        print(f"   期刊: {article['journal']}")
        print(f"   年份: {article['year']}")
        print(f"   PMID: {article['pmid']}")
        print(f"   PMC ID: {article['pmc_id']}")
        print(f"   全文片段数: {len(article['fulltext_snippets'])}")
        if article['fulltext_snippets']:
            print(f"   首个片段: {article['fulltext_snippets'][0]['text'][:100]}...")
        print()

