import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import {CookieData} from "@/types/types.ts";

interface CookieFormProps {
    onAddCookie: (cookie: CookieData) => void
    onBack: () => void
}

export function CookieForm({ onAddCookie, onBack }: CookieFormProps) {
    const [alias, setAlias] = useState('')
    const [name, setName] = useState('')
    const [value, setValue] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (alias && name && value) {
            onAddCookie({ alias, name, value })
            setAlias('')
            setName('')
            setValue('')
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
                <h2 className="text-2xl font-semibold ml-4">Yeni Kurabiye Ekle</h2>
            </div>
            <Card>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 px-4 py-8">
                        <div>
                            <Label htmlFor="alias">Takma Ad</Label>
                            <Input
                                id="alias"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value)}
                                placeholder="Takma Ad"
                            />
                        </div>
                        <div>
                            <Label htmlFor="name">Cookie Adı</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Cookie Adı"
                            />
                        </div>
                        <div>
                            <Label htmlFor="value">Cookie Değeri</Label>
                            <Input
                                id="value"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="Cookie Değeri"
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            <Plus className="h-4 w-4" /> Ekle
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    )
}

