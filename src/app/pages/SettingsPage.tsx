import {Button} from "@/components/ui/button.tsx"
import {Download, Github, GithubIcon, Upload} from 'lucide-react'
import {motion} from 'framer-motion'
import BackBtn from "@/app/components/BackBtn.tsx";
import {useGlobalContext} from "@/context/global-context.tsx";
import React from "react";
import {exportToFile} from "@/lib/utils.ts";
import {Card} from "@/components/ui/card.tsx";
import toast from "react-hot-toast";


export function SettingsPage() {
    const {cookies, setCookies, setCurrentView, swaggers, setSwaggers} = useGlobalContext()

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportToFile(cookies, swaggers))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href", dataStr)
        downloadAnchorNode.setAttribute("download", "kurabiye_export.json")
        document.body.appendChild(downloadAnchorNode)
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
    }

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file)
            return false;

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result
            if (typeof content === 'string') {
                try {
                    const importedCookies = JSON.parse(content)
                    setCookies(importedCookies["cookies"])
                    setSwaggers(importedCookies["swaggers"])
                } catch (error) {
                    console.error('Invalid JSON file', error)
                }
            }
        }
        reader.readAsText(file)
        setCurrentView('list-cookies')

    }

    return (
        <motion.div
            initial={{opacity: 0, x: 100}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -100}}
            transition={{duration: 0.3}}
        >
            <div className="relative">
                <BackBtn/>

                <h2 className="text-2xl font-semibold mb-6 text-center">
                    Settings
                </h2>
                <div className="flex flex-col items-center justify-center gap-4 w-full px-4 py-4 select-none relative">

                    <div className="w-full flex gap-4">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            id="import-file"
                            className="hidden"
                        />
                        <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}
                                className="w-full">
                            <Download className="h-4 w-4"/> Import
                        </Button>


                        <Button
                            disabled={cookies.length === 0}
                            onClick={handleExport} className="w-full"
                        >
                            <Upload className="h-4 w-4"/> Export
                        </Button>
                    </div>
                </div>
            </div>
            <Card
                className="flex flex-col items-center justify-center w-min text-nowrap p-8 mx-auto mt-4 min-w-[250px]">
                <img className="rounded-full aspect-square w-16 h-16"
                     src="https://avatars.githubusercontent.com/u/29755479?v=4" width={128} height={128} alt="author"/>
                <p className="text-gray-700 mt-2 select-none">Author</p>
                <strong className="text-base">Emre Demircan</strong>
                <Button className="flex items-center mt-4 hover:bg-primary/80">
                    <a href="https://github.com/emrecpp" target="_blank" className="flex items-center gap-1">
                        <GithubIcon className="flex"/>@emrecpp
                    </a>
                </Button>
            </Card>
        </motion.div>
    )
}

