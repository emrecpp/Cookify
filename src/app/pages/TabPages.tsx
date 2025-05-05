import { CookieForm } from "@/app/components/cookie/CookieForm.tsx";
import { TabItem } from "@/app/components/shared/TabItem.tsx";
import { SwaggerForm } from "@/app/components/swagger/SwaggerForm.tsx";
import CookiesMainPage from "@/app/pages/CookiesMainPage.tsx";
import { SettingsPage } from "@/app/pages/SettingsPage.tsx";
import SwaggerMainPage from "@/app/pages/SwaggerMainPage.tsx";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs.tsx";
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

    const renderTabContent = (value: string, component: React.ReactNode) => (
        <TabsContent className="data-[state=active]:block h-full overflow-auto" value={value}>
            {component}
        </TabsContent>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto mb-16">
                <Tabs className="w-full h-full flex flex-col"
                      value={currentView}
                      onValueChange={setCurrentView}>
                    {renderTabContent("list-cookies", <CookiesMainPage />)}
                    {renderTabContent("list-swaggers", <SwaggerMainPage />)}
                    {renderTabContent("settings", <SettingsPage />)}
                    {renderTabContent("add-cookie", <CookieForm />)}
                    {renderTabContent("edit-cookie", <CookieForm />)}
                    {renderTabContent("add-swagger", <SwaggerForm />)}
                    {renderTabContent("edit-swagger", <SwaggerForm />)}
                </Tabs>
            </div>

            {/* Fixed bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background pt-3 pb-4 max-w-[700px] mx-auto shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <Tabs value={currentView} onValueChange={handleTabChange}>
                    <TabsList className="w-full rounded-none bg-transparent px-6">
                        <div className="flex justify-between w-full max-w-[300px] mx-auto">
                            <TabItem 
                                value="list-cookies"
                                icon={<Cookie size={20} strokeWidth={2} />}
                                label="Cookies"
                            />
                            <TabItem 
                                value="list-swaggers"
                                icon={<SwaggerSVG width={24} height={24} />}
                                label="Swaggers"
                            />
                            <TabItem 
                                value="settings"
                                icon={<Settings size={20} strokeWidth={2} />}
                                label="Settings"
                            />
                        </div>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
}

