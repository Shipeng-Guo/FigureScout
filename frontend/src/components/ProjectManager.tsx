import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, RefreshCw, Clock, FileText, CheckCircle } from 'lucide-react'

interface Project {
  project_id: string
  name: string
  keyword: string
  years: number
  description: string
  created_at: string
  updated_at: string
  total_articles: number
  processed_articles: number
  fulltext_articles: number
}

interface ProjectManagerProps {
  onLoadProject: (projectId: string) => void
  currentProjectId?: string
}

const ProjectManager = ({ onLoadProject, currentProjectId }: ProjectManagerProps) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    keyword: '',
    years: 3,
    description: ''
  })

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('加载项目列表失败:', error)
      alert('加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建新项目
  const createProject = async () => {
    if (!newProjectForm.name || !newProjectForm.keyword) {
      alert('项目名称和关键词不能为空')
      return
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjectForm)
      })

      const data = await response.json()

      if (response.ok) {
        alert(`项目创建成功！\nProject ID: ${data.project_id}`)
        setShowNewProjectDialog(false)
        setNewProjectForm({ name: '', keyword: '', years: 3, description: '' })
        loadProjects()
      } else {
        alert(`创建失败: ${data.error}`)
      }
    } catch (error) {
      console.error('创建项目失败:', error)
      alert('创建项目失败')
    }
  }

  // 删除项目
  const deleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`确定要删除项目"${projectName}"吗？\n此操作将删除所有相关文章数据，且不可恢复！`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('项目删除成功')
        loadProjects()
      } else {
        const data = await response.json()
        alert(`删除失败: ${data.error}`)
      }
    } catch (error) {
      console.error('删除项目失败:', error)
      alert('删除项目失败')
    }
  }

  // 格式化日期
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 计算完成百分比
  const getProgress = (project: Project) => {
    if (project.total_articles === 0) return 0
    return Math.round((project.processed_articles / project.total_articles) * 100)
  }

  // 组件加载时获取项目列表
  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">我的项目</h2>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {projects.length} 个项目
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadProjects}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          
          <button
            onClick={() => setShowNewProjectDialog(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>
      </div>

      {/* 项目列表 */}
      {loading && projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">还没有项目</h3>
          <p className="text-gray-500 mb-4">创建第一个项目开始检索文献</p>
          <button
            onClick={() => setShowNewProjectDialog(true)}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.project_id}
              className={`border-2 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer ${
                currentProjectId === project.project_id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
              onClick={() => onLoadProject(project.project_id)}
            >
              {/* 项目头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs">
                      {project.project_id}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="font-medium">{project.keyword}</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteProject(project.project_id, project.name)
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="删除项目"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* 项目描述 */}
              {project.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* 统计信息 */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    文章总数
                  </span>
                  <span className="font-semibold text-gray-900">{project.total_articles}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    已处理
                  </span>
                  <span className="font-semibold text-green-600">
                    {project.processed_articles} / {project.total_articles}
                  </span>
                </div>

                {/* 进度条 */}
                {project.total_articles > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${getProgress(project)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* 时间信息 */}
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-3 border-t">
                <Clock className="w-3 h-3" />
                <span>更新于 {formatDate(project.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建项目对话框 */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">创建新项目</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  项目名称 *
                </label>
                <input
                  type="text"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  placeholder="例如：DepMap数据集研究"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  检索关键词 *
                </label>
                <input
                  type="text"
                  value={newProjectForm.keyword}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, keyword: e.target.value })}
                  placeholder="例如：DepMap"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  时间范围
                </label>
                <select
                  value={newProjectForm.years}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, years: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={1}>近1年</option>
                  <option value={2}>近2年</option>
                  <option value={3}>近3年</option>
                  <option value={5}>近5年</option>
                  <option value={10}>近10年</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  项目描述（可选）
                </label>
                <textarea
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  placeholder="简单描述一下这个项目的目的..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewProjectDialog(false)
                  setNewProjectForm({ name: '', keyword: '', years: 3, description: '' })
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={createProject}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectManager

