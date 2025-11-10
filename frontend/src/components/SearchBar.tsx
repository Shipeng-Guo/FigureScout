import { useState } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  onSearch: (keyword: string, years: number) => void
  loading: boolean
}

const SearchBar = ({ onSearch, loading }: SearchBarProps) => {
  const [keyword, setKeyword] = useState('')
  const [years, setYears] = useState(3)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      onSearch(keyword.trim(), years)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
            数据集关键词
          </label>
          <div className="relative">
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例如: DepMap, TCGA, GTEx, CCLE..."
              className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              disabled={loading}
            />
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label htmlFor="years" className="block text-sm font-medium text-gray-700 mb-2">
            时间范围: 近 {years} 年
          </label>
          <input
            type="range"
            id="years"
            min="1"
            max="5"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            disabled={loading}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1年</span>
            <span>2年</span>
            <span>3年</span>
            <span>4年</span>
            <span>5年</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Search className="w-5 h-5" />
          <span>{loading ? '搜索中...' : '搜索文献'}</span>
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-1">支持的高质量期刊:</p>
        <p className="text-xs">
          Nature系列、Cancer Discovery、Cancer Research、Cancer Cell、Cell等
        </p>
      </div>
    </div>
  )
}

export default SearchBar

