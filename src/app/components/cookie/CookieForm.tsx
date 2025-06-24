import { FormLayout } from "@/app/components/shared/FormLayout.tsx"
import { InputField } from "@/app/components/shared/InputField.tsx"
import { ProjectSelector } from "@/app/components/shared/ProjectSelector.tsx"
import {PageView, useGlobalContext} from "@/context/global-context.tsx"
import { useZodForm } from "@/hooks/useZodForm"
import { cookieSchema } from "@/lib/schemas"
import { CookieData } from "@/types/types.ts"
import { AnimatePresence, motion } from "framer-motion"
import { Cookie, Globe, GlobeLock, Tag } from 'lucide-react'

export function CookieForm() {
    const {
        editingCookie: initialData,
        handleCookieSubmit,
        setCurrentView,
        setEditingCookie,
        getAllProjects,
        currentView
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
        isEditing,
        errors
    } = useZodForm<CookieData, typeof cookieSchema>({
        initialData,
        emptyData: emptyFormData,
        schema: cookieSchema,
        onSubmit: handleCookieSubmit,
        setCurrentView,
        clearEditing: () => setEditingCookie(null),
        backView: PageView.LIST_COOKIES
    });

    const projects = getAllProjects()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.2}}
                className="w-full h-full"
            >
                <FormLayout
                    onSubmit={handleSubmit}
                    onBack={handleBack}
                    isEditing={isEditing}
                >
                    <ProjectSelector
                        projects={projects}
                        selectedProject={formData.project || ""}
                        onProjectChange={(value) => handleFieldChange('project', value)}
                    />
                    <div className="grid grid-cols-2 w-full gap-4">

                        <InputField
                            id="alias"
                            label="Alias"
                            value={formData.alias}
                            onChange={handleInputChange}
                            icon={<Tag size={16}/>}
                            required
                            error={errors.alias}
                            placeholder="Enter alias"
                        />

                        <InputField
                            id="name"
                            label="Cookie Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            icon={<Cookie size={16}/>}
                            required
                            error={errors.name}
                            placeholder="Enter cookie name"
                        />
                    </div>

                    <InputField
                        id="value"
                        label="Cookie Value"
                        value={formData.value}
                        onChange={handleInputChange}
                        multiline
                        className=""
                        required
                        error={errors.value}
                        placeholder="Enter cookie value"
                    />
                    <div className="grid grid-cols-2 w-full gap-4">
                        <InputField
                            id="url"
                            label="URL"
                            value={formData.url}
                            onChange={handleInputChange}
                            icon={<Globe size={16}/>}
                            placeholder="https://example.com"
                            error={errors.url}
                        />

                        <InputField
                            id="domain"
                            label="Domain"
                            value={formData.domain}
                            onChange={handleInputChange}
                            icon={<GlobeLock size={16}/>}
                            placeholder=".example.com"
                            error={errors.domain}
                        />
                    </div>
                </FormLayout>
            </motion.div>
        </AnimatePresence>
    )
}

