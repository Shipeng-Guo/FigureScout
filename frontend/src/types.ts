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
  relevance: {
    score: number
    mentions: string[]
    contexts: string[]
  }
  figures?: Figure[]
  // 全文信息
  pmc_id?: string
  has_fulltext?: boolean
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

