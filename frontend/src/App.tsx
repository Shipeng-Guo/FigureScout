import { useState } from 'react'
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
      
      setProgress(90)
      setLoadingStatus('正在解析全文...')
      
      const articles = data.results || []
      setResults(articles)
      setDisplayResults(articles)
      setFulltextCount(data.fulltext_available || 0)
      
      setProgress(100)
      setLoadingStatus('完成')
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
                        ✨ {fulltextCount} 篇可查看全文
                      </div>
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 text-sm">
            FigureScout © 2025 - 支持的期刊包括 Nature 系列、Cancer Discovery、Cancer Research 等
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

