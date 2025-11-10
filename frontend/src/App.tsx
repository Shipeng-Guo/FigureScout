import { useState, useEffect } from 'react'
import SearchBar from './components/SearchBar'
import ResultList from './components/ResultList'
import { Article } from './types'
import { Search } from 'lucide-react'

type SortOption = 'relevance' | 'date' | 'journal'

function App() {
  const [results, setResults] = useState<Article[]>([])
  const [displayResults, setDisplayResults] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searched, setSearched] = useState(false)
  const [fulltextCount, setFulltextCount] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [progress, setProgress] = useState(0)
  
  // 渐进式加载状态
  const [totalArticles, setTotalArticles] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [isProcessingMore, setIsProcessingMore] = useState(false)
  const [currentYears, setCurrentYears] = useState(3)
  const [showRestoreHint, setShowRestoreHint] = useState(false)
  
  // 页面加载时恢复之前的搜索
  useEffect(() => {
    const savedSearch = localStorage.getItem('figureScout_lastSearch')
    if (savedSearch) {
      try {
        const data = JSON.parse(savedSearch)
        const savedTime = new Date(data.timestamp).getTime()
        const now = new Date().getTime()
        // 只恢复24小时内的搜索
        if (now - savedTime < 24 * 60 * 60 * 1000) {
          setResults(data.results || [])
          setDisplayResults(data.results || [])
          setKeyword(data.keyword || '')
          setSearched(true)
          setTotalArticles(data.totalArticles || 0)
          setProcessedCount(data.processedCount || 0)
          setCurrentYears(data.years || 3)
          setFulltextCount(data.results?.filter((a: Article) => (a.has_fulltext || a.fulltext)).length || 0)
          setShowRestoreHint(true)
          setTimeout(() => setShowRestoreHint(false), 5000)
        }
      } catch (e) {
        console.error('恢复搜索失败:', e)
      }
    }
  }, [])

  const handleSearch = async (searchKeyword: string, years: number) => {
    setLoading(true)
    setKeyword(searchKeyword)
    setSearched(true)
    setProgress(0)
    setLoadingStatus('正在检索文献...')
    
    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90))
      }, 500)
      
      setProgress(10)
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: searchKeyword,
          years: years
        })
      })
      
      setProgress(50)
      setLoadingStatus('正在处理结果...')
      
      if (!response.ok) {
        throw new Error('搜索失败')
      }
      
      const data = await response.json()
      clearInterval(progressInterval)
      
      const total = data.total || 0
      const processed = data.processed || 0
      
      // 模拟处理进度，显示 X/总数 格式
      if (total > 0 && processed > 0) {
        const steps = Math.min(processed, 10)
        const progressStep = (90 - 60) / steps
        
        for (let i = 0; i < steps; i++) {
          const currentProcessed = Math.floor((i + 1) * processed / steps)
          setProgress(60 + progressStep * (i + 1))
          setLoadingStatus(`📊 处理中: ${currentProcessed}/${total}`)
          await new Promise(resolve => setTimeout(resolve, 150))
        }
      } else {
        setProgress(90)
        setLoadingStatus('正在整理结果...')
      }
      
      const articles = data.results || []
      setResults(articles)
      setDisplayResults(articles)
      setFulltextCount(data.fulltext_available || 0)
      
      // 更新渐进式加载状态
      setTotalArticles(total)
      setProcessedCount(processed)
      setCurrentYears(years)
      
      // 保存搜索结果到LocalStorage
      localStorage.setItem('figureScout_lastSearch', JSON.stringify({
        keyword: searchKeyword,
        years: years,
        results: articles,
        totalArticles: total,
        processedCount: processed,
        timestamp: new Date().toISOString()
      }))
      
      setProgress(100)
      setLoadingStatus('✨ 完成')
    } catch (error) {
      console.error('搜索错误:', error)
      setLoadingStatus('搜索失败')
      alert('搜索失败，请检查网络连接或稍后重试')
    } finally {
      setTimeout(() => {
        setLoading(false)
        setLoadingStatus('')
        setProgress(0)
      }, 500)
    }
  }
  
  // 排序函数
  const handleSort = (option: SortOption) => {
    setSortBy(option)
    const sorted = [...results]
    
    switch (option) {
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.date || a.year || '0'
          const dateB = b.date || b.year || '0'
          return dateB.localeCompare(dateA) // 降序：最新的在前
        })
        break
      case 'journal':
        sorted.sort((a, b) => {
          const journalA = a.journal || ''
          const journalB = b.journal || ''
          return journalA.localeCompare(journalB)
        })
        break
      case 'relevance':
      default:
        sorted.sort((a, b) => 
          (b.relevance?.score || 0) - (a.relevance?.score || 0)
        )
        break
    }
    
    setDisplayResults(sorted)
  }

  // 处理全部文章的全文（逐篇处理，实时更新）
  const handleProcessAll = async () => {
    if (processedCount >= totalArticles) {
      alert('所有文章已处理完成')
      return
    }

    setIsProcessingMore(true)
    let currentProcessed = processedCount
    
    // 保存处理状态到localStorage
    localStorage.setItem('processing_keyword', keyword)
    localStorage.setItem('processing_years', String(currentYears))
    
        try {
          // 批量处理，每10篇更新一次
          const batchSize = 10
          for (let i = processedCount; i < totalArticles; i += batchSize) {
            const endIdx = Math.min(i + batchSize, totalArticles)
            const currentBatch = endIdx - i
            
            setLoadingStatus(`🔄 处理中: ${currentProcessed}/${totalArticles} (${Math.round((currentProcessed/totalArticles)*100)}%)`)
            
            const response = await fetch('/api/continue-fulltext', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                keyword: keyword,
                years: currentYears,
                start_index: i,
                end_index: endIdx  // 每次处理10篇
              })
            })
        
        if (!response.ok) {
          console.error(`第 ${i+1} 篇处理失败`)
          continue
        }
        
            const data = await response.json()
            const processedArticles = data.results || []
            
            if (processedArticles.length > 0) {
              // 批量更新这批文章的数据
              let updatedResultsCache: Article[] = []
              
              setResults(prevResults => {
                const updatedResults = prevResults.map(article => {
                  const updated = processedArticles.find((a: Article) => a.pmid === article.pmid)
                  return updated || article
                })
                updatedResultsCache = updatedResults
                
                // 立即保存到localStorage（使用最新数据）
                localStorage.setItem('figureScout_lastSearch', JSON.stringify({
                  keyword: keyword,
                  years: currentYears,
                  results: updatedResults,  // ✅ 保存更新后的数据
                  totalArticles: totalArticles,
                  processedCount: currentProcessed + currentBatch,
                  timestamp: new Date().toISOString()
                }))
                
                return updatedResults
              })
              
              setDisplayResults(prevResults => {
                const updatedResults = prevResults.map(article => {
                  const updated = processedArticles.find((a: Article) => a.pmid === article.pmid)
                  return updated || article
                })
                return updatedResults
              })
              
              currentProcessed += currentBatch
              setProcessedCount(currentProcessed)
              
              // 更新全文数量
              setFulltextCount(updatedResultsCache.filter(a => (a.has_fulltext || a.fulltext)).length)
            }
          }
      
      setLoadingStatus(`✅ 完成！共处理 ${totalArticles} 篇文章`)
      
      // 🔍 智能重试：检查失败的文章
      await retryFailedArticles()
      
      setTimeout(() => setLoadingStatus(''), 3000)
      
    } catch (error) {
      console.error('处理错误:', error)
      setLoadingStatus('❌ 处理失败，可刷新页面继续')
      setTimeout(() => setLoadingStatus(''), 5000)
    } finally {
      setIsProcessingMore(false)
      setLoading(false)  // ✅ 确保loading状态重置
    }
  }

  // 🔄 智能重试失败的文章
  const retryFailedArticles = async () => {
    // 找出没有fulltext的文章
    const failedArticles = results.filter(a => !a.fulltext && a.has_fulltext)
    
    if (failedArticles.length === 0) {
      console.log('✅ 所有文章都已成功处理')
      return
    }
    
    console.log(`🔄 发现 ${failedArticles.length} 篇文章处理失败，开始重试...`)
    setLoadingStatus(`🔄 重试失败的文章: 0/${failedArticles.length}`)
    
    try {
      const response = await fetch('/api/retry-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: failedArticles,
          keyword: keyword
        })
      })
      
      if (!response.ok) {
        console.error('重试请求失败')
        return
      }
      
      const data = await response.json()
      const retriedArticles = data.results || []
      const successCount = data.processed || 0
      const stillFailed = data.failed || 0
      
      console.log(`✅ 重试完成: 成功 ${successCount} 篇，仍失败 ${stillFailed} 篇`)
      
      // 更新重试成功的文章
      if (retriedArticles.length > 0) {
        setResults(prevResults => {
          const updatedResults = prevResults.map(article => {
            const retried = retriedArticles.find((a: Article) => a.pmid === article.pmid)
            return retried || article
          })
          
          // 保存到localStorage
          localStorage.setItem('figureScout_lastSearch', JSON.stringify({
            keyword: keyword,
            years: currentYears,
            results: updatedResults,
            totalArticles: totalArticles,
            processedCount: totalArticles,
            timestamp: new Date().toISOString()
          }))
          
          return updatedResults
        })
        
        setDisplayResults(prevResults => {
          return prevResults.map(article => {
            const retried = retriedArticles.find((a: Article) => a.pmid === article.pmid)
            return retried || article
          })
        })
        
        // 更新全文数量
        const newFulltextCount = results.filter(a => a.fulltext).length + successCount
        setFulltextCount(newFulltextCount)
        
        if (stillFailed > 0) {
          setLoadingStatus(`⚠️ 重试完成: 成功 ${successCount} 篇，${stillFailed} 篇无法获取全文`)
          setTimeout(() => setLoadingStatus(''), 5000)
        } else {
          setLoadingStatus(`🎉 完美！所有文章都已成功处理`)
          setTimeout(() => setLoadingStatus(''), 3000)
        }
      }
    } catch (error) {
      console.error('重试失败:', error)
      setLoadingStatus(`⚠️ 部分文章无法获取全文详情`)
      setTimeout(() => setLoadingStatus(''), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-500 p-2 rounded-lg">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FigureScout</h1>
              <p className="text-sm text-gray-600 mt-1">文献数据集使用案例检索工具</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* 恢复提示 */}
        {showRestoreHint && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <div className="flex-shrink-0 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-blue-800 font-medium">✅ 已恢复之前的搜索结果</p>
              <p className="text-blue-600 text-sm mt-1">
                关键词: "{keyword}" | 共 {totalArticles} 篇文献 | 已处理 {processedCount} 篇
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600 text-lg">{loadingStatus}</p>
            {/* 进度条 */}
            <div className="w-96 bg-gray-200 rounded-full h-3 overflow-hidden mt-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">{progress}%</p>
          </div>
        )}

        {!loading && searched && (
          <div>
            {results.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    找到 <span className="text-primary-600">{results.length}</span> 篇相关文献
                    {keyword && <span className="text-gray-600"> - 关键词: "{keyword}"</span>}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    {fulltextCount > 0 && (
                      <div className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                        ✨ {fulltextCount} 篇已处理全文
                      </div>
                    )}
                    {/* 显示失败统计 */}
                    {processedCount === totalArticles && totalArticles > 0 && (
                      (() => {
                        const failedCount = results.filter(a => a.has_fulltext && !a.fulltext).length
                        if (failedCount > 0) {
                          return (
                            <div className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
                              ⚠️ {failedCount} 篇无法获取详情
                            </div>
                          )
                        }
                        return null
                      })()
                    )}
                    {/* 排序选项 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 font-medium">排序：</span>
                      <select
                        value={sortBy}
                        onChange={(e) => handleSort(e.target.value as SortOption)}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="relevance">📊 相关性</option>
                        <option value="date">📅 时间</option>
                        <option value="journal">📖 杂志</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 渐进式加载控件 */}
                {totalArticles > 0 && processedCount < totalArticles && (
                  <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            详细全文处理进度:
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {processedCount} / {totalArticles}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.round((processedCount / totalArticles) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${(processedCount / totalArticles) * 100}%` }}
                          />
                        </div>
                        {loadingStatus && isProcessingMore && (
                          <p className="mt-2 text-sm text-blue-600 font-medium animate-pulse">
                            {loadingStatus}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleProcessAll}
                        disabled={isProcessingMore}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                      >
                        {isProcessingMore ? '处理中...' : `处理全部 (剩余 ${totalArticles - processedCount} 篇)`}
                      </button>
                    </div>
                  </div>
                )}

                <ResultList results={displayResults} keyword={keyword} />
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <div className="text-gray-400 mb-4">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">未找到相关文献</h3>
                <p className="text-gray-500">
                  尝试使用其他关键词或扩大搜索范围
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-20 h-20 mx-auto" />
            </div>
            <h3 className="text-2xl font-medium text-gray-700 mb-3">
              开始您的文献检索
            </h3>
            <p className="text-gray-500 max-w-2xl mx-auto">
              输入数据集名称（如 DepMap、TCGA、GTEx 等），我们将在高质量期刊中
              为您检索该数据集的使用案例、相关图表和方法描述
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-3xl mb-2">📊</div>
                <h4 className="font-semibold text-gray-800 mb-2">数据集追踪</h4>
                <p className="text-sm text-gray-600">
                  查找数据集在高质量文献中的使用情况
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-3xl mb-2">🔬</div>
                <h4 className="font-semibold text-gray-800 mb-2">图表提取</h4>
                <p className="text-sm text-gray-600">
                  自动提取相关图表和图注信息
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-3xl mb-2">📝</div>
                <h4 className="font-semibold text-gray-800 mb-2">方法描述</h4>
                <p className="text-sm text-gray-600">
                  整理数据集使用方法和分析流程
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer with version */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-700">FigureScout</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs font-semibold">
                v1.3.0
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">文献检索与分析工具</span>
            </div>
            <p className="text-center text-gray-500 text-xs">
              支持的期刊包括 Nature 系列、Cancer Discovery、Cancer Research 等
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

