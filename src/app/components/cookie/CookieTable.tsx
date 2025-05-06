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
import { useActiveCookies } from "@/hooks/useActiveCookies"
import { useApplyCookie } from "@/hooks/useCookie.ts"
import { CookieData } from "@/types/types"
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Check, CheckCircle2, Copy, FilePen, GripVertical, MoreHorizontal, Search, Trash } from 'lucide-react'
import toast from 'react-hot-toast'

interface CookieTableProps {
  cookies: CookieData[];
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
}

export default function CookieTable({ cookies, onMoveUp, onMoveDown, onReorder }: CookieTableProps) {
  const { handleEdit, handleDeleteProfile, settings } = useGlobalContext()
  const { isCookieActive } = useActiveCookies(cookies)

  const handleCopyValue = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Value copied')
  }

  const applyCookie = async (cookie: CookieData) => {
    await useApplyCookie(cookie)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return
    onReorder(result.source.index, result.destination.index)
  }
  
  const handleRowClick = (cookie: CookieData) => {
    if (settings.applyOnClick) {
      applyCookie(cookie);
    }
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-y-auto" style={{ maxHeight: "350px" }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '60px', paddingLeft: '16px' }}>Order</TableHead>
                <TableHead style={{ width: '150px', paddingLeft: '16px' }}>Alias</TableHead>
                <TableHead style={{ width: '150px', paddingLeft: '16px' }}>Cookie Name</TableHead>
                <TableHead style={{ paddingLeft: '16px' }}>Project</TableHead>
                <TableHead style={{ width: '120px', paddingLeft: '16px' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <Droppable droppableId="cookies">
              {(provided) => (
                <TableBody
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {cookies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Search className="w-4 h-4" />
                          No results found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cookies.map((cookie, index) => (
                      <Draggable 
                        key={cookie.alias} 
                        draggableId={cookie.alias} 
                        index={index}
                      >
                        {(provided) => (
                          <TableRow 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${isCookieActive(cookie.alias) ? "bg-green-50/50" : ""} 
                              ${settings.applyOnClick ? "cursor-pointer" : "cursor-default"} transition-colors hover:bg-accent/50`}
                            onClick={() => handleRowClick(cookie)}
                          >
                            <TableCell style={{ width: '60px', paddingLeft: '16px' }}>
                              <div className="flex items-center" {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            <TableCell style={{ width: '150px', paddingLeft: '16px' }} className="font-medium">
                              <div className="flex items-center gap-1.5">
                                {isCookieActive(cookie.alias) && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                )}
                                {cookie.alias}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: '150px', paddingLeft: '16px' }}>{cookie.name}</TableCell>
                            <TableCell style={{ paddingLeft: '16px' }}>
                              <div className="flex items-center gap-2">
                                {cookie.project ? (
                                  <>
                                    <ProjectAvatar projectName={cookie.project} size="sm" />
                                    <span>{cookie.project}</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Not specified</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: '120px', paddingLeft: '16px' }}>
                              <div className="flex items-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(cookie)}>
                                      <FilePen className="h-3.5 w-3.5 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteProfile(cookie)}
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
                                    handleCopyValue(cookie.value);
                                  }}
                                  title="Copy value"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  className={`h-7 w-7 ${isCookieActive(cookie.alias) ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800" : ""}`}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    await useApplyCookie(cookie)
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