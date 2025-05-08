import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGlobalContext } from "@/context/global-context";
import { exportToFile } from "@/lib/utils";
import { AnimatePresence, motion } from 'framer-motion';
import { Download, GithubIcon, Upload } from 'lucide-react';
import toast from "react-hot-toast";

export function SettingsPage() {
    const { 
        cookies, 
        swaggers,
        currentView,
        settings, 
        updateSettings,
        setCurrentView,
        handleImport: globalHandleImport
    } = useGlobalContext();

    const handleExport = () => {
        const dataStr = exportToFile(cookies, swaggers, settings);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'cookify-export.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target?.result as string);
                        globalHandleImport(data);
                        setCurrentView('list-cookies');
                        toast.success('Import successful!');
                    } catch (error) {
                        console.error('Error parsing JSON file:', error);
                        toast.error('File import failed!');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleApplyOnClickChange = (checked: boolean) => {
        updateSettings({ applyOnClick: checked });
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.3}}
                className="w-full overflow-hidden"
            >
                <div className="container mx-auto pt-4 pb-8">
                    <h1 className="text-2xl font-bold mb-6">Settings</h1>
                    
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Behavior</CardTitle>
                            <CardDescription>
                                Configure how the application behaves
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="apply-on-click" className="text-base">Apply on click</Label>
                                    <p className="text-sm text-muted-foreground">
                                        When enabled, clicking on a row in the table will automatically apply the cookie or swagger
                                    </p>
                                </div>
                                <Switch 
                                    id="apply-on-click"
                                    checked={settings.applyOnClick}
                                    onCheckedChange={handleApplyOnClickChange}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border mb-6">
                        <CardHeader>
                            <CardTitle>Data Management</CardTitle>
                            <CardDescription>
                                Export or import your cookies and swagger configurations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Button variant="outline" onClick={handleImport} className="w-full">
                                <Upload className="mr-2 h-4 w-4" /> Import
                            </Button>
                            <Button variant="outline" onClick={handleExport} className="w-full">
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
                        </CardContent>
                    </Card>
                    
                    <div className="mt-8 text-center text-sm text-muted-foreground flex flex-col gap-0.5">
                        <p className="font-semibold select-none">Author</p>
                        <p>Emre Demircan</p>
                        <p className="flex items-center justify-center gap-2">

                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                asChild
                            >
                                <a
                                    href="https://github.com/emrecpp"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    <GithubIcon className="h-3.5 w-3.5" /> emrecpp
                                </a>
                            </Button>
                        </p>
                        <p className="text-xs select-none mt-2">v1.1</p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

