import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import {CookieData} from "@/types/types.ts";

interface SettingsProps {
    cookies: CookieData[]
    setCookies: React.Dispatch<React.SetStateAction<CookieData[]>>
    onBack: () => void
}

export function Settings({ cookies, setCookies, onBack }: SettingsProps) {
    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cookies))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href", dataStr)
        downloadAnchorNode.setAttribute("download", "kurabiye_export.json")
        document.body.appendChild(downloadAnchorNode)
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
    }

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const content = e.target?.result
                if (typeof content === 'string') {
                    try {
                        const importedCookies = JSON.parse(content)
                        setCookies(importedCookies)
                    } catch (error) {
                        console.error('Invalid JSON file', error)
                    }
                }
            }
            reader.readAsText(file)
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
                <h2 className="text-2xl font-semibold ml-4">Ayarlar</h2>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Veri Yönetimi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleExport} className="w-full">
                        <Download className="h-4 w-4" /> Dışa Aktar
                    </Button>
                    <div>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                            id="import-file"
                        />
                        <Button onClick={() => document.getElementById('import-file')?.click()} className="w-full">
                            <Upload className="h-4 w-4" /> İçe Aktar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

