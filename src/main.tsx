import App from "@/app/App.tsx";
import { GlobalContextProvider } from "@/context/global-context.tsx";
import { createRoot } from 'react-dom/client';
import { Toaster } from "react-hot-toast";
import './index.css';

createRoot(document.getElementById('root')!).render(
    <GlobalContextProvider>
        <App/>
        <Toaster />
    </GlobalContextProvider>
)
