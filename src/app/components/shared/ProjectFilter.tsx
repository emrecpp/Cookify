import {LongPressButton} from "@/app/components/shared/LongPressButton"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {ProjectAvatar} from "@/components/ui/project-avatar"
import {useGlobalContext} from "@/context/global-context"
import {AlignCenter, FolderGit2, Plus, Search, Trash, X} from "lucide-react"
import {useEffect, useRef, useState} from 'react'
import {ProjectNameInput} from "./ProjectNameInput"
import {cn} from "@/lib/utils.ts";
import {CookieData, FormType} from "@/types/types.ts";
import toast from "react-hot-toast";

export interface FilterableItem {
    project?: string;
    alias: string;

    [key: string]: any;
}


interface ProjectFilterProps<T extends FilterableItem> {
    items: T[];
    type: FormType;
    storageKey: string;
    longPressTime?: number;

}

const additionalSearchFields = (item: any, type: string) => {
    if (type === "cookie") {
        const cookieItem = item as unknown as CookieData;
        return [
            cookieItem.name,
            cookieItem.domain || ""
        ];
    }
    return [];
};


export const ProjectFilter = ({
                                  items,
                                  type,
                                  storageKey,
                                  longPressTime = 2000,
                              }: ProjectFilterProps<any>) => {

    const [isCreatingProject, setIsCreatingProject] = useState(false)
    const [newProjectName, setNewProjectName] = useState("")

    const inputRef = useRef<HTMLInputElement>(null)

    const {addProject, handleDeleteProject, projects, activeProject, setActiveProject, cookies, swaggers,
        searchTerm, setSearchTerm} = useGlobalContext();





    const filterItems = () => {
        let filtered = [...items]

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            filtered = filtered.filter(item => {
                const defaultMatch =
                    item.alias.toLowerCase().includes(searchLower) ||
                    (item.project && item.project.toLowerCase().includes(searchLower));

                const additionalFields = additionalSearchFields(item, type);
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
        return filtered
    }




    const handleClearSearch = () => setSearchTerm("")


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
        <div className={cn("flex flex-col w-full mb-2",
            isCreatingProject ? "gap-2" : "gap-1")}>
            <div className={cn("flex items-center gap-2 w-full",
                isCreatingProject ? "h-10" : "h-8")}>
                <div className="relative w-full h-full">
                    <Search className={cn("absolute left-2 w-4 text-muted-foreground",
                        isCreatingProject ? "top-2" : "top-1")}/>
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm?.(e.target.value)}
                        className="pl-8 pr-8 h-full select-none"
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-2 py-0 hover:bg-transparent"
                            onClick={handleClearSearch}
                        >
                            <X className="h-3.5 w-3.5"/>
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
                        inputClassName=""
                    />
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={activeProject ? "secondary" : "outline"}
                                size="sm"
                                className="h-8 gap-2 w-fit border"
                            >
                                {activeProject && activeProject !== "Not specified" ? (
                                    <ProjectAvatar projectName={activeProject} size="sm"/>
                                ) : (
                                    <FolderGit2 className="h-3.5 w-3.5"/>
                                )}
                                {activeProject ? activeProject.substring(0, 15) + (activeProject.length > 15 ? '...' : '') : "Project"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="mr-1">
                            <DropdownMenuItem
                                onClick={() => handleProjectSelect("new")}
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100"
                            >
                                <Plus className="h-3.5 w-3.5 font-semibold"/>
                                <span className="font-semibold">Create new project</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                                onClick={() => handleProjectSelect(null)}
                                className={cn("cursor-pointer hover:bg-gray-100/80", activeProject === null ? "bg-muted" : "")}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div
                                        className="w-5 h-5 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                                        <AlignCenter className="h-3 w-3"/>
                                    </div>
                                    <span>Show All</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleProjectSelect("Not specified")}
                                className={cn("cursor-pointer hover:bg-gray-100/80", activeProject === "Not specified" ? "bg-muted" : "")}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div
                                        className="w-5 h-5 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                                        <FolderGit2 className="h-3 w-3"/>
                                    </div>
                                    <span>Not specified</span>
                                </div>
                            </DropdownMenuItem>

                            {projects.map(projectName => (
                                <DropdownMenuItem
                                    key={projectName}
                                    className={`${activeProject === projectName ? "bg-slate-200" : "hover:bg-gray-100/80"} px-2 relative p-0 overflow-hidden`}
                                >
                                        <div
                                            className="flex items-center justify-between w-full px-2 py-1.5 cursor-pointer"
                                            onClick={() => handleProjectSelect(projectName)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <ProjectAvatar projectName={projectName} size="sm" className="w-5 h-5"/>
                                                <span>{projectName}</span>
                                            </div>
                                            <LongPressButton
                                                onLongPress={() => handleProjectDelete(projectName)}
                                                onFailed={() => toast.error('Keep holding to delete project.')}
                                                onClick={(e) => e.stopPropagation()}
                                                className="ml-2 p-1.5 hover:bg-gray-200 active:bg-gray-200/50 transition-colors duration-300 rounded-md"
                                                progressClassName="bg-red-600"
                                                progressPosition="bottom"
                                                longPressTime={longPressTime}
                                                threshold={50}
                                            >
                                                <Trash className="h-3.5 w-3.5 text-red-500"/>
                                            </LongPressButton>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    )
}

export default ProjectFilter; 