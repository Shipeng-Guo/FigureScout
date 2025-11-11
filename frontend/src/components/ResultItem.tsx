import { Article } from '../types'
import { ChevronDown, ChevronUp, ExternalLink, BookOpen, Calendar, Users, FileText, Image, Check } from 'lucide-react'

interface ResultItemProps {
  article: Article
  index: number
  expanded: boolean
  onToggle: () => void
  keyword: string
}

const ResultItem = ({ article, index, expanded, onToggle, keyword }: ResultItemProps) => {
  const getRelevanceBadge = (score: number) => {
    if (score >= 70) {
      return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">高度相关</span>
    } else if (score >= 40) {
      return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">相关</span>
    } else {
      return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">提及</span>
    }
  }

  // 格式化日期 YYYYMMDD -> YYYY-MM-DD
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
  }

  const highlightKeyword = (text: string) => {
    if (!keyword) return text
    
    const regex = new RegExp(`(${keyword})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* 文献编号 */}
              <span className="px-2.5 py-1 text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-sm">
                #{index}
              </span>
              {getRelevanceBadge(article.relevance.score)}
              {/* 显示全文解析状态 */}
              {article.has_fulltext && article.fulltext ? (
                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  已解析全文
                </span>
              ) : article.pmc_available ? (
                <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  PMC可用
                </span>
              ) : null}
              {article.has_fulltext && article.fulltext && article.fulltext.total_mentions > 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                  {article.fulltext.total_mentions} 处提及
                </span>
              )}
              <span className="text-xs text-gray-500">PMID: {article.pmid}</span>
              {article.pmc_id && (
                <span className="text-xs text-gray-500">{article.pmc_id}</span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
              {highlightKeyword(article.title)}
            </h3>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
              {(article.date || article.year) && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{article.date ? formatDate(article.date) : article.year}</span>
                </div>
              )}
              
              {article.journal && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium">{article.journal}</span>
                </div>
              )}
              
              {article.authors && article.authors.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{article.authors.join(', ')}</span>
                  {article.authors.length >= 3 && <span className="text-gray-400">et al.</span>}
                </div>
              )}
            </div>

            {article.relevance.mentions && article.relevance.mentions.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>出现位置:</span>
                {article.relevance.mentions.map((mention, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded">
                    {mention === 'title' ? '标题' : mention === 'abstract' ? '摘要' : mention}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <button
            className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 p-5 bg-gray-50">
          <div className="space-y-4">
            {/* Abstract */}
            {article.abstract && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  摘要
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {highlightKeyword(article.abstract)}
                </p>
              </div>
            )}

            {/* Full text sections */}
            {article.has_fulltext && article.fulltext && (
              <>
                {/* Methods section */}
                {article.fulltext.methods && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      方法部分 ({keyword} 使用详情)
                    </h4>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {highlightKeyword(article.fulltext.methods.substring(0, 800))}
                        {article.fulltext.methods.length > 800 && '...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Results section */}
                {article.fulltext.results && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      结果部分
                    </h4>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {highlightKeyword(article.fulltext.results.substring(0, 800))}
                        {article.fulltext.results.length > 800 && '...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Keyword mentions in fulltext */}
                {article.fulltext.keyword_mentions && article.fulltext.keyword_mentions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      📍 全文中的 {keyword} 使用案例 (共 {article.fulltext.total_mentions} 处)
                    </h4>
                    <div className="space-y-3">
                      {article.fulltext.keyword_mentions.slice(0, 5).map((mention, idx) => (
                        <div key={idx} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <div className="text-xs text-gray-600 mb-1 font-medium">
                            {mention.section || '正文'}
                          </div>
                          <p className="text-sm text-gray-700">
                            ...{highlightKeyword(mention.context)}...
                          </p>
                        </div>
                      ))}
                      {article.fulltext.keyword_mentions.length > 5 && (
                        <p className="text-xs text-gray-500 text-center">
                          还有 {article.fulltext.keyword_mentions.length - 5} 处提及...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Figures from fulltext */}
                {article.fulltext.figures && article.fulltext.figures.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-600" />
                      相关图表 ({article.fulltext.figures.length} 个)
                    </h4>
                    <div className="space-y-3">
                      {article.fulltext.figures.map((figure, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-lg border-2 ${
                            figure.mentions_keyword 
                              ? 'bg-green-50 border-green-300' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{figure.label}</span>
                            {figure.mentions_keyword && (
                              <span className="px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">
                                提及 {keyword}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            {highlightKeyword(figure.caption)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Context snippets (for articles without fulltext) */}
            {!article.has_fulltext && article.relevance.contexts && article.relevance.contexts.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  关键词上下文 (摘要)
                </h4>
                <div className="space-y-2">
                  {article.relevance.contexts.map((context, idx) => (
                    <div key={idx} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-sm text-gray-700">
                        ...{highlightKeyword(context)}...
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-gray-100 border border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-700">
                    💡 此文章暂无开放获取全文，仅显示摘要信息
                  </p>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-3 pt-2 flex-wrap">
              {article.doi && (
                <a
                  href={`https://doi.org/${article.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  查看原文 (DOI)
                </a>
              )}
              
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                PubMed
              </a>
              
              {article.pmc_id && (
                <a
                  href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmc_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  PMC 全文
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultItem

