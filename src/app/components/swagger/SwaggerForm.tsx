import { FormLayout } from "@/app/components/shared/FormLayout.tsx"
import { InputField } from "@/app/components/shared/InputField.tsx"
import { ProjectSelector } from "@/app/components/shared/ProjectSelector.tsx"
import { Switch } from "@/components/ui/switch.tsx"
import { useGlobalContext } from "@/context/global-context.tsx"
import { useForm } from "@/hooks/useForm"
import { SwaggerData } from "@/types/types.ts"
import { KeyRound, Tag } from 'lucide-react'

export function SwaggerForm() {
    const {
        editingSwagger: initialData, 
        handleSwaggerSubmit, 
        setCurrentView, 
        setEditingSwagger,
        getAllProjects
    } = useGlobalContext()
    
    const emptyFormData: SwaggerData = {
        alias: "",
        urls: [],
        bearerToken: "",
        autoLogin: "false",
        project: ""
    }
    
    const {
        formData,
        handleSubmit,
        handleInputChange,
        handleFieldChange,
        handleBack,
        isFormValid,
        isEditing
    } = useForm<SwaggerData>({
        initialData,
        emptyData: emptyFormData,
        onSubmit: handleSwaggerSubmit,
        setCurrentView,
        clearEditing: () => setEditingSwagger(null),
        backView: 'list-swaggers',
        unrequiredFields: ['project']
    });
    
    const projects = getAllProjects()

    return (
        <FormLayout 
            onSubmit={handleSubmit}
            onBack={handleBack}
            isValid={isFormValid}
            isEditing={isEditing}
        >
            <InputField
                id="alias"
                label="Alias"
                value={formData.alias}
                onChange={handleInputChange}
                icon={<Tag size={16} />}
                placeholder="Enter alias"
                required
            />

            <ProjectSelector 
                projects={projects}
                selectedProject={formData.project || ""}
                onProjectChange={(value) => handleFieldChange('project', value)}
            />

            <InputField
                id="bearerToken"
                label="Bearer Token"
                value={formData.bearerToken}
                onChange={handleInputChange}
                icon={<KeyRound size={16} />}
                placeholder="Enter JWT bearer token (Ex: eyJhbGciOi...)"
                multiline
                className="font-mono"
                required
            />

            <div className="flex flex-col gap-2 w-full select-none">
                <label className="flex items-center gap-2 cursor-pointer mr-auto text-sm font-semibold">
                    <Switch 
                        checked={formData.autoLogin === "true"}
                        onCheckedChange={(checked) => 
                            handleFieldChange('autoLogin', checked ? "true" : "false")
                        }
                    />
                    <span>Auto Login on Page Refresh</span>
                </label>
            </div>
        </FormLayout>
    )
}

