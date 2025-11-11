import { useState, useEffect, useRef } from 'react'
import SearchBar from './components/SearchBar'
import ResultList from './components/ResultList'
import ProjectManager from './components/ProjectManager'
import { Article } from './types'
import { Search, FolderOpen, Home } from 'lucide-react'

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
  const [currentYears, setCurrentYears] = useState(3)
  const [showRestoreHint, setShowRestoreHint] = useState(false)
  
  // 项目管理状态（必须在使用前声明）
  const [showProjects, setShowProjects] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string>('')
  
  // ⚠️ 改用项目级别的处理状态，而不是全局状态
  const [processingProjectId, setProcessingProjectId] = useState<string | null>(null)
  
  // 🔒 使用 useRef 保存处理中断标志，避免闭包问题
  const processingAbortRef = useRef<{projectId: string | null, shouldAbort: boolean}>({
    projectId: null,
    shouldAbort: false
  })
  
  // 派生状态：当前项目是否正在处理
  const isProcessingMore = processingProjectId === currentProjectId && processingProjectId !== null
  
  // 🐛 调试日志：监控状态变化
  useEffect(() => {
    console.log(`🔍 [状态监控] processingProjectId=${processingProjectId}, currentProjectId=${currentProjectId}, isProcessingMore=${isProcessingMore}`)
  }, [processingProjectId, currentProjectId, isProcessingMore])
  
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
          // 🔧 确保恢复的文章有originalIndex
          const articlesWithIndex = (data.results || []).map((article: Article, index: number) => ({
            ...article,
            originalIndex: article.originalIndex !== undefined ? article.originalIndex : index
          }))
          
          setResults(articlesWithIndex)
          setDisplayResults(articlesWithIndex)
          setKeyword(data.keyword || '')
          setSearched(true)
          setTotalArticles(data.totalArticles || 0)
          setProcessedCount(data.processedCount || 0)
          setCurrentYears(data.years || 3)
          setFulltextCount(data.results?.filter((a: Article) => a.has_fulltext && a.fulltext).length || 0)
          setShowRestoreHint(true)
          setTimeout(() => setShowRestoreHint(false), 5000)
        }
      } catch (e) {
        console.error('恢复搜索失败:', e)
      }
    }
  }, [])

  // 项目管理：自动保存到项目
  const saveToProject = async (projectId: string, articles: Article[]) => {
    console.log(`🔄 开始保存: projectId=${projectId}, 文章数=${articles.length}`)
    
    if (!projectId) {
      console.error('❌ 保存失败: projectId 为空')
      return
    }
    
    if (!articles || articles.length === 0) {
      console.warn('⚠️ 没有文章需要保存')
      return
    }
    
    try {
      const response = await fetch(`/api/projects/${projectId}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ 保存成功: ${data.saved_count} 篇文章已保存到项目 ${projectId}`)
        console.log(`📊 项目统计: 总数=${data.stats?.total_articles}, 已处理=${data.stats?.processed_articles}, 全文=${data.stats?.fulltext_articles}`)
      } else {
        const errorText = await response.text()
        console.error(`❌ 保存失败: HTTP ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('❌ 自动保存异常:', error)
    }
  }

  // 项目管理：加载项目
  const handleLoadProject = async (projectId: string) => {
    // 如果当前项目正在处理文章，提示用户
    if (processingProjectId === currentProjectId && processingProjectId !== null) {
      const confirm = window.confirm('当前正在处理文章，切换项目可能导致处理中断。确定要切换吗？')
      if (!confirm) {
        return
      }
    }
    
    console.log(`📂 开始加载项目: ${projectId}`)
    console.log(`🔄 当前处理中的项目: ${processingProjectId}`)
    
    // ⚠️ 关键：清除处理状态并设置中断标志
    setProcessingProjectId(null)
    if (processingAbortRef.current.projectId) {
      processingAbortRef.current.shouldAbort = true
      console.log(`🛑 设置中断标志: ${processingAbortRef.current.projectId}`)
    }
    setLoadingStatus('')
    
    setLoading(true)
    setLoadingStatus('正在加载项目...')
    
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      
      if (!response.ok) {
        throw new Error('项目加载失败')
      }

      const data = await response.json()
      const project = data.project
      const articles = data.articles

      console.log(`📊 项目数据: 总数=${project.total_articles}, 已处理=${project.processed_articles}, 全文=${project.fulltext_articles}`)

      // ⚠️ 先设置项目ID，再设置其他状态（确保顺序正确）
      console.log(`🔧 [加载项目] 设置项目ID: ${projectId}`)
      setCurrentProjectId(projectId)
      setCurrentProjectName(project.name)
      console.log(`🔧 [加载项目] 项目ID已设置，等待React更新状态...`)
      
      // 🔧 恢复搜索状态（添加原始序号）
      const articlesWithIndex = articles.map((article, index) => ({
        ...article,
        originalIndex: article.originalIndex !== undefined ? article.originalIndex : index
      }))
      
      setKeyword(project.keyword)
      setCurrentYears(project.years)
      setResults(articlesWithIndex)
      setDisplayResults(articlesWithIndex)
      setTotalArticles(project.total_articles)
      setProcessedCount(project.processed_articles)
      setFulltextCount(project.fulltext_articles)
      setSearched(true)
      setShowProjects(false)

      console.log(`✅ 项目加载成功: ${project.name} (ID: ${projectId})`)
      console.log(`📈 状态已设置: processedCount=${project.processed_articles}, totalArticles=${project.total_articles}`)
    } catch (error) {
      console.error('加载项目错误:', error)
      alert('加载项目失败，请重试')
    } finally {
      setLoading(false)
      setLoadingStatus('')
    }
  }

  // 返回主页：清空当前项目，回到初始搜索界面
  const handleReturnHome = () => {
    // 如果当前项目正在处理文章，提示用户
    if (processingProjectId === currentProjectId && processingProjectId !== null) {
      const confirm = window.confirm('当前正在处理文章，返回主页将中断处理。确定要返回吗？')
      if (!confirm) {
        return
      }
    }
    
    console.log('🏠 返回主页，清空当前项目')
    
    // ⚠️ 关键：清除处理状态
    setProcessingProjectId(null)
    setLoading(false)
    setLoadingStatus('')
    
    // 清空项目状态
    setCurrentProjectId(null)
    setCurrentProjectName('')
    
    // 清空搜索结果
    setResults([])
    setDisplayResults([])
    setSearched(false)
    setKeyword('')
    setTotalArticles(0)
    setProcessedCount(0)
    setFulltextCount(0)
    
    // 关闭项目列表
    setShowProjects(false)
  }

  const handleSearch = async (searchKeyword: string, years: number) => {
    console.log('🚀 handleSearch 开始执行 - 每次搜索创建新项目')
    
    // 🔧 修复：每次新搜索都创建新项目（不复用旧项目）
    console.log(`📍 当前项目ID: ${currentProjectId} (将创建新项目)`)
    
    setLoading(true)
    setKeyword(searchKeyword)
    setSearched(true)
    setProgress(0)
    setLoadingStatus('正在检索文献...')
    
    // 🆕 每次搜索都创建新项目
    let activeProjectId: string | null = null
    
    try {
      console.log('🆕 创建新项目...')
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${searchKeyword} 检索`,
          keyword: searchKeyword,
          years: years,
          description: `自动创建于 ${new Date().toLocaleString('zh-CN')}`
        })
      })

      if (projectResponse.ok) {
        const projectData = await projectResponse.json()
        activeProjectId = projectData.project_id
        setCurrentProjectId(projectData.project_id)
        setCurrentProjectName(`${searchKeyword} 检索`)
        console.log(`✅ 自动创建项目成功: ${projectData.project_id}`)
        console.log(`📍 新项目ID: ${activeProjectId}`)
      } else {
        console.error(`❌ 创建项目失败: HTTP ${projectResponse.status}`)
        alert('创建项目失败，搜索结果将不会被保存')
      }
    } catch (error) {
      console.error('❌ 创建项目异常:', error)
      alert('创建项目异常，搜索结果将不会被保存')
    }
    
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
      console.log(`📚 收到文章数据: ${articles.length} 篇`)
      
      // 🔧 关键：给每篇文章添加原始序号（从0开始）
      const articlesWithIndex = articles.map((article, index) => ({
        ...article,
        originalIndex: index  // 原始序号，用于追踪顺序
      }))
      
      // 🔍 调试：检查已处理状态
      const processedInResponse = articlesWithIndex.filter(a => a.fulltext_processed).length
      console.log(`🔍 [调试] 后端返回的已处理文章数: ${processedInResponse}`)
      console.log(`🔍 [调试] 前3篇文章状态:`, articlesWithIndex.slice(0, 3).map(a => ({
        index: a.originalIndex,
        pmid: a.pmid,
        fulltext_processed: a.fulltext_processed,
        has_fulltext: a.has_fulltext
      })))
      
      setResults(articlesWithIndex)
      setDisplayResults(articlesWithIndex)
      setFulltextCount(data.fulltext_available || 0)
      
      // 🔧 修复：精确统计已处理数量（基于PMID）
      const actualProcessedCount = articlesWithIndex.filter(a => a.fulltext_processed).length
      console.log(`🔍 [统计] 后端返回processed=${processed}, 实际统计=${actualProcessedCount}`)
      
      // 更新渐进式加载状态
      setTotalArticles(total)
      setProcessedCount(actualProcessedCount)  // ✅ 使用实际统计值
      setCurrentYears(years)
      
      // 自动保存到项目（使用局部变量 activeProjectId）
      console.log(`🔍 准备保存: activeProjectId=${activeProjectId}, articles.length=${articles.length}`)
      if (activeProjectId && articles.length > 0) {
        console.log(`💾 【关键】开始保存 ${articles.length} 篇文章到项目 ${activeProjectId}`)
        await saveToProject(activeProjectId, articles)
        console.log(`✅ 【关键】saveToProject 调用完成`)
      } else {
        console.warn(`⚠️ 【警告】无法保存文章: activeProjectId=${activeProjectId}, articles.length=${articles.length}`)
      }
      
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
    console.log(`🎯 [handleProcessAll 被调用]`)
    console.log(`   - currentProjectId: ${currentProjectId}`)
    console.log(`   - processingProjectId: ${processingProjectId}`)
    console.log(`   - isProcessingMore: ${isProcessingMore}`)
    console.log(`   - processedCount: ${processedCount}, totalArticles: ${totalArticles}`)
    
    // 🔍 调试：检查当前 results 中的已处理状态
    const currentProcessedInResults = results.filter(a => a.fulltext_processed).length
    console.log(`🔍 [调试] results 中的已处理文章数: ${currentProcessedInResults}`)
    console.log(`🔍 [调试] processedCount 状态值: ${processedCount}`)
    console.log(`🔍 [调试] results 前3篇状态:`, results.slice(0, 3).map(a => ({
      pmid: a.pmid,
      fulltext_processed: a.fulltext_processed
    })))
    
    if (processedCount >= totalArticles) {
      alert('所有文章已处理完成')
      return
    }

    // 🔒 捕获当前项目ID，避免处理过程中切换项目导致数据混乱
    const activeProjectId = currentProjectId
    console.log(`🔄 [开始处理] 项目ID: ${activeProjectId}`)
    
    if (!activeProjectId) {
      console.error('❌ 没有活动项目，无法保存处理结果')
      alert('请先创建或加载一个项目')
      return
    }

    // ⚠️ 关键：设置当前正在处理的项目ID
    setProcessingProjectId(activeProjectId)
    
    // 🔒 设置处理标志
    processingAbortRef.current = {
      projectId: activeProjectId,
      shouldAbort: false
    }
    
    let currentProcessed = processedCount
    
    // 保存处理状态到localStorage
    localStorage.setItem('processing_keyword', keyword)
    localStorage.setItem('processing_years', String(currentYears))
    
    console.log(`🚀 [处理开始] activeProjectId=${activeProjectId}, 未处理文章数=${results.filter(a => !a.fulltext_processed).length}`)
    console.log(`🔍 [Ref状态] processingAbortRef.current=`, processingAbortRef.current)
    console.log(`🔍 [Results] results.length=${results.length}, 前3篇:`, results.slice(0, 3).map(a => ({pmid: a.pmid, fulltext_processed: a.fulltext_processed})))
    
        try {
          // 批量处理，每10篇更新一次
          const batchSize = 10
          
          // 🔧 使用本地变量跟踪最新的结果集
          let latestResults = [...results]
          
          // 🔧 关键：筛选未处理的文章，并按原始序号排序
          const unprocessedArticles = latestResults
            .filter(a => !a.fulltext_processed)
            .sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0))  // 按序号排序
          
          console.log(`📊 [处理循环] 准备处理 ${unprocessedArticles.length} 篇文章`)
          console.log(`📊 [未处理文章] 序号范围: ${unprocessedArticles[0]?.originalIndex} - ${unprocessedArticles[unprocessedArticles.length-1]?.originalIndex}`)
          console.log(`📊 [未处理文章] 前3篇:`, unprocessedArticles.slice(0, 3).map(a => ({
            index: a.originalIndex,
            pmid: a.pmid,
            title: a.title?.substring(0, 50)
          })))
          console.log(`📊 [循环前检查] shouldAbort=${processingAbortRef.current.shouldAbort}, refProjectId=${processingAbortRef.current.projectId}, activeProjectId=${activeProjectId}`)
          
          if (unprocessedArticles.length === 0) {
            console.warn(`⚠️ 没有未处理的文章，跳过处理`)
          }
          
          for (let i = 0; i < unprocessedArticles.length; i += batchSize) {
            // 🔒 关键：检查中断标志
            const shouldAbort = processingAbortRef.current.shouldAbort
            const projectIdMatch = processingAbortRef.current.projectId === activeProjectId
            
            console.log(`🔍 [循环检查 批次${Math.floor(i/batchSize) + 1}] shouldAbort=${shouldAbort}, projectIdMatch=${projectIdMatch}`)
            
            if (shouldAbort || !projectIdMatch) {
              console.warn(`⚠️ 检测到处理中断，停止处理 (shouldAbort=${shouldAbort}, refProjectId=${processingAbortRef.current.projectId}, activeProjectId=${activeProjectId})`)
              break
            }
            
            const batchArticles = unprocessedArticles.slice(i, i + batchSize)
            const currentBatch = batchArticles.length
            
            console.log(`🔄 [批次 ${Math.floor(i/batchSize) + 1}] 处理 ${currentBatch} 篇`)
            console.log(`📋 [批次详情] 序号+PMID:`, batchArticles.map(a => `[${a.originalIndex}]${a.pmid}`).join(', '))
            
            setLoadingStatus(`🔄 处理中: ${currentProcessed}/${totalArticles} (${Math.round((currentProcessed/totalArticles)*100)}%)`)
            
            const response = await fetch('/api/continue-fulltext', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                articles: batchArticles,  // 直接传递文章列表
                keyword: keyword
              })
            })
        
        if (!response.ok) {
          console.error(`第 ${i+1} 篇处理失败`)
          continue
        }
        
            const data = await response.json()
            const processedArticles = data.results || []
            
            if (processedArticles.length > 0) {
              console.log(`🔍 [批处理更新] processedArticles数量=${processedArticles.length}`)
              console.log(`🔍 [返回结果] 序号+PMID:`, processedArticles.map(a => `[${a.originalIndex || '?'}]${a.pmid}`).join(', '))
              
              // 🔧 关键修复：使用PMID精确匹配，保留originalIndex
              const updatedResultsCache = latestResults.map(article => {
                const updated = processedArticles.find((a: Article) => a.pmid === article.pmid)
                if (updated) {
                  // ✅ 保留原始序号
                  return { ...updated, originalIndex: article.originalIndex }
                }
                return article
              })
              
              // ✅ 验证：检查是否有遗漏
              const updatedPMIDs = processedArticles.map(a => a.pmid)
              const missingInUpdate = batchArticles.filter(a => !updatedPMIDs.includes(a.pmid))
              if (missingInUpdate.length > 0) {
                console.warn(`⚠️ 有 ${missingInUpdate.length} 篇文章未在返回结果中:`, missingInUpdate.map(a => `[${a.originalIndex}]${a.pmid}`))
              }
              
              // ✅ 更新本地结果集引用
              latestResults = updatedResultsCache
              
              console.log(`🔍 [同步更新] updatedResults长度=${updatedResultsCache.length}`)
              console.log(`🔍 [同步更新] 已处理数=${updatedResultsCache.filter(a => a.fulltext_processed).length}`)
              
              // 精确统计已处理的文章数
              const actualProcessed = updatedResultsCache.filter(a => a.fulltext_processed).length
              currentProcessed = actualProcessed
              
              console.log(`🔍 [统计] actualProcessed=${actualProcessed}, currentProcessed=${currentProcessed}`)
              
              // 更新全文数量
              const fulltextCount = updatedResultsCache.filter(a => a.has_fulltext && a.fulltext).length
              
              // ✅ 立即更新所有状态（避免异步问题）
              setResults(updatedResultsCache)
              setDisplayResults(updatedResultsCache)
              setProcessedCount(actualProcessed)
              setFulltextCount(fulltextCount)
              
              // 保存到localStorage
              localStorage.setItem('figureScout_lastSearch', JSON.stringify({
                keyword: keyword,
                years: currentYears,
                results: updatedResultsCache,
                totalArticles: totalArticles,
                processedCount: actualProcessed,
                timestamp: new Date().toISOString()
              }))
              
              // 💾 批量保存到项目
              if (activeProjectId && updatedResultsCache.length > 0) {
                console.log(`💾 保存 ${updatedResultsCache.length} 篇到项目 ${activeProjectId}`)
                await saveToProject(activeProjectId, updatedResultsCache)
              } else {
                console.warn(`⚠️ 无法保存: activeProjectId=${activeProjectId}, length=${updatedResultsCache.length}`)
              }
            }
          }
      
      // 🔍 最终统计
      const finalProcessed = latestResults.filter(a => a.fulltext_processed).length
      const finalFulltext = latestResults.filter(a => a.has_fulltext && a.fulltext).length
      
      console.log(`🎉 [处理完成] 最终统计:`)
      console.log(`   - totalArticles: ${totalArticles}`)
      console.log(`   - finalProcessed: ${finalProcessed}`)
      console.log(`   - finalFulltext: ${finalFulltext}`)
      console.log(`   - currentProcessed: ${currentProcessed}`)
      
      setLoadingStatus(`✅ 完成！已处理 ${finalProcessed}/${totalArticles} 篇，成功获取全文 ${finalFulltext} 篇`)
      
      // 🔍 智能重试：检查失败的文章
      await retryFailedArticles(activeProjectId, latestResults)
      
      setTimeout(() => setLoadingStatus(''), 3000)
      
    } catch (error) {
      console.error('处理错误:', error)
      setLoadingStatus('❌ 处理失败，可刷新页面继续')
      setTimeout(() => setLoadingStatus(''), 5000)
    } finally {
      // ⚠️ 关键：清除处理状态
      if (processingAbortRef.current.projectId === activeProjectId) {
        setProcessingProjectId(null)
        processingAbortRef.current = { projectId: null, shouldAbort: false }
        console.log(`✅ 项目 ${activeProjectId} 处理完成，清除处理状态`)
      }
      setLoading(false)  // ✅ 确保loading状态重置
    }
  }

  // 🔄 智能重试失败的文章
  const retryFailedArticles = async (projectId: string | null, currentResults: Article[]) => {
    // 🔧 找出已处理但失败的文章（按原始序号排序）
    const failedArticles = currentResults
      .filter(a => a.fulltext_processed && !a.fulltext)
      .sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0))
    
    if (failedArticles.length === 0) {
      console.log('✅ 所有文章都已成功处理')
      return
    }
    
    console.log(`\n${'='*60}`)
    console.log(`🔄 发现 ${failedArticles.length} 篇文章处理失败，准备重试`)
    console.log(`${'='*60}`)
    console.log(`📋 失败文章列表（序号+PMID）:`)
    failedArticles.forEach((a, idx) => {
      const reason = !a.pmc_id ? '无PMC ID' : '全文不可用'
      console.log(`   ${idx + 1}. [${a.originalIndex}] ${a.pmid} - ${reason}`)
    })
    console.log(`${'='*60}\n`)
    
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
      
      console.log(`\n${'='*60}`)
      console.log(`✅ 重试完成: 成功 ${successCount} 篇，仍失败 ${stillFailed} 篇`)
      console.log(`${'='*60}`)
      
      // 显示成功和失败的详细信息
      const successArticles = retriedArticles.filter((a: Article) => a.has_fulltext && a.fulltext)
      const stillFailedArticles = retriedArticles.filter((a: Article) => !a.fulltext)
      
      if (successArticles.length > 0) {
        console.log(`✅ 重试成功的文章 (${successArticles.length}篇):`)
        successArticles.forEach((a: Article, idx: number) => {
          console.log(`   ${idx + 1}. [${a.originalIndex}] ${a.pmid}`)
        })
      }
      
      if (stillFailedArticles.length > 0) {
        console.log(`❌ 仍然失败的文章 (${stillFailedArticles.length}篇):`)
        stillFailedArticles.forEach((a: Article, idx: number) => {
          const reason = !a.pmc_id ? '无PMC ID' : '全文不可用'
          console.log(`   ${idx + 1}. [${a.originalIndex}] ${a.pmid} - ${reason}`)
        })
      }
      console.log(`${'='*60}\n`)
      
      // 更新重试成功的文章（保留originalIndex）
      if (retriedArticles.length > 0) {
        // 同步更新结果集
        const updatedResults = currentResults.map(article => {
          const retried = retriedArticles.find((a: Article) => a.pmid === article.pmid)
          if (retried) {
            return { ...retried, originalIndex: article.originalIndex }
          }
          return article
        })
        
        // 更新状态
        setResults(updatedResults)
        setDisplayResults(updatedResults)
        
        // 更新全文数量
        const newFulltextCount = updatedResults.filter(a => a.fulltext).length
        setFulltextCount(newFulltextCount)
        
        // 保存到localStorage
        localStorage.setItem('figureScout_lastSearch', JSON.stringify({
          keyword: keyword,
          years: currentYears,
          results: updatedResults,
          totalArticles: totalArticles,
          processedCount: totalArticles,
          timestamp: new Date().toISOString()
        }))
        
        // 💾 保存到项目
        if (projectId && updatedResults.length > 0) {
          console.log(`💾 重试后保存 ${updatedResults.length} 篇文章到项目 ${projectId}`)
          await saveToProject(projectId, updatedResults)
        }
        
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">FigureScout</h1>
                <p className="text-sm text-gray-600 mt-1">文献数据集使用案例检索工具</p>
              </div>
            </div>
            
            {/* 项目信息和管理按钮 */}
            <div className="flex items-center gap-3">
              {currentProjectId && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">当前项目</div>
                  <div className="font-medium text-gray-900">{currentProjectName}</div>
                  <div className="text-xs text-gray-500 font-mono">{currentProjectId}</div>
                </div>
              )}
              
              {/* 返回主页按钮：当有活动项目或已搜索时显示 */}
              {(currentProjectId || searched) && !showProjects && (
                <button
                  onClick={handleReturnHome}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  title="返回主页，开始新的搜索"
                >
                  <Home className="w-5 h-5" />
                  返回主页
                </button>
              )}
              
              <button
                onClick={() => setShowProjects(!showProjects)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <FolderOpen className="w-5 h-5" />
                {showProjects ? '返回搜索' : '我的项目'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 项目管理界面 */}
        {showProjects && (
          <ProjectManager 
            onLoadProject={handleLoadProject}
            currentProjectId={currentProjectId || undefined}
          />
        )}
        
        {/* 搜索和结果界面 */}
        {!showProjects && (
          <>
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
                      <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <span className="text-lg">✅</span>
                        <span>{fulltextCount} 篇成功获取全文</span>
                      </div>
                    )}
                    {processedCount > fulltextCount && (
                      <div className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <span className="text-lg">⚠️</span>
                        <span>{processedCount - fulltextCount} 篇处理失败</span>
                      </div>
                    )}
                    {/* 显示失败统计 */}
                    {processedCount === totalArticles && totalArticles > 0 && (
                      (() => {
                        const failedCount = results.filter(a => (a.fulltext_processed || a.pmc_available) && !a.fulltext).length
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
                            全文处理进度:
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {processedCount} / {totalArticles}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.round((processedCount / totalArticles) * 100)}%)
                          </span>
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            已尝试处理
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
          </>
        )}
      </main>

      {/* Footer with version */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-700">FigureScout</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs font-semibold">
                v{__APP_VERSION__}
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

