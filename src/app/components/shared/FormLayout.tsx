import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft, Edit, Plus } from 'lucide-react';
import React, { ReactNode } from 'react';

interface FormLayoutProps {
    children: ReactNode;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
    isValid: boolean;
    isEditing: boolean;
}

export function FormLayout({ children, onSubmit, onBack, isValid, isEditing }: FormLayoutProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto px-4 py-2">
                <form onSubmit={onSubmit}
                      className="flex flex-col items-center justify-center gap-4 w-full relative">
                    {children}
                    <div className="h-2"></div>
                </form>
            </div>
            
            <div className="bg-background p-3 border-t w-full mt-auto">
                <div className="flex gap-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onBack} 
                        className="w-1/3 select-none"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4"/> Back
                    </Button>
                    <Button 
                        disabled={!isValid} 
                        onClick={onSubmit} 
                        className="w-2/3 select-none"
                    >
                        {isEditing ? <Edit className="h-4 w-4 mr-1"/> : <Plus className="h-4 w-4 mr-1"/>}
                        {isEditing ? 'Update' : 'Add'}
                    </Button>
                </div>
            </div>
        </div>
    )
} 