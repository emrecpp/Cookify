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
import { useGlobalContext } from "@/context/global-context"
import { FolderGit2, Plus, Search, Trash, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from 'react'
import { ProjectNameInput } from "./ProjectNameInput"

export interface FilterableItem {
  project?: string;
  alias: string;
  [key: string]: any;
}

interface ProjectFilterProps<T extends FilterableItem> {
  items: T[];
  onFilteredItemsChange: (filteredItems: T[]) => void;
  storageKey: string;
  longPressTime?: number;
  additionalSearchFields?: (item: T) => string[];
}

export function ProjectFilter<T extends FilterableItem>({ 
  items, 
  onFilteredItemsChange, 
  storageKey,
  longPressTime = 3000,
  additionalSearchFields = () => [] 
}: ProjectFilterProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [projects, setProjects] = useState<string[]>([])
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { addProject, handleDeleteProject, getAllProjects } = useGlobalContext();

  useEffect(() => {
    setProjects(getAllProjects());
  }, [getAllProjects]);

  useEffect(() => {
    const savedProject = localStorage.getItem(storageKey);
    if (savedProject) {
      setActiveProject(savedProject === "Not specified" ? "Not specified" : savedProject);
    }
  }, [storageKey]);

  const filterItems = useCallback(() => {
    let filtered = [...items]
    const isSearching = Boolean(searchTerm) || Boolean(activeProject)

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(item => {
        // Check default fields
        const defaultMatch = 
          item.alias.toLowerCase().includes(searchLower) ||
          (item.project && item.project.toLowerCase().includes(searchLower));
        
        // Check additional fields
        const additionalFields = additionalSearchFields(item);
        const additionalMatch = additionalFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
        
        return defaultMatch || additionalMatch;
      });
    }

    if (activeProject) {
      filtered = filtered.filter(item => 
        activeProject === "Not specified" 
          ? !item.project 
          : item.project === activeProject
      )
    }

    onFilteredItemsChange(filtered)
  }, [items, searchTerm, activeProject, onFilteredItemsChange, additionalSearchFields])

  useEffect(() => {
    filterItems()
  }, [filterItems])

  const handleClearSearch = () => {
    setSearchTerm("")
  }

  const handleProjectSelect = (project: string | null) => {
    if (project === "new") {
      setIsCreatingProject(true)
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }
    
    setActiveProject(project)
    
    if (project === null) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, project);
    }
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      setIsCreatingProject(false)
      return
    }

    addProject(newProjectName);
    
    setActiveProject(newProjectName)
    localStorage.setItem(storageKey, newProjectName);
    setNewProjectName("")
    setIsCreatingProject(false)
  }

  const handleProjectDelete = (projectName: string) => {
    if (activeProject === projectName) {
      setActiveProject(null)
      localStorage.removeItem(storageKey)
    }
    
    handleDeleteProject(projectName);
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
        <ProjectNameInput
          ref={inputRef}
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onCancel={() => {
            setIsCreatingProject(false);
            setNewProjectName("");
          }}
          onSubmit={handleCreateProject}
        />
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
            
            {projects.map(projectName => (
              <DropdownMenuItem 
                key={projectName} 
                className={`${activeProject === projectName ? "bg-muted" : ""} px-2 relative p-0 overflow-hidden`}
              >
                <LongPressButton
                  onLongPress={() => handleProjectDelete(projectName)}
                  className="w-full"
                  progressClassName="bg-red-600"
                  progressPosition="bottom"
                  longPressTime={longPressTime}
                  threshold={250}
                >
                  <div 
                    className="flex items-center justify-between w-full px-2 py-1.5"
                    onClick={() => handleProjectSelect(projectName)}
                  >
                    <div className="flex items-center gap-2">
                      <ProjectAvatar projectName={projectName} size="sm" className="w-5 h-5" />
                      <span>{projectName}</span>
                    </div>
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2 p-1.5 hover:bg-gray-200 active:bg-gray-200/50 transition-colors duration-300 rounded-md"
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