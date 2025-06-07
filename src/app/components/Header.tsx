import { Button } from "@/components/ui/button";
import { useGlobalContext, PageView } from "@/context/global-context";
import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';

export function Header() {
    const {
        currentView, 
        setCurrentView, 
        setEditingCookie, 
        setEditingSwagger, 
        cookies,
        swaggers
    } = useGlobalContext()

    const activePage = (view: string) => {
        if (view.includes("cookie")) return "cookies";
        if (view.includes("swagger")) return "swaggers";
        return view;
    };

    const getHeaderTitle = () => {
        if (currentView === PageView.ADD_COOKIE) return "Add New Cookie";
        if (currentView === PageView.EDIT_COOKIE) return "Edit Cookie";
        if (currentView === PageView.ADD_SWAGGER) return "Add New Swagger";
        if (currentView === PageView.EDIT_SWAGGER) return "Edit Swagger";
        return "";
    };

    const handleAddClick = () => {
        if (activePage(currentView) === "cookies") {
            setEditingCookie(null)
            setCurrentView(PageView.ADD_COOKIE)
        } else {
            setEditingSwagger(null)
            setCurrentView(PageView.ADD_SWAGGER)
        }
    }
    
    const showTitle = [PageView.ADD_COOKIE, PageView.EDIT_COOKIE, PageView.ADD_SWAGGER, PageView.EDIT_SWAGGER].includes(currentView as PageView);
    
    const shouldShowAddButton = () => {
        if (currentView === PageView.LIST_COOKIES) {
            return cookies.length > 0;
        } else if (currentView === PageView.LIST_SWAGGERS) {
            return swaggers.length > 0;
        }
        return false;
    };
    
    return (
        <div className="px-2 bg-white shadow-sm">
            <motion.header
                className="flex justify-between items-center select-none py-3"
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0}}
            >
                <motion.h1
                    className="text-lg font-bold flex items-center cursor-pointer text-slate-800"
                    whileHover={{scale: 1.05}}
                    whileTap={{scale: 0.95}}
                    onClick={() => setCurrentView('list-cookies')}
                >
                    <img src="/icon/32.png" alt="Cookify Logo" width={32} height={32} className="mr-1 w-8 h-8"/>
                    Cookify
                </motion.h1>

                {showTitle && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 text-sm text-gray-500 font-medium">
                        {getHeaderTitle()}
                    </div>
                )}

                <div className="space-x-2">
                    {["list-cookies", "list-swaggers"].includes(currentView) && shouldShowAddButton() && (
                        <Button variant="outline" size="sm" onClick={handleAddClick}>
                            <PlusCircle
                                className="h-4 w-4 mr-1"/> {activePage(currentView) === "cookies" ? 'Add New Cookie' : 'Add New Swagger'}
                        </Button>
                    )}
                </div>
            </motion.header>
            <div className="w-full bg-gray-300 h-[1px] my-1"/>
        </div>
    )
}

