import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from "@/app/App.tsx";
import './index.css'
import {GlobalContextProvider} from "@/context/global-context.tsx";
import {Toaster} from "react-hot-toast";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <GlobalContextProvider>
            <App/>
            <Toaster />
        </GlobalContextProvider>
    </StrictMode>,
)
