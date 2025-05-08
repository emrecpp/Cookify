import {getInitials, stringToGradient} from "@/lib/utils";
import {FolderGit2} from "lucide-react";
import {HTMLAttributes} from "react";

interface ProjectAvatarProps extends HTMLAttributes<HTMLDivElement> {
    projectName: string;
    size?: "sm" | "md" | "lg";
}

export function ProjectAvatar({
                                  projectName,
                                  size = "md",
                                  className,
                                  ...props
                              }: ProjectAvatarProps) {
    const gradient = stringToGradient(projectName || "default");

    const sizeClasses = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-10 h-10 text-base",
    };


    return (
        <div
            className={`rounded-sm flex items-center justify-center text-white ${sizeClasses[size]} ${className ?? ""}`}
            style={{background: gradient.gradient}}
            title={projectName}
            {...props}
        >
            {!projectName ? (
                <FolderGit2 className="w-3 h-3"/>
            ) : (
                getInitials(projectName).toUpperCase()
            )}
        </div>
    );
} 