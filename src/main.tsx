import App from "@/app/App.tsx";
import {GlobalContextProvider} from "@/context/global-context.tsx";
import {createRoot} from 'react-dom/client';
import {Toaster} from "react-hot-toast";
import './index.css';

// console.log('[Cookify] app startup', {
//     mode: import.meta.env.MODE,
//     clientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
//     webClientId: import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
// });

createRoot(document.getElementById('root')!).render(
    <GlobalContextProvider>
        <App />
        <Toaster />
    </GlobalContextProvider>
)
