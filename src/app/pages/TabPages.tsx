import { CookieForm } from "@/app/components/cookie/CookieForm.tsx";
import { SwaggerForm } from "@/app/components/swagger/SwaggerForm.tsx";
import CookiesMainPage from "@/app/pages/CookiesMainPage.tsx";
import { SettingsPage } from "@/app/pages/SettingsPage.tsx";
import SwaggerMainPage from "@/app/pages/SwaggerMainPage.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import SwaggerSVG from "@/svg/swagger.tsx";
import { Cookie, Settings } from "lucide-react";


export default function TabPages() {
    const {currentView, setCurrentView} = useGlobalContext()

    // Update page state based on TabBar selection
    const handleTabChange = (value: string) => {
        if (["list-cookies", "list-swaggers", "settings"].includes(value)) {
            setCurrentView(value);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto mb-16">
                <Tabs className="w-full h-full flex flex-col"
                      value={currentView}
                      onValueChange={(e) => {
                          setCurrentView(e)
                      }}>
                    <TabsContent className="data-[state=active]:block w-full h-full" value="list-cookies">
                        <CookiesMainPage/>
                    </TabsContent>
                    <TabsContent className="data-[state=active]:block w-full h-full" value="list-swaggers">
                        <SwaggerMainPage/>
                    </TabsContent>
                    <TabsContent className="data-[state=active]:block" value="settings">
                        <SettingsPage/>
                    </TabsContent>
                    <TabsContent className="data-[state=active]:block h-full overflow-auto" value="add-cookie">
                        <CookieForm/>
                    </TabsContent>
                    <TabsContent className="data-[state=active]:block h-full overflow-auto" value="edit-cookie">
                        <CookieForm/>
                    </TabsContent>
                    <TabsContent className="data-[state=active]:block h-full overflow-auto" value="add-swagger">
                        <SwaggerForm/>
                    </TabsContent>
                    <TabsContent className="data-[state=active]:block h-full overflow-auto" value="edit-swagger">
                        <SwaggerForm/>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Fixed bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background pt-3 pb-4 max-w-[700px] mx-auto shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <Tabs value={currentView} onValueChange={handleTabChange}>
                    <TabsList className="w-full rounded-none bg-transparent px-6">
                        <div className="flex justify-between w-full max-w-[300px] mx-auto">
                            <TabsTrigger
                                value="list-cookies"
                                className="relative flex-col rounded-none px-3 py-1.5 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                            >
                                <Cookie className="mb-1 opacity-60" size={20} strokeWidth={2} aria-hidden="true"/>
                                Cookies
                            </TabsTrigger>
                            <TabsTrigger
                                value="list-swaggers"
                                className="relative flex-col rounded-none px-3 py-1.5 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                            >
                                <SwaggerSVG className="mb-1 opacity-60" width={24} height={24} aria-hidden="true"/>
                                Swaggers
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="relative flex-col rounded-none px-3 py-1.5 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                            >
                                <Settings className="mb-1 opacity-60" size={20} strokeWidth={2} aria-hidden="true"/>
                                Settings
                            </TabsTrigger>
                        </div>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
}

