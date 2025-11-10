"""
PubMed Central (PMC) 全文获取模块
"""
import requests
import xml.etree.ElementTree as ET
from typing import Optional, Dict, List
import re

class PMCFetcher:
    """PMC全文获取和解析类"""
    
    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    
    def __init__(self):
        self.session = requests.Session()
    
    def get_pmc_id(self, pmid: str) -> Optional[str]:
        """
        根据PubMed ID获取PMC ID
        
        Args:
            pmid: PubMed ID
            
        Returns:
            PMC ID (如 'PMC1234567') 或 None
        """
        try:
            url = f"{self.BASE_URL}elink.fcgi"
            params = {
                "dbfrom": "pubmed",
                "id": pmid,
                "linkname": "pubmed_pmc",
                "retmode": "xml"
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            
            # 查找PMC ID
            pmc_id_elem = root.find(".//Link/Id")
            if pmc_id_elem is not None and pmc_id_elem.text:
                pmc_id = pmc_id_elem.text
                # 避免重复PMC前缀
                if not pmc_id.startswith("PMC"):
                    pmc_id = f"PMC{pmc_id}"
                return pmc_id
            
            return None
        except Exception as e:
            print(f"获取PMC ID错误 (PMID: {pmid}): {e}")
            return None
    
    def fetch_fulltext_xml(self, pmc_id: str) -> Optional[str]:
        """
        获取PMC全文XML
        
        Args:
            pmc_id: PMC ID (如 'PMC1234567')
            
        Returns:
            XML文本内容
        """
        try:
            # 移除PMC前缀
            pmc_numeric = pmc_id.replace("PMC", "")
            
            url = f"{self.BASE_URL}efetch.fcgi"
            params = {
                "db": "pmc",
                "id": pmc_numeric,
                "rettype": "xml",
                "retmode": "xml"
            }
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            return response.text
        except Exception as e:
            print(f"获取全文XML错误 (PMC ID: {pmc_id}): {e}")
            return None
    
    def parse_fulltext(self, xml_content: str, keyword: str) -> Optional[Dict]:
        """
        解析PMC全文XML，提取章节和关键词信息
        
        Args:
            xml_content: XML文本内容
            keyword: 搜索关键词
            
        Returns:
            包含全文信息的字典
        """
        try:
            root = ET.fromstring(xml_content.encode('utf-8'))
            
            # 提取文章正文
            body = root.find(".//body")
            if body is None:
                return None
            
            fulltext_info = {
                "methods": None,
                "results": None,
                "discussion": None,
                "keyword_mentions": [],
                "total_mentions": 0,
                "figures": []
            }
            
            # 提取各章节
            sections = body.findall(".//sec")
            
            for section in sections:
                section_type = section.get("sec-type", "")
                title_elem = section.find(".//title")
                section_title = title_elem.text.lower() if title_elem is not None and title_elem.text else ""
                
                # 获取章节文本
                section_text = self._extract_text(section)
                
                # 根据类型或标题识别章节
                if "method" in section_type or "method" in section_title:
                    fulltext_info["methods"] = section_text
                elif "result" in section_type or "result" in section_title:
                    fulltext_info["results"] = section_text
                elif "discussion" in section_type or "discuss" in section_title or "conclusion" in section_title:
                    fulltext_info["discussion"] = section_text
                
                # 在章节中查找关键词
                mentions = self._find_keyword_mentions(section_text, keyword, section_title or section_type)
                fulltext_info["keyword_mentions"].extend(mentions)
            
            # 提取图表信息
            figures = self._extract_figures(root, keyword)
            fulltext_info["figures"] = figures
            
            # 统计总提及次数
            fulltext_info["total_mentions"] = len(fulltext_info["keyword_mentions"])
            
            return fulltext_info
            
        except Exception as e:
            print(f"解析全文XML错误: {e}")
            return None
    
    def _extract_text(self, element) -> str:
        """提取元素的所有文本内容"""
        text_parts = []
        
        for text in element.itertext():
            if text and text.strip():
                text_parts.append(text.strip())
        
        return " ".join(text_parts)
    
    def _find_keyword_mentions(self, text: str, keyword: str, section: str) -> List[Dict]:
        """
        在文本中查找关键词并提取上下文
        
        Args:
            text: 文本内容
            keyword: 关键词
            section: 章节名称
            
        Returns:
            包含提及信息的列表
        """
        mentions = []
        keyword_lower = keyword.lower()
        text_lower = text.lower()
        
        # 查找所有匹配位置
        pos = 0
        while True:
            pos = text_lower.find(keyword_lower, pos)
            if pos == -1:
                break
            
            # 提取上下文 (前后200字符)
            start = max(0, pos - 200)
            end = min(len(text), pos + len(keyword) + 200)
            context = text[start:end].strip()
            
            # 提取完整句子或段落
            paragraph_start = text.rfind(". ", 0, pos) + 2
            paragraph_end = text.find(". ", pos + len(keyword))
            if paragraph_end == -1:
                paragraph_end = len(text)
            else:
                paragraph_end += 1
            
            paragraph = text[max(0, paragraph_start):paragraph_end].strip()
            
            mentions.append({
                "section": section,
                "context": context,
                "paragraph": paragraph[:500],  # 限制长度
                "position": pos
            })
            
            pos += len(keyword)
        
        return mentions
    
    def _extract_figures(self, root, keyword: str) -> List[Dict]:
        """
        提取图表信息
        
        Args:
            root: XML根元素
            keyword: 关键词
            
        Returns:
            图表信息列表
        """
        figures = []
        keyword_lower = keyword.lower()
        
        # 查找所有图表
        fig_elements = root.findall(".//fig")
        
        for fig in fig_elements:
            fig_id = fig.get("id", "")
            label_elem = fig.find(".//label")
            caption_elem = fig.find(".//caption")
            
            label = label_elem.text if label_elem is not None and label_elem.text else ""
            caption_text = self._extract_text(caption_elem) if caption_elem is not None else ""
            
            # 检查图注中是否包含关键词
            mentions_keyword = keyword_lower in caption_text.lower()
            
            if caption_text:  # 只添加有图注的图表
                figures.append({
                    "id": fig_id,
                    "label": label,
                    "caption": caption_text[:1000],  # 限制长度
                    "mentions_keyword": mentions_keyword
                })
        
        return figures
    
    def get_fulltext_info(self, pmid: str, keyword: str) -> Optional[Dict]:
        """
        获取文章的完整全文信息
        
        Args:
            pmid: PubMed ID
            keyword: 搜索关键词
            
        Returns:
            包含PMC ID和全文信息的字典
        """
        # 获取PMC ID
        pmc_id = self.get_pmc_id(pmid)
        if not pmc_id:
            return None
        
        # 获取全文XML
        xml_content = self.fetch_fulltext_xml(pmc_id)
        if not xml_content:
            return None
        
        # 解析全文
        fulltext_info = self.parse_fulltext(xml_content, keyword)
        if not fulltext_info:
            return None
        
        return {
            "pmc_id": pmc_id,
            "has_fulltext": True,
            "fulltext": fulltext_info
        }


# 使用示例
if __name__ == "__main__":
    fetcher = PMCFetcher()
    
    # 测试
    test_pmid = "39614072"  # Nature Communications文章
    keyword = "DepMap"
    
    print(f"测试PMID: {test_pmid}")
    print(f"关键词: {keyword}\n")
    
    # 获取PMC ID
    pmc_id = fetcher.get_pmc_id(test_pmid)
    print(f"PMC ID: {pmc_id}")
    
    if pmc_id:
        # 获取完整信息
        fulltext_info = fetcher.get_fulltext_info(test_pmid, keyword)
        
        if fulltext_info:
            print(f"\n✅ 成功获取全文")
            print(f"总提及次数: {fulltext_info['fulltext']['total_mentions']}")
            print(f"图表数量: {len(fulltext_info['fulltext']['figures'])}")
            
            if fulltext_info['fulltext']['methods']:
                print(f"\n方法章节长度: {len(fulltext_info['fulltext']['methods'])} 字符")
                print(f"方法片段: {fulltext_info['fulltext']['methods'][:200]}...")
            
            if fulltext_info['fulltext']['keyword_mentions']:
                print(f"\n首次提及位置: {fulltext_info['fulltext']['keyword_mentions'][0]['section']}")
                print(f"上下文: {fulltext_info['fulltext']['keyword_mentions'][0]['context'][:150]}...")

