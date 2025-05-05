import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import React from 'react';

interface InputFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    icon?: React.ReactElement;
    placeholder?: string;
    required?: boolean;
    multiline?: boolean;
    className?: string;
}

export function InputField({
    id,
    label,
    value,
    onChange,
    icon,
    placeholder,
    required = false,
    multiline = false,
    className = ""
}: InputFieldProps) {
    return (
        <div className="flex flex-col gap-2 w-full select-none">
            <Label htmlFor={id}>{label}{!required && " (optional)"}</Label>
            <div className="relative">
                {icon && (
                    <div className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4">
                        {icon}
                    </div>
                )}
                
                {multiline ? (
                    <Textarea
                        id={id}
                        value={value}
                        onChange={onChange}
                        className={`${icon ? "pl-8" : ""} min-h-[100px] ${className}`}
                        placeholder={placeholder}
                        required={required}
                    />
                ) : (
                    <Input
                        id={id}
                        value={value}
                        onChange={onChange}
                        className={`${icon ? "pl-8" : ""} ${className}`}
                        placeholder={placeholder}
                        required={required}
                    />
                )}
            </div>
        </div>
    )
} 