import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea.tsx"
import { useGlobalContext } from "@/context/global-context.tsx"
import { CookieData } from "@/types/types.ts"
import { ArrowLeft, Cookie, Edit, FolderGit2, Globe, GlobeLock, Plus, Tag } from 'lucide-react'
import React from 'react'

export function CookieForm() {
    const {editingCookie: initialData, handleCookieSubmit, cookies, animationDirection, currentView, setCurrentView, setEditingCookie} = useGlobalContext()
    
    // Create initial data
    const emptyFormData: CookieData = {
        alias: "",
        name: "",
        value: "",
        url: "",
        domain: "",
        project: ""
    }
    
    const [formData, setFormData] = React.useState<CookieData>(
        initialData ? {...initialData} : emptyFormData
    )

    // All projects
    const [projects, setProjects] = React.useState<string[]>([])
    const [newProject, setNewProject] = React.useState<boolean>(false)

    // Extract existing projects
    React.useEffect(() => {
        if (cookies && cookies.length > 0) {
            const uniqueProjects = [...new Set(cookies
                .filter((cookie: CookieData) => cookie.project)
                .map((cookie: CookieData) => cookie.project as string))] as string[]
            setProjects(uniqueProjects)
        }
    }, [cookies])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleCookieSubmit(formData)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {id, value} = e.target
        setFormData(prev => ({...prev, [id]: value}))
    }

    const handleProjectSelect = (value: string) => {
        if (value === "new") {
            setNewProject(true)
            setFormData(prev => ({...prev, project: ""}))
        } else if (value === "none") {
            setFormData(prev => ({...prev, project: ""}))
        } else {
            setFormData(prev => ({...prev, project: value}))
        }
    }
    
    const handleBack = () => {
        setCurrentView('list-cookies')
        setTimeout(() => {
            setEditingCookie(null)
        }, 200)
    }

    const unrequiredFields = ['url', 'domain', 'project']
    const isFormValid = Object.entries(formData)
        .filter(([key]) => !unrequiredFields.includes(key))
        .every(([_, value]) => Boolean(value))

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 pl-4 border-b">
                <Button type="button" variant="ghost" onClick={handleBack} className="flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back
                </Button>
            </div>

            <div className="flex-1 overflow-auto px-4 py-2">
                <form onSubmit={handleSubmit}
                      className="flex flex-col items-center justify-center gap-4 w-full relative">
                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="alias">Alias</Label>
                        <div className="relative">
                            <Tag className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>
                            <Input
                                id="alias"
                                className="pl-8"
                                value={formData.alias}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="name">Cookie Name</Label>
                        <div className="relative">
                            <Cookie className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>
                            <Input
                                id="name"
                                className="pl-8"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="value">Cookie Value</Label>
                        <Textarea
                            id="value"
                            value={formData.value}
                            onChange={(e) => setFormData(prev => ({...prev, value: e.target.value}))}
                            className="min-h-[100px] font-mono"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="url">URL (optional)</Label>
                        <div className="relative">
                            <Globe className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>
                            <Input
                                id="url"
                                placeholder="https://example.com"
                                className="pl-8"
                                value={formData.url}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="domain">Domain (optional)</Label>
                        <div className="relative">
                            <GlobeLock className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>
                            <Input
                                id="domain"
                                placeholder=".example.com"
                                className="pl-8"
                                value={formData.domain}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="project">Project (optional)</Label>
                        <div className="relative">
                            <FolderGit2 className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>
                            {!newProject && projects.length > 0 ? (
                                <Select value={formData.project || "none"} onValueChange={handleProjectSelect}>
                                    <SelectTrigger className="pl-8">
                                        <SelectValue placeholder="Select a project or create new" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {projects.map((project) => (
                                            <SelectItem key={project} value={project}>{project}</SelectItem>
                                        ))}
                                        <SelectItem value="new">+ Create new project</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="project"
                                    placeholder="Enter project name"
                                    className="pl-8"
                                    value={formData.project || ""}
                                    onChange={handleChange}
                                    onBlur={() => {
                                        if (!formData.project) {
                                            setNewProject(false);
                                        }
                                    }}
                                />
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
                    
                    <div className="h-2"></div> {/* Bu div, alt kısımda az bir boşluk bırakır */}
                </form>
            </div>
            
            <div className="bg-background p-3 border-t w-full mt-auto">
                <Button 
                    disabled={!isFormValid} 
                    onClick={handleSubmit} 
                    className="w-full select-none"
                >
                    {initialData ? <Edit className="h-4 w-4 mr-1"/> : <Plus className="h-4 w-4 mr-1"/>}
                    {initialData ? 'Update' : 'Add'}
                </Button>
            </div>
        </div>
    )
}

