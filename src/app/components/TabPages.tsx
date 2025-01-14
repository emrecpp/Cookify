import type {SVGProps} from "react";
import React from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Cookie, Settings} from "lucide-react";
import CookiesMainPage from "@/app/components/CookiesMainPage.tsx";
import {SettingsPage} from "@/app/components/SettingsPage.tsx";
import {useGlobalContext} from "@/context/global-context.tsx";

const Swagger = (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg"
                                                         preserveAspectRatio="xMidYMid" viewBox="0 0 256 256"
                                                         width="1.5rem" height="1.5rem" {...props}>
    <path d="M128 250a122 122 0 1 1 0-244 122 122 0 0 1 0 244Z" fill="#fff"/>
    <path d="M128 12a116 116 0 1 1 0 232 116 116 0 0 1 0-232m0-12a128 128 0 1 0 0 256 128 128 0 0 0 0-256Z"
          fill="#303030"/>
    <path
        d="m81 87-1 13-1 13c-2 6-5 11-11 15 11 7 12 17 13 28v17c1 5 2 6 7 6h6v14c-14 2-25-2-27-13l-2-13v-14c-1-12-3-17-15-17v-16h3c6-1 9-3 11-9l1-11 1-22c2-10 8-15 19-15h9v14h-4c-8 0-9 3-9 10Zm16 32a9 9 0 0 0-1 18c5 0 10-3 10-8v-1c0-5-4-9-9-9Zm31 0a9 9 0 0 0-9 9c0 6 4 9 9 9 6 0 9-4 9-9s-4-9-9-9Zm31 0a9 9 0 0 0 0 18c5 1 9-4 10-9 0-5-5-9-10-9Zm44 1c-6-1-9-2-10-8l-2-10-1-20c-1-16-12-21-28-19v14h6c4 0 6 1 7 5v11l3 21c1 6 5 11 10 14-9 6-11 14-12 24l-1 19c0 6-2 8-8 8h-5v14h10c10 0 16-5 18-15l1-16 1-15c1-7 4-10 12-11h2v-16h-3Z"
        fill="#303030"/>
</svg>;

export default function TabPages() {
    const {currentView, setCurrentView} = useGlobalContext()


    return (
        <Tabs className="w-full !h-full flex flex-col flex-grow"
              value={currentView}
              defaultValue={currentView}
              onValueChange={(e) => setCurrentView(e)}>
            <TabsContent className="data-[state=active]:flex justify-center items-center flex-grow"
                         value="list-cookies">
                <CookiesMainPage/>
            </TabsContent>
            <TabsContent className="data-[state=active]:flex justify-center items-center flex-grow"
                         value="list-swagger">
                <p className="p-4 text-center text-xs text-muted-foreground">Content for Tab 2</p>
            </TabsContent>
            <TabsContent className="data-[state=active]:block" value="settings">
                <SettingsPage/>
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
                    value="list-swagger"
                    className="relative flex-col rounded-none px-4 py-2 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                >
                    <Swagger className="mb-1.5 opacity-60" size={32} strokeWidth={2} aria-hidden="true"/>
                    Swagger
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

