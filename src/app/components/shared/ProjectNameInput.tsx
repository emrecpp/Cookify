import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { FolderGit2, Plus, X } from 'lucide-react';
import React, { forwardRef } from 'react';

interface ProjectNameInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCancel: () => void;
    onSubmit: () => void;
    className?: string;
    inputClassName?: string;
}

export const ProjectNameInput = forwardRef<HTMLInputElement, ProjectNameInputProps>(({
                                                                                         value,
                                                                                         onChange,
                                                                                         onCancel,
                                                                                         onSubmit,
                                                                                         className = "relative w-[200px]",
                                                                                         inputClassName = "h-8 pl-2 pr-16"
                                                                                     }, ref) => {
    const handleSubmit = () => {
        if (value.trim()) {
            onSubmit();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSubmit();
        } else if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <div className={className}>
            {value ? (
                <div className="absolute top-2 left-2.5 z-10">
                    <ProjectAvatar projectName={value} size="sm"/>
                </div>
            ) : (
                <FolderGit2 className="absolute top-3 left-2.5 h-4 w-4 text-muted-foreground"/>
            )}
            <Input
                ref={ref}
                size={1}
                placeholder="Proje adı girin"
                value={value}
                onChange={onChange}
                className={`!h-10 pb-1.5 ${inputClassName} ${value ? "pl-10" : "pl-10"}`}
                onKeyDown={handleKeyDown}
                autoFocus
            />
            <div className="absolute right-0 top-0 h-full flex">
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-full px-1.5"
                    onClick={onCancel}
                >
                    <X className="h-3.5 w-3.5"/>
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`h-full px-1.5 ${value.trim() ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={handleSubmit}
                    disabled={!value.trim()}
                >
                    <Plus className="h-3.5 w-3.5"/>
                </Button>
            </div>
        </div>
    );
});

ProjectNameInput.displayName = "ProjectNameInput"; 