import { CookieForm } from "@/app/components/cookie/CookieForm.tsx";
import { TabItem } from "@/app/components/shared/TabItem.tsx";
import { SwaggerForm } from "@/app/components/swagger/SwaggerForm.tsx";
import CookiesMainPage from "@/app/pages/CookiesMainPage.tsx";
import { SettingsPage } from "@/app/pages/SettingsPage.tsx";
import SwaggerMainPage from "@/app/pages/SwaggerMainPage.tsx";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs.tsx";
import { useGlobalContext, PageView } from "@/context/global-context.tsx";
import SwaggerSVG from "@/svg/swagger.tsx";
import { Cookie, Settings } from "lucide-react";

export default function TabPages() {
    const {currentView, setCurrentView} = useGlobalContext()

    // for fix the flicker
    if (currentView === null)
        return null


    const handleTabChange = (value: string) => {
        const validViews = [PageView.LIST_COOKIES, PageView.LIST_SWAGGERS, PageView.SETTINGS];
        if (validViews.includes(value as PageView)) {
            setCurrentView(value as PageView);
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
                    {renderTabContent(PageView.LIST_COOKIES, <CookiesMainPage />)}
                    {renderTabContent(PageView.LIST_SWAGGERS, <SwaggerMainPage />)}
                    {renderTabContent(PageView.SETTINGS, <SettingsPage />)}
                    {renderTabContent(PageView.ADD_COOKIE, <CookieForm />)}
                    {renderTabContent(PageView.EDIT_COOKIE, <CookieForm />)}
                    {renderTabContent(PageView.ADD_SWAGGER, <SwaggerForm />)}
                    {renderTabContent(PageView.EDIT_SWAGGER, <SwaggerForm />)}
                </Tabs>
            </div>

            <div className="select-none fixed bottom-0 left-0 right-0 border-t bg-background pt-3 pb-4 max-w-[700px] mx-auto">
                <Tabs value={currentView} onValueChange={handleTabChange}>
                    <TabsList className="w-full rounded-none bg-transparent px-6">
                        <div className="flex justify-between w-full max-w-[300px] mx-auto">
                            <TabItem 
                                value={PageView.LIST_COOKIES}
                                icon={<Cookie size={20} strokeWidth={2} />}
                                label="Cookies"
                            />
                            <TabItem 
                                value={PageView.LIST_SWAGGERS}
                                icon={<SwaggerSVG width={24} height={24} />}
                                label="Swaggers"
                            />
                            <TabItem 
                                value={PageView.SETTINGS}
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

