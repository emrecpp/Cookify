import { LongPressButton } from "@/app/components/shared/LongPressButton"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ProjectAvatar } from "@/components/ui/project-avatar"
import { CookieData } from "@/types/types"
import { FolderGit2, Plus, Search, Trash, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface CookieFilterProps {
  cookies: CookieData[]
  onFilteredCookiesChange: (filteredCookies: CookieData[]) => void
}

const COOKIE_PROJECT_KEY = "cookify_selected_cookie_project";

export function CookieFilter({ cookies, onFilteredCookiesChange }: CookieFilterProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [projects, setProjects] = useState<string[]>([])
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Extract existing projects
  useEffect(() => {
    const uniqueProjects = [...new Set(cookies
      .filter(cookie => cookie.project)
      .map(cookie => cookie.project as string))]
    setProjects(uniqueProjects)
  }, [cookies])

  // Init active project from localStorage
  useEffect(() => {
    const savedProject = localStorage.getItem(COOKIE_PROJECT_KEY);
    if (savedProject) {
      setActiveProject(savedProject === "Not specified" ? "Not specified" : savedProject);
    }
  }, []);

  // Filter function
  const filterCookies = useCallback(() => {
    let filtered = [...cookies]
    const isSearching = Boolean(searchTerm) || Boolean(activeProject)

    // Check search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(cookie => 
        cookie.alias.toLowerCase().includes(searchLower) ||
        cookie.name.toLowerCase().includes(searchLower) ||
        (cookie.project && cookie.project.toLowerCase().includes(searchLower)) ||
        (cookie.domain && cookie.domain.toLowerCase().includes(searchLower))
      )
    }

    // Project filtering
    if (activeProject) {
      filtered = filtered.filter(cookie => 
        activeProject === "Not specified" 
          ? !cookie.project 
          : cookie.project === activeProject
      )
    }

    onFilteredCookiesChange(filtered)
  }, [cookies, searchTerm, activeProject, onFilteredCookiesChange])

  // Run filter when it changes
  useEffect(() => {
    filterCookies()
  }, [filterCookies])

  // Clear search term
  const handleClearSearch = () => {
    setSearchTerm("")
  }

  // Handle project selection
  const handleProjectSelect = (project: string | null) => {
    if (project === "new") {
      setIsCreatingProject(true)
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }
    
    setActiveProject(project)
    
    // Save selected project to localStorage
    if (project === null) {
      localStorage.removeItem(COOKIE_PROJECT_KEY);
    } else {
      localStorage.setItem(COOKIE_PROJECT_KEY, project);
    }
  }

  // Create new project
  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      setIsCreatingProject(false)
      return
    }

    // Yeni bir proje ise listeye ekle
    if (!projects.includes(newProjectName)) {
      setProjects(prev => [...prev, newProjectName])
    }
    
    setActiveProject(newProjectName)
    localStorage.setItem(COOKIE_PROJECT_KEY, newProjectName);
    setNewProjectName("")
    setIsCreatingProject(false)
  }

  // Handle delete project
  const handleDeleteProject = (projectName: string) => {
    // Projeyi listeden kaldır
    setProjects(prev => prev.filter(p => p !== projectName))
    
    // Eğer aktif proje siliniyorsa, filtreyi temizle
    if (activeProject === projectName) {
      setActiveProject(null)
      localStorage.removeItem(COOKIE_PROJECT_KEY)
    }
    
    toast.success(`"${projectName}" projesi silindi`)
  }

  return (
    <div className="flex items-center gap-2 w-full mb-2">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 pr-8 h-8"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-2 py-0 hover:bg-transparent"
            onClick={handleClearSearch}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isCreatingProject ? (
        <div className="relative w-[200px]">
          <Input 
            ref={inputRef}
            size={1}
            placeholder="Enter project name" 
            value={newProjectName} 
            onChange={(e) => setNewProjectName(e.target.value)}
            className="h-8 pl-2 pr-16"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateProject()
              } else if (e.key === "Escape") {
                setIsCreatingProject(false)
                setNewProjectName("")
              }
            }}
          />
          <div className="absolute right-0 top-0 h-full flex">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-full px-1.5"
              onClick={() => {
                setIsCreatingProject(false)
                setNewProjectName("")
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-full px-1.5"
              onClick={handleCreateProject}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={activeProject ? "secondary" : "outline"} 
              size="sm" 
              className="h-8 gap-1 w-fit"
            >
              {activeProject && activeProject !== "Not specified" ? (
                <ProjectAvatar projectName={activeProject} size="sm" className="w-5 h-5" />
              ) : (
                <FolderGit2 className="h-3.5 w-3.5" />
              )}
              {activeProject ? activeProject.substring(0, 15) + (activeProject.length > 15 ? '...' : '') : "Project"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuItem 
              onClick={() => handleProjectSelect("new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5 text-foreground font-semibold" />
              <span className="font-semibold">Create new project</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleProjectSelect(null)}
              className={activeProject === null ? "bg-muted" : ""}
            >
              Show All
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleProjectSelect("Not specified")}
              className={activeProject === "Not specified" ? "bg-muted" : ""}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="w-5 h-5 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                  <FolderGit2 className="h-3 w-3" />
                </div>
                <span>Not specified</span>
              </div>
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem 
                key={project} 
                className={`${activeProject === project ? "bg-muted" : ""} px-2 relative p-0 overflow-hidden`}
              >
                <LongPressButton
                  onLongPress={() => handleDeleteProject(project)}
                  className="w-full"
                  progressClassName="bg-red-600"
                  progressPosition="bottom"
                >
                  <div 
                    className="flex items-center justify-between w-full px-2 py-1.5"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="flex items-center gap-2">
                      <ProjectAvatar projectName={project} size="sm" className="w-5 h-5" />
                      <span>{project}</span>
                    </div>
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2"
                    >
                      <Trash className="h-3.5 w-3.5 text-red-500" />
                    </div>
                  </div>
                </LongPressButton>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
} 