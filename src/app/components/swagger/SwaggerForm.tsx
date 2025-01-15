import React from 'react'
import {Button} from "@/components/ui/button.tsx"
import {Input} from "@/components/ui/input.tsx"
import {Label} from "@/components/ui/label.tsx"
import {Edit, FilePen, KeyRound, Plus, Tag} from 'lucide-react'
import {motion} from 'framer-motion'
import BackBtn from "@/app/components/BackBtn.tsx"
import {useGlobalContext} from "@/context/global-context.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {SwaggerData} from "@/types/types.ts";
import {Switch} from "@/components/ui/switch.tsx";

export function SwaggerForm() {
    const {editingSwagger: initialData, handleSwaggerSubmit} = useGlobalContext()
    const [formData, setFormData] = React.useState<SwaggerData>(
        initialData ?? Object.fromEntries(
            Object.keys({} as SwaggerData).map(key => [key, ''])
        ) as SwaggerData
    )


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSwaggerSubmit(formData)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {id, value} = e.target
        setFormData(prev => ({...prev, [id]: value}))
    }
    const unrequiredFields = []
    const isFormValid = Object.entries(formData)
        .filter(([key]) => !unrequiredFields.includes(key))
        .every(([_, value]) => Boolean(value))

    return (
        <motion.div
            initial={{opacity: 0, x: 100}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -100}}
            transition={{duration: 0.3}}
        >
            <div className="relative">
                <form onSubmit={handleSubmit}
                      className="flex flex-col items-center justify-center gap-4 w-full px-4 relative">
                    <BackBtn/>

                    <h2 className="text-2xl font-semibold mb-6 select-none">
                        {initialData ? 'Edit Swagger' : 'Add New Swagger'}
                    </h2>
                    {['alias', 'bearerToken', 'autologin'].map((field) => (
                        <div key={field} className="flex flex-col gap-2 w-full select-none">
                            <Label htmlFor={field} className="flex items-center">
                                {field === 'alias' && <Tag className="h-4 w-4 mr-2"/>}
                                {field === 'bearerToken' && <KeyRound className="h-4 w-4 mr-2"/>}
                                {field === 'alias' ? 'Alias' : field === 'bearerToken' ? 'Bearer Token' : ''}
                            </Label>
                            {field === "alias" && <Input
                                id={field}
                                value={formData[field as keyof SwaggerData]}
                                onChange={handleChange}
                                autoComplete="off"
                                placeholder={field === 'alias' ? 'Example: Admin Token...' : (field === "name" ? 'Example: auth_token...' : field === 'domain' ? "Leave blank to auto-detect the site's domain." : "Leave blank to auto-detect the site's URL.")}
                            />
                            }
                            {field === "bearerToken" && <Textarea
                                id={field}
                                value={formData[field as keyof SwaggerData]}
                                onChange={(e) => setFormData(prev => ({...prev, [field]: e.target.value}))}
                                autoComplete="off"
                                rows={5}
                                placeholder="Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                            />}
                            {field === "autologin" && (
                                <label className="flex items-center gap-2 cursor-pointer mr-auto text-sm font-semibold">
                                    <Switch checked={formData.autoLogin === "true"}
                                            onCheckedChange={(e) => setFormData((prev) => ({
                                                ...prev,
                                                autoLogin: e ? "true" : "false"
                                            }))}/>
                                    <span>Auto Login on Refresh</span>
                                </label>
                            )}

                        </div>
                    ))}
                    <Button onClick={handleSubmit} disabled={!isFormValid} type="submit" className="w-full select-none">
                        {initialData ? <Edit className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}
                        {initialData ? 'Update' : 'Add'}
                    </Button>
                </form>
            </div>
        </motion.div>
    )
}

