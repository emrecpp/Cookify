import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import React, { ReactNode } from "react";

interface InputFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    placeholder?: string;
    required?: boolean;
    icon?: ReactNode;
    multiline?: boolean;
    className?: string;
    error?: string;
}

export function InputField({
    id,
    label,
    value,
    onChange,
    placeholder = "",
    required = false,
    icon,
    multiline = false,
    className = "",
    error
}: InputFieldProps) {
    return (
        <div className="flex flex-col gap-2 w-full select-none">
            <Label htmlFor={id} className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                {label}
            </Label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-2.5 top-2.5 transform text-gray-400 pointer-events-none">
                        {icon}
                    </div>
                )}
                {multiline ? (
                    <Textarea
                        id={id}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={`${icon ? "pl-9" : ""} ${className} ${error ? "border-red-500" : ""}`}
                        autoComplete="off"
                    />
                ) : (
                    <Input
                        id={id}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={`${icon ? "pl-9" : ""} ${className} ${error ? "border-red-500" : ""}`}
                        autoComplete="off"
                    />
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
} 