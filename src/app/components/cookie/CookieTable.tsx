import DataTable from "@/app/components/shared/DataTable"
import {useGlobalContext} from "@/context/global-context.tsx"
import {useApplyCookie} from "@/hooks/useCookie.tsx"
import {CookieData} from "@/types/types"
import {GripVertical} from "lucide-react"
import {ProjectAvatar} from "@/components/ui/project-avatar"
import {TableCell, TableHead, TableRow} from "@/components/ui/table"
import toast from "react-hot-toast"
import ActionButtons from "@/app/components/shared/ActionButtons"

interface CookieTableProps {
    cookies: CookieData[];
    onReorder?: (startIndex: number, endIndex: number) => void;
    originalDataLength?: number;
}

export default function CookieTable({
                                        cookies,
                                        onReorder,
                                        originalDataLength
                                    }: CookieTableProps) {
    const {handleEdit, handleDeleteProfile} = useGlobalContext()

    const COLUMN_WIDTHS = {
        order: '60px',
        alias: '210px',
        project: '140px',
        actions: '120px'
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Value copied.')
    }

    const renderHeaders = () => {
        return (
            <TableRow>
                <TableHead style={{width: COLUMN_WIDTHS.order}} className="text-center">Order</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.alias}}>Alias</TableHead>
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
                        {cookie.alias}
                    </div>
                </TableCell>
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
                    <ActionButtons 
                        onEdit={() => handleEdit(cookie)}
                        onDelete={() => handleDeleteProfile(cookie)}
                        onCopy={() => handleCopy(cookie.value)}
                        onApply={async () => await useApplyCookie(cookie)}
                        copyTitle="Copy value"
                    />
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
            originalDataLength={originalDataLength ||0}
        />
    )
} 