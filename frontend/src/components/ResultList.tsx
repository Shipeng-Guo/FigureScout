import { useState } from 'react'
import { Article } from '../types'
import ResultItem from './ResultItem'

interface ResultListProps {
  results: Article[]
  keyword: string
}

const ResultList = ({ results, keyword }: ResultListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (pmid: string) => {
    setExpandedId(expandedId === pmid ? null : pmid)
  }

  return (
    <div className="space-y-4">
      {results.map((article, index) => (
        <ResultItem
          key={article.pmid}
          article={article}
          index={index + 1}
          expanded={expandedId === article.pmid}
          onToggle={() => toggleExpand(article.pmid)}
          keyword={keyword}
        />
      ))}
    </div>
  )
}

export default ResultList

