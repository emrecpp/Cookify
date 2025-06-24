import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table"
import {CookieData, SwaggerData} from "@/types/types"
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd'
import {BrushCleaning, PlusCircle, Search} from 'lucide-react'
import React from "react"
import {useGlobalContext} from "@/context/global-context.tsx"
import {Button} from "@/components/ui/button"

export type DataType = CookieData | SwaggerData;

interface DataTableProps<T extends DataType> {
    data: T[];
    type: 'cookie' | 'swagger';
    onReorder?: (startIndex: number, endIndex: number) => void;
    renderHeaders: () => React.ReactNode;
    renderCells: (item: T, index: number, dragHandleProps: any) => React.ReactNode;
    originalDataLength?: number;
}

export default function DataTable<T extends DataType>({
                                                          data,
                                                          type,
                                                          onReorder,
                                                          renderHeaders,
                                                          renderCells,
                                                          originalDataLength
                                                      }: DataTableProps<T>) {
    const {
        settings, activeProject, setActiveProject, setCurrentView,
        searchTerm, clearSearchTerm, handleApply
    } = useGlobalContext()

    const hasStoredData = () => {
        const stored = localStorage.getItem('Cookify')
        if (!stored) return false
        try {
            const data = JSON.parse(stored)
            return (data.cookies && data.cookies.length > 0) || (data.swaggers && data.swaggers.length > 0)
        } catch {
            return false
        }
    }

    const shouldShowNoResults = data.length === 0 && (!hasStoredData() || searchTerm || activeProject)

    const handleDragEnd = (result: any) => {
        if (!result.destination || !onReorder) return
        onReorder(result.source.index, result.destination.index)
    }

    const handleRowClick = (item: T) => {
        if (settings.applyOnClick) {
            handleApply(item);
        }
    }

    const handleClearProjectFilter = () => {
        setActiveProject(null);
        localStorage.removeItem("cookify_selected_global_project");
    }

    const handleAddNew = () => {
        setCurrentView(type === 'cookie' ? 'add-cookie' : 'add-swagger');
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="relative overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background">
                            {renderHeaders()}
                        </TableHeader>
                        <Droppable droppableId={type === 'cookie' ? 'cookies' : 'swaggers'}>
                            {(provided) => (
                                <TableBody
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {shouldShowNoResults ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Search className="w-4 h-4"/>
                                                        No results found.
                                                    </div>
                                                    {searchTerm && clearSearchTerm ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={clearSearchTerm}
                                                            className="mt-2 text-xs w-40 flex items-center gap-1"
                                                        >
                                                            <BrushCleaning className="w-4 h-4 mr-1"/>
                                                            Clear <b>Search</b> filter
                                                        </Button>
                                                    ) : activeProject ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleClearProjectFilter}
                                                            className="mt-2 text-xs w-40 flex items-center gap-1"
                                                        >
                                                            <BrushCleaning className="w-4 h-4 mr-1"/>
                                                            Clear <b>Project</b> filter
                                                        </Button>
                                                    ) : originalDataLength === 0 ? (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={handleAddNew}
                                                            className="mt-2 flex items-center gap-2 text-xs w-40"
                                                        >
                                                            <PlusCircle className="w-4 h-4"/>
                                                            Add new {type}
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((item, index) => (
                                            <Draggable
                                                key={JSON.stringify(item) + "-" + index}
                                                draggableId={item.alias}
                                                index={index}
                                            >
                                                {(provided) => (
                                                    <TableRow
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`${settings.applyOnClick ? "cursor-pointer" : "cursor-default"} transition-colors hover:bg-accent/50`}
                                                        onClick={() => handleRowClick(item)}
                                                    >
                                                        {renderCells(item, index, provided.dragHandleProps)}
                                                    </TableRow>
                                                )}
                                            </Draggable>
                                        ))
                                    )}
                                    {provided.placeholder}
                                </TableBody>
                            )}
                        </Droppable>
                    </Table>
                </div>
            </DragDropContext>
        </div>
    )
} 