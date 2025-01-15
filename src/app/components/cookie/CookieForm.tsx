import React from 'react'
import {Button} from "@/components/ui/button.tsx"
import {Input} from "@/components/ui/input.tsx"
import {Label} from "@/components/ui/label.tsx"
import {Card, CardContent} from "@/components/ui/card.tsx"
import {Cookie, Edit, FilePen, Globe, GlobeLock, Plus, Tag} from 'lucide-react'
import {motion} from 'framer-motion'
import {CookieData} from "@/types/types.ts"
import BackBtn from "@/app/components/BackBtn.tsx"
import {useGlobalContext} from "@/context/global-context.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";

export function CookieForm() {
    const {editingCookie: initialData, handleCookieSubmit} = useGlobalContext()
    const [formData, setFormData] = React.useState<CookieData>(
        initialData ?? Object.fromEntries(
            Object.keys({} as CookieData).map(key => [key, ''])
        ) as CookieData
    )


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleCookieSubmit(formData)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {id, value} = e.target
        setFormData(prev => ({...prev, [id]: value}))
    }
    const unrequiredFields = ['url', 'domain']
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
                        {initialData ? 'Edit Cookie' : 'Add New Cookie'}
                    </h2>
                    {['alias', 'name', 'url', 'domain', 'value'].map((field) => (
                        <div key={field} className="flex flex-col gap-2 w-full select-none">
                            <Label htmlFor={field} className="flex items-center">
                                {field === 'alias' && <Tag className="h-4 w-4 mr-2"/>}
                                {field === 'name' && <Cookie className="h-4 w-4 mr-2"/>}
                                {field === 'url' && <Globe className="h-4 w-4 mr-2"/>}
                                {field === 'domain' && <GlobeLock className="h-4 w-4 mr-2"/>}
                                {field === 'value' && <FilePen className="h-4 w-4 mr-2"/>}
                                {field === 'alias' ? 'Alias' : field === 'name' ? 'Cookie Name' : field === 'value' ? 'Cookie Value' : field === 'url' ? 'Cookie URL' : 'Cookie Domain'}
                            </Label>
                            {field != "value" ?
                                <Input
                                    id={field}
                                    value={formData[field as keyof CookieData]}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    placeholder={field === 'alias' ? 'Example: Admin Token...' : (field === "name" ? 'Example: auth_token...' : field === 'domain' ? "Leave blank to auto-detect the site's domain." : "Leave blank to auto-detect the site's URL.")}
                                /> :
                                <Textarea
                                    id={field}
                                    value={formData[field as keyof CookieData]}
                                    onChange={(e) => setFormData(prev => ({...prev, [field]: e.target.value}))}
                                    autoComplete="off"
                                    rows={4}
                                    placeholder="Example: secret data"
                                />}
                        </div>
                    ))}
                    <Button disabled={!isFormValid} type="submit" className="w-full select-none">
                        {initialData ? <Edit className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}
                        {initialData ? 'Update' : 'Add'}
                    </Button>
                </form>
            </div>
        </motion.div>
    )
}

