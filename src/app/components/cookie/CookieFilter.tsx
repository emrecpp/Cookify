import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { CookieData } from "@/types/types"
import { FolderGit2, Search, X } from "lucide-react"
import { useCallback, useEffect, useState } from 'react'

interface CookieFilterProps {
  cookies: CookieData[]
  onFilteredCookiesChange: (filteredCookies: CookieData[]) => void
}

const COOKIE_PROJECT_KEY = "cookify_selected_cookie_project";

export function CookieFilter({ cookies, onFilteredCookiesChange }: CookieFilterProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeProject, setActiveProject] = useState<string | null>(() => {
    // Load saved project from localStorage
    const savedProject = localStorage.getItem(COOKIE_PROJECT_KEY);
    return savedProject !== null ? savedProject : null;
  })
  const [projects, setProjects] = useState<string[]>([])

  // Extract existing projects
  useEffect(() => {
    const uniqueProjects = [...new Set(cookies
      .filter(cookie => cookie.project)
      .map(cookie => cookie.project as string))]
    setProjects(uniqueProjects)
  }, [cookies])

  // Filter function
  const filterCookies = useCallback(() => {
    let filtered = [...cookies]

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

  // Select project filter and save to localStorage
  const handleProjectSelect = (project: string | null) => {
    setActiveProject(project)
    
    // Save selected project to localStorage
    if (project === null) {
      localStorage.removeItem(COOKIE_PROJECT_KEY);
    } else {
      localStorage.setItem(COOKIE_PROJECT_KEY, project);
    }
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={activeProject ? "secondary" : "outline"} 
            size="sm" 
            className="h-8 gap-1 w-fit"
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            {activeProject ? activeProject.substring(0, 25) + (activeProject.length > 10 ? '...' : '') : "Project"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
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
            Not specified
          </DropdownMenuItem>
          {projects.map((project) => (
            <DropdownMenuItem 
              key={project} 
              onClick={() => handleProjectSelect(project)}
              className={activeProject === project ? "bg-muted" : ""}
            >
              {project}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 