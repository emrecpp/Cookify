import DataTable from "@/app/components/shared/DataTable"
import {useGlobalContext} from "@/context/global-context.tsx"
import {SwaggerData} from "@/types/types"
import {GripVertical} from "lucide-react"
import {ProjectAvatar} from "@/components/ui/project-avatar"
import {TableCell, TableHead, TableRow} from "@/components/ui/table"
import toast from "react-hot-toast"
import ActionButtons from "@/app/components/shared/ActionButtons"

interface SwaggerTableProps {
    swaggers: SwaggerData[];
    onReorder?: (startIndex: number, endIndex: number) => void;
    originalDataLength?: number;
}

export default function SwaggerTable({
    swaggers, 
    onReorder,
    originalDataLength = 0
}: SwaggerTableProps) {
    const {handleEdit, handleDeleteProfile, handleApply} = useGlobalContext()
    
    const COLUMN_WIDTHS = {
        order: '60px',
        alias: '210px',
        project: '140px',
        actions: '120px'
    }
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Token copied.')
    }
    
    const renderHeaders = () => {
        return (
            <TableRow>
                <TableHead style={{width: COLUMN_WIDTHS.order}} className="text-center text-nowrap">Order</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.alias}} className="text-nowrap">Alias</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.project}} className="text-nowrap">Project</TableHead>
                <TableHead style={{width: COLUMN_WIDTHS.actions}} className="text-center text-nowrap">Actions</TableHead>
            </TableRow>
        )
    }
    
    const renderCells = (swagger: SwaggerData, index: number, dragHandleProps: any) => {
        return (
            <>
                <TableCell style={{width: COLUMN_WIDTHS.order, paddingLeft: '16px'}}>
                    <div className="flex items-center" {...dragHandleProps}>
                        <GripVertical className="h-4 w-4 text-muted-foreground"/>
                    </div>
                </TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.alias}} className="font-medium">{swagger.alias}</TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.project}}>
                    <div className="flex items-center gap-2">
                        {swagger.project ? (
                            <>
                                <ProjectAvatar projectName={swagger.project} size="sm"/>
                                <span className="text-nowrap">{swagger.project}</span>
                            </>
                        ) : (
                            <span className="text-muted-foreground text-xs">Not specified</span>
                        )}
                    </div>
                </TableCell>
                <TableCell style={{width: COLUMN_WIDTHS.actions, paddingLeft: '16px'}}>
                    <ActionButtons 
                        onEdit={() => handleEdit(swagger)}
                        onDelete={() => handleDeleteProfile(swagger)}
                        onCopy={() => handleCopy(swagger.bearerToken)}
                        onApply={async () => await handleApply(swagger)}
                        copyTitle="Copy token"
                    />
                </TableCell>
            </>
        )
    }
    
    return (
        <DataTable 
            data={swaggers as any}
            type="swagger"
            onReorder={onReorder}
            renderHeaders={renderHeaders}
            renderCells={renderCells}
            originalDataLength={originalDataLength || 0}
        />
    )
} 