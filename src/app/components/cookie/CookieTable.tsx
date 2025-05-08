import DataTable from "@/app/components/shared/DataTable"
import {useGlobalContext} from "@/context/global-context.tsx"
import {useActiveCookies} from "@/hooks/useActiveCookies"
import {useApplyCookie} from "@/hooks/useCookie.ts"
import {CookieData} from "@/types/types"
import {Button} from "@/components/ui/button"
import {Check, CheckCircle2, Copy, FilePen, GripVertical, MoreHorizontal, Trash} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {ProjectAvatar} from "@/components/ui/project-avatar"
import {TableCell, TableHead, TableRow} from "@/components/ui/table"
import toast from "react-hot-toast"

interface CookieTableProps {
    cookies: CookieData[];
    onReorder?: (startIndex: number, endIndex: number) => void;
    searchTerm?: string;
    clearSearchTerm?: () => void;
    originalDataLength?: number;
}

export default function CookieTable({
    cookies, 
    onReorder,
    searchTerm = "",
    clearSearchTerm,
    originalDataLength = 0
}: CookieTableProps) {
    const {handleEdit, handleDeleteProfile} = useGlobalContext()
    const {isCookieActive} = useActiveCookies(cookies)
    
    const COLUMN_WIDTHS = {
        order: '60px',
        alias: '180px',
        cookieName: '150px',
        project: '140px',
        actions: '100px'
    }
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Value copied')
    }
    
    const renderHeaders = () => {
        return (
            <TableRow>
                <TableHead style={{width: COLUMN_WIDTHS.order}} className="text-center">Order</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.alias}}>Alias</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.cookieName}}>Cookie Name</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.project}}>Project</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.actions}} className="text-center">Actions</TableHead>
            </TableRow>
        )
    }
    
    const renderCells = (cookie: CookieData, index: number, dragHandleProps: any) => {
        return (
            <>
                <TableCell style={{width: COLUMN_WIDTHS.order, paddingLeft: '16px'}}>
                    <div className="flex items-center" {...dragHandleProps}>
                        <GripVertical className="h-4 w-4 text-muted-foreground"/>
                    </div>
                </TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.alias}} className="font-medium">
                    <div className="flex items-center gap-1.5">
                        {isCookieActive(cookie.alias) && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500"/>
                        )}
                        {cookie.alias}
                    </div>
                </TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.cookieName}}>{cookie.name}</TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.project}}>
                    <div className="flex items-center gap-2">
                        {cookie.project ? (
                            <>
                                <ProjectAvatar projectName={cookie.project} size="sm"/>
                                <span className="text-nowrap">{cookie.project}</span>
                            </>
                        ) : (
                            <span className="text-muted-foreground text-xs">Not specified</span>
                        )}
                    </div>
                </TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.actions, paddingLeft: '16px'}}>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-3.5 w-3.5"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(cookie)}>
                                    <FilePen className="h-3.5 w-3.5 mr-2"/>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteProfile(cookie)}
                                >
                                    <Trash className="h-3.5 w-3.5 mr-2"/>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                                handleCopy(cookie.value);
                            }}
                            title="Copy value"
                        >
                            <Copy className="h-3.5 w-3.5"/>
                        </Button>
                        <Button
                            className={`h-7 w-7 ${isCookieActive(cookie.alias) ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800" : ""}`}
                            onClick={async (e) => {
                                await useApplyCookie(cookie)
                            }}
                            variant="secondary"
                            size="icon"
                            title="Apply"
                        >
                            <Check className="h-3.5 w-3.5"/>
                        </Button>
                    </div>
                </TableCell>
            </>
        )
    }
    
    return (
        <DataTable 
            data={cookies as any}
            type="cookie"
            onReorder={onReorder}
            renderHeaders={renderHeaders}
            renderCells={renderCells}
            searchTerm={searchTerm}
            clearSearchTerm={clearSearchTerm}
            originalDataLength={originalDataLength || 0}
        />
    )
} 