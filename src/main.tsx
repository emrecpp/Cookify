import App from "@/app/App.tsx";
import {GlobalContextProvider} from "@/context/global-context.tsx";
import {initTheme} from "@/lib/theme.ts";
import {createRoot} from 'react-dom/client';
import {Toaster} from "react-hot-toast";
import './index.css';

initTheme();

createRoot(document.getElementById('root')!).render(
    <GlobalContextProvider>
        <App />
        <Toaster />
    </GlobalContextProvider>
)
