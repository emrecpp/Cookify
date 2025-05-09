import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, FilePen, MoreHorizontal, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

interface ActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onApply: () => void;
  copyTitle?: string;
  children?: React.ReactNode;
}

export default function ActionButtons({
  onEdit,
  onDelete,
  onCopy,
  onApply,
  copyTitle = "Kopyala",
  children
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <FilePen className="h-3.5 w-3.5 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={onDelete}
          >
            <Trash className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onCopy}
        title={copyTitle}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button
        className="h-7 w-7"
        onClick={onApply}
        variant="secondary"
        size="icon"
        title="Apply"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
} 