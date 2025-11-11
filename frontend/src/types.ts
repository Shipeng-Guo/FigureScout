export interface Article {
  pmid: string
  title: string
  abstract: string
  journal: string
  year: string
  date?: string  // 新增：精确日期 YYYYMMDD
  authors: string[]
  doi: string | null
  keyword: string
  originalIndex?: number  // 🔧 新增：原始序号，用于追踪文章顺序
  relevance: {
    score: number
    mentions: string[]
    contexts: string[]
  }
  figures?: Figure[]
  // 全文信息
  pmc_id?: string
  pmc_available?: boolean  // PMC链接是否可用
  has_fulltext?: boolean  // 是否已成功解析全文
  fulltext_processed?: boolean  // 是否已尝试处理
  fulltext?: {
    methods?: string
    results?: string
    discussion?: string
    keyword_mentions: KeywordMention[]
    total_mentions: number
    figures: Figure[]
  }
}

export interface Figure {
  id: string
  label: string
  caption: string
  mentions_keyword: boolean
  imageUrl?: string
  description?: string
  methods?: string
}

export interface KeywordMention {
  section: string
  context: string
  paragraph: string
  position: number
}

export interface SearchRequest {
  keyword: string
  years: number
}

export interface SearchResponse {
  keyword: string
  total: number
  results: Article[]
}

