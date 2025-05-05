import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch.tsx"
import { Textarea } from "@/components/ui/textarea.tsx"
import { useGlobalContext } from "@/context/global-context.tsx"
import { SwaggerData } from "@/types/types.ts"
import { ArrowLeft, Edit, FolderGit2, KeyRound, Plus, Tag } from 'lucide-react'
import React from 'react'

export function SwaggerForm() {
    const {editingSwagger: initialData, handleSwaggerSubmit, swaggers, animationDirection, setCurrentView, setEditingSwagger} = useGlobalContext()
    
    // Create initial data
    const emptyFormData: SwaggerData = {
        alias: "",
        urls: [],
        bearerToken: "",
        autoLogin: "false",
        project: ""
    }
    
    const [formData, setFormData] = React.useState<SwaggerData>(
        initialData ? {...initialData} : emptyFormData
    )
    
    // All projects
    const [projects, setProjects] = React.useState<string[]>([])
    const [newProject, setNewProject] = React.useState<boolean>(false)

    // Extract existing projects
    React.useEffect(() => {
        if (swaggers && swaggers.length > 0) {
            const uniqueProjects = [...new Set(swaggers
                .filter((swagger: SwaggerData) => swagger.project)
                .map((swagger: SwaggerData) => swagger.project as string))] as string[]
            setProjects(uniqueProjects)
        }
    }, [swaggers])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSwaggerSubmit(formData)
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
        setCurrentView('list-swaggers')
        setTimeout(() => {
            setEditingSwagger(null)
        }, 200)
    }
    
    const unrequiredFields = ["project"] // Project field is not required
    const isFormValid = Object.entries(formData)
        .filter(([key]) => !unrequiredFields.includes(key) && key !== "urls") // Do not check urls array
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
                                placeholder="Enter alias"
                                required
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

                    <div className="flex flex-col gap-2 w-full select-none">
                        <Label htmlFor="bearerToken">Bearer Token</Label>
                        <div className="relative">
                            <KeyRound className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"/>
                            <Textarea
                                id="bearerToken"
                                className="pl-8 min-h-[100px] font-mono"
                                value={formData.bearerToken}
                                onChange={(e) => setFormData(prev => ({...prev, bearerToken: e.target.value}))}
                                placeholder="Enter JWT bearer token (Ex: eyJhbGciOi...)"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full select-none">
                        <label className="flex items-center gap-2 cursor-pointer mr-auto text-sm font-semibold">
                            <Switch checked={formData.autoLogin === "true"}
                                    onCheckedChange={(e) => setFormData((prev) => ({
                                        ...prev,
                                        autoLogin: e ? "true" : "false"
                                    }))}/>
                            <span>Auto Login on Page Refresh</span>
                        </label>
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

