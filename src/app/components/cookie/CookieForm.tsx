import { FormLayout } from "@/app/components/shared/FormLayout.tsx"
import { InputField } from "@/app/components/shared/InputField.tsx"
import { ProjectSelector } from "@/app/components/shared/ProjectSelector.tsx"
import { useGlobalContext } from "@/context/global-context.tsx"
import { useForm } from "@/hooks/useForm"
import { CookieData } from "@/types/types.ts"
import { Cookie, Globe, GlobeLock, Tag } from 'lucide-react'

export function CookieForm() {
    const {
        editingCookie: initialData, 
        handleCookieSubmit, 
        setCurrentView, 
        setEditingCookie,
        getAllProjects
    } = useGlobalContext()
    
    const emptyFormData: CookieData = {
        alias: "",
        name: "",
        value: "",
        url: "",
        domain: "",
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
    } = useForm<CookieData>({
        initialData,
        emptyData: emptyFormData,
        onSubmit: handleCookieSubmit,
        setCurrentView,
        clearEditing: () => setEditingCookie(null),
        backView: 'list-cookies',
        unrequiredFields: ['url', 'domain', 'project']
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
                required
            />
            
            <InputField
                id="name"
                label="Cookie Name"
                value={formData.name}
                onChange={handleInputChange}
                icon={<Cookie size={16} />}
                required
            />
            
            <InputField
                id="value"
                label="Cookie Value"
                value={formData.value}
                onChange={handleInputChange}
                multiline
                className="font-mono"
                required
            />
            
            <InputField
                id="url"
                label="URL"
                value={formData.url}
                onChange={handleInputChange}
                icon={<Globe size={16} />}
                placeholder="https://example.com"
            />
            
            <InputField
                id="domain"
                label="Domain"
                value={formData.domain}
                onChange={handleInputChange}
                icon={<GlobeLock size={16} />}
                placeholder=".example.com"
            />
            
            <ProjectSelector 
                projects={projects}
                selectedProject={formData.project || ""}
                onProjectChange={(value) => handleFieldChange('project', value)}
            />
        </FormLayout>
    )
}

