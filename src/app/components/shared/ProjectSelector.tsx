import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { ProjectAvatar } from "@/components/ui/project-avatar"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { FolderGit2, Plus } from 'lucide-react'
import React from 'react'

interface ProjectSelectorProps {
    projects: string[]
    selectedProject: string
    onProjectChange: (value: string) => void
}

export function ProjectSelector({ projects, selectedProject, onProjectChange }: ProjectSelectorProps) {
    const [newProject, setNewProject] = React.useState<boolean>(false)

    const handleProjectSelect = (value: string) => {
        if (value === "new") {
            setNewProject(true)
            onProjectChange("")
        } else if (value === "none") {
            onProjectChange("")
        } else {
            onProjectChange(value)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onProjectChange(e.target.value)
    }

    // Render function for selected project display
    const renderSelectedProject = () => {
        if (!selectedProject) {
            return <span className="text-muted-foreground">Select a project or create new</span>
        }
        
        return (
            <div className="flex items-center gap-2">
                <ProjectAvatar projectName={selectedProject} size="sm" />
                <span>{selectedProject}</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2 w-full select-none">
            <Label htmlFor="project">Project (optional)</Label>
            <div className="relative">
                {!selectedProject && !newProject && <FolderGit2 className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>}
                {!newProject && projects.length > 0 ? (
                    <Select value={selectedProject || "none"} onValueChange={handleProjectSelect}>
                        <SelectTrigger className={selectedProject ? "pl-3" : "pl-8"}>
                            {renderSelectedProject()}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new" className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5 text-foreground font-semibold" />
                                    <span className="font-semibold">Create new project</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="none">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                                        <FolderGit2 className="h-3 w-3" />
                                    </div>
                                    <span>None</span>
                                </div>
                            </SelectItem>
                            {projects.map((project) => (
                                <SelectItem key={project} value={project}>
                                    <div className="flex items-center gap-2">
                                        <ProjectAvatar projectName={project} size="sm" />
                                        <span>{project}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="relative">
                        {!selectedProject && <FolderGit2 className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>}
                        {selectedProject && (
                            <div className="absolute top-1.5 left-2.5">
                                <ProjectAvatar projectName={selectedProject} size="sm" />
                            </div>
                        )}
                        <Input
                            id="project"
                            placeholder="Enter project name"
                            className="pl-10"
                            value={selectedProject || ""}
                            onChange={handleInputChange}
                            onBlur={() => {
                                if (!selectedProject) {
                                    setNewProject(false);
                                }
                            }}
                        />
                    </div>
                )}
                {newProject && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-0.5 top-0.5"
                        onClick={() => setNewProject(false)}
                    >
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    )
} 