// The saved cookies and the saved Swagger tokens: one searchable, reorderable table for both.
import ActionButtons from "@/app/components/shared/ActionButtons"
import DataTable, {DataType, DragHandleProps} from "@/app/components/shared/DataTable"
import GlobalFilter from "@/app/components/shared/GlobalFilter.tsx"
import {ProjectAvatar} from "@/components/ui/project-avatar"
import {TableCell, TableHead, TableRow} from "@/components/ui/table"
import {useGlobalContext} from "@/context/global-context.tsx"
import {CookieData, SwaggerData} from "@/types/types"
import {GripVertical} from "lucide-react"
import {useMemo} from "react"
import toast from "react-hot-toast"

export type ProfileType = "cookie" | "swagger"

interface ProfileKind<T extends DataType> {
    type: ProfileType
    /** Fields the search box looks in, besides the project. */
    searchable: (item: T) => (string | undefined)[]
    /** What the copy button copies. */
    copyValue: (item: T) => string
    copyTitle: string
    copied: string
}

const COOKIE: ProfileKind<CookieData> = {
    type: "cookie",
    searchable: (cookie) => [cookie.alias, cookie.name, cookie.domain, cookie.value],
    copyValue: (cookie) => cookie.value,
    copyTitle: "Copy value",
    copied: "Value copied.",
}

const SWAGGER: ProfileKind<SwaggerData> = {
    type: "swagger",
    searchable: (swagger) => [swagger.alias],
    copyValue: (swagger) => swagger.bearerToken,
    copyTitle: "Copy token",
    copied: "Token copied.",
}

const NOT_SPECIFIED = "Not specified"

const COLUMN_WIDTHS = {
    order: "60px",
    alias: "210px",
    project: "140px",
    actions: "120px",
}

export function ProfileList({type}: { type: ProfileType }) {
    const {cookies, setCookies, swaggers, setSwaggers} = useGlobalContext()
    return type === "cookie"
        ? <List kind={COOKIE} items={cookies} setItems={setCookies}/>
        : <List kind={SWAGGER} items={swaggers} setItems={setSwaggers}/>
}

function List<T extends DataType>({kind, items, setItems}: { kind: ProfileKind<T>; items: T[]; setItems: (items: T[]) => void }) {
    const {searchTerm, activeProject, handleEdit, handleDeleteProfile, handleApply} = useGlobalContext()

    const filtered = useMemo(() => {
        const search = searchTerm.toLowerCase()
        return items.filter((item) => {
            if (activeProject && (activeProject === NOT_SPECIFIED ? item.project : item.project !== activeProject)) return false
            return !search || [...kind.searchable(item), item.project].some((field) => field?.toLowerCase().includes(search))
        })
    }, [items, kind, searchTerm, activeProject])

    // The indexes are positions in the list on screen: the visible items swap places among themselves, and items
    // hidden by the search or the project filter stay where they are in the full list.
    const handleReorder = (startIndex: number, endIndex: number) => {
        const moved = [...filtered]
        const [item] = moved.splice(startIndex, 1)
        moved.splice(endIndex, 0, item)
        const visible = new Set(filtered)
        let next = 0
        const reordered = items.map((entry) => (visible.has(entry) ? moved[next++] : entry))
        setItems(reordered.map((entry, order) => ({...entry, order})))
    }

    const handleCopy = (text: string) => {
        void navigator.clipboard.writeText(text)
        toast.success(kind.copied)
    }

    const renderHeaders = () => (
        <TableRow>
            <TableHead style={{width: COLUMN_WIDTHS.order}} className="text-center text-nowrap">Order</TableHead>
            <TableHead style={{width: COLUMN_WIDTHS.alias}} className="text-nowrap">Alias</TableHead>
            <TableHead style={{width: COLUMN_WIDTHS.project}} className="text-nowrap">Project</TableHead>
            <TableHead style={{width: COLUMN_WIDTHS.actions}} className="text-center text-nowrap">Actions</TableHead>
        </TableRow>
    )

    const renderCells = (item: T, _index: number, dragHandleProps: DragHandleProps) => (
        <>
            <TableCell style={{width: COLUMN_WIDTHS.order, paddingLeft: "16px"}}>
                <div className="flex items-center" {...dragHandleProps}>
                    <GripVertical className="h-4 w-4 text-muted-foreground"/>
                </div>
            </TableCell>
            <TableCell style={{width: COLUMN_WIDTHS.alias}} className="font-medium">{item.alias}</TableCell>
            <TableCell style={{width: COLUMN_WIDTHS.project}}>
                <div className="flex items-center gap-2">
                    {item.project ? (
                        <>
                            <ProjectAvatar projectName={item.project} size="sm"/>
                            <span className="text-nowrap">{item.project}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground text-xs">{NOT_SPECIFIED}</span>
                    )}
                </div>
            </TableCell>
            <TableCell style={{width: COLUMN_WIDTHS.actions, paddingLeft: "16px"}}>
                <ActionButtons
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDeleteProfile(item)}
                    onCopy={() => handleCopy(kind.copyValue(item))}
                    onApply={() => void handleApply(item)}
                    copyTitle={kind.copyTitle}
                />
            </TableCell>
        </>
    )

    return (
        <div className="space-y-4 h-full flex flex-col">
            <GlobalFilter/>
            <div className="rounded-md border flex-1 overflow-hidden">
                <DataTable
                    data={filtered}
                    type={kind.type}
                    onReorder={handleReorder}
                    renderHeaders={renderHeaders}
                    renderCells={renderCells}
                    originalDataLength={items.length}
                />
            </div>
        </div>
    )
}
