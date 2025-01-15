import React from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Cookie, Settings} from "lucide-react";
import CookiesMainPage from "@/app/pages/CookiesMainPage.tsx";
import {SettingsPage} from "@/app/pages/SettingsPage.tsx";
import {useGlobalContext} from "@/context/global-context.tsx";
import SwaggerMainPage from "@/app/pages/SwaggerMainPage.tsx";
import SwaggerSVG from "@/svg/swagger.tsx";
import {CookieForm} from "@/app/components/cookie/CookieForm.tsx";
import {SwaggerForm} from "@/app/components/swagger/SwaggerForm.tsx";


export default function TabPages() {
    const {currentView, setCurrentView} = useGlobalContext()


    return (
        <Tabs className="w-full !h-full flex flex-col flex-grow"
              value={currentView}
              onValueChange={(e) => {
                  setCurrentView(e)
              }}>
            <TabsContent className="data-[state=active]:flex justify-center items-center flex-grow w-full" value="list-cookies">
                <CookiesMainPage/>
            </TabsContent>
            <TabsContent className="data-[state=active]:flex justify-center items-center flex-grow" value="list-swaggers">
                <SwaggerMainPage/>
            </TabsContent>
            <TabsContent className="data-[state=active]:block" value="settings">
                <SettingsPage/>
            </TabsContent>
            <TabsContent className="data-[state=active]:block" value="add-cookie">
                <CookieForm/>
            </TabsContent>
            <TabsContent className="data-[state=active]:block" value="edit-cookie">
                <CookieForm/>
            </TabsContent>
            <TabsContent className="data-[state=active]:block" value="add-swagger">
                <SwaggerForm/>
            </TabsContent>
            <TabsContent className="data-[state=active]:block" value="edit-swagger">
                <SwaggerForm/>
            </TabsContent>


            <TabsList
                className="mt-auto bottom-0 w-full h-full rounded-none border-b border-border bg-transparent p-0 pt-8">
                <TabsTrigger
                    value="list-cookies"
                    className="relative flex-col rounded-none px-4 py-2 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                >
                    <Cookie className="mb-1.5 opacity-60" size={24} strokeWidth={2} aria-hidden="true"/>
                    Cookies
                </TabsTrigger>
                <TabsTrigger
                    value="list-swaggers"
                    className="relative flex-col rounded-none px-4 py-2 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                >
                    <SwaggerSVG className="mb-1.5 opacity-60" size={32} strokeWidth={2} aria-hidden="true"/>
                    Swaggers
                </TabsTrigger>
                <TabsTrigger
                    value="settings"
                    className="relative flex-col rounded-none px-4 py-2 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                >
                    <Settings className="mb-1.5 opacity-60" size={24} strokeWidth={2} aria-hidden="true"/>
                    Settings
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

