import { TabsTrigger } from "@/components/ui/tabs.tsx";
import React, { ReactNode } from "react";

interface TabItemProps {
    value: string;
    icon: ReactNode;
    label: string;
}

export function TabItem({ value, icon, label }: TabItemProps) {
    return (
        <TabsTrigger
            value={value}
            className="relative flex-col rounded-none px-3 py-1.5 text-xs after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
        >
            {React.cloneElement(icon as React.ReactElement, { className: "mb-1 opacity-60" })}
            {label}
        </TabsTrigger>
    );
} 