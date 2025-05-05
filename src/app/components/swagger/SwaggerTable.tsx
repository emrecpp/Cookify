import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectAvatar } from "@/components/ui/project-avatar"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useGlobalContext } from "@/context/global-context.tsx"
import { SwaggerData } from "@/types/types"
import { Check, Copy, FilePen, GripVertical, MoreHorizontal, Search, Trash } from 'lucide-react'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import toast from 'react-hot-toast'

interface SwaggerTableProps {
  swaggers: SwaggerData[];
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
}

export function SwaggerTable({ swaggers, onMoveUp, onMoveDown, onReorder }: SwaggerTableProps) {
  const { handleEdit, handleDeleteProfile, handleApply, settings } = useGlobalContext()

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Token copied')
  }

  const applySwagger = async (swagger: SwaggerData) => {
    await handleApply(swagger)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return
    onReorder(result.source.index, result.destination.index)
  }
  
  const handleRowClick = (swagger: SwaggerData) => {
    if (settings.applyOnClick) {
      applySwagger(swagger);
    }
  }

  return (
    <div className="relative overflow-hidden flex flex-col">
      <div className="sticky top-0 z-20 bg-background">
        <Table className="select-none">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Order</TableHead>
              <TableHead className="w-[160px]">Alias</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[100px]">Auto Login</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "350px" }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Table>
            <Droppable droppableId="swaggers">
              {(provided) => (
                <TableBody
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {swaggers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Search className="w-4 h-4" />
                          No results found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    swaggers.map((swagger, index) => (
                      <Draggable 
                        key={swagger.alias} 
                        draggableId={swagger.alias} 
                        index={index}
                      >
                        {(provided) => (
                          <TableRow 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${settings.applyOnClick ? "cursor-pointer" : "cursor-default"} transition-colors hover:bg-accent/50`}
                            onClick={() => handleRowClick(swagger)}
                          >
                            <TableCell className="w-[60px]">
                              <div className="flex items-center" {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{swagger.alias}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {swagger.project ? (
                                  <>
                                    <ProjectAvatar projectName={swagger.project} size="sm" />
                                    <span>{swagger.project}</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Not specified</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={swagger.autoLogin === "true" ? "text-green-500" : "text-gray-400"}>
                                {swagger.autoLogin === "true" ? "On" : "Off"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(swagger)}>
                                      <FilePen className="h-3.5 w-3.5 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteProfile(swagger)}
                                    >
                                      <Trash className="h-3.5 w-3.5 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyToken(swagger.bearerToken);
                                  }}
                                  title="Copy token"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  className="h-7 w-7"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    await handleApply(swagger)
                                  }}
                                  variant="secondary"
                                  size="icon"
                                  title="Apply"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
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
        </DragDropContext>
      </div>
    </div>
  )
} 