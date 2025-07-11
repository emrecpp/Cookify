import {FormLayout} from "@/app/components/shared/FormLayout.tsx"
import {InputField} from "@/app/components/shared/InputField.tsx"
import {ProjectSelector} from "@/app/components/shared/ProjectSelector.tsx"
import {PageView, useGlobalContext} from "@/context/global-context.tsx"
import {useZodForm} from "@/hooks/useZodForm"
import {swaggerSchema} from "@/lib/schemas"
import {SwaggerData} from "@/types/types.ts"
import {AnimatePresence, motion} from "framer-motion"
import {KeyRound, Tag} from 'lucide-react'

export function SwaggerForm() {
    const {
        editingSwagger: initialData,
        handleSwaggerSubmit,
        setCurrentView,
        setEditingSwagger,
        getAllProjects,
        currentView
    } = useGlobalContext()

    const emptyFormData: SwaggerData = {
        alias: "",
        bearerToken: "",
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
    } = useZodForm<SwaggerData, typeof swaggerSchema>({
        initialData,
        emptyData: emptyFormData,
        schema: swaggerSchema,
        onSubmit: handleSwaggerSubmit,
        setCurrentView,
        clearEditing: () => setEditingSwagger(null),
        backView: PageView.LIST_SWAGGERS
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

                    <InputField
                        id="alias"
                        label="Alias"
                        value={formData.alias}
                        onChange={handleInputChange}
                        icon={<Tag size={16}/>}
                        placeholder="Enter alias"
                        required
                        error={errors.alias}
                    />

                    <InputField
                        id="bearerToken"
                        label="Bearer Token"
                        value={formData.bearerToken}
                        onChange={handleInputChange}
                        icon={<KeyRound size={16}/>}
                        placeholder="Enter JWT bearer token (Ex: eyJhbGciOi...)"
                        multiline
                        className={"min-h-44"}
                        required
                        error={errors.bearerToken}
                    />
                </FormLayout>
            </motion.div>
        </AnimatePresence>
    )
}

