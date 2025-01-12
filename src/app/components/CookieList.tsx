import {CookieItem} from './CookieItem'
import {motion} from 'framer-motion'
import {useGlobalContext} from "@/context/global-context.tsx";
import {Button} from "@/components/ui/button.tsx";


export function CookieList() {
    const {cookies} = useGlobalContext()

    const handleClick = () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0].id)
                return;
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "loginSwagger", params: {
                    bearerToken: "test"
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError);
                    return;
                }
                console.log(`Swagger UI detected: ${response?.isSwagger}`);
            });

        });
    }


    return (
        <div>
            <Button onClick={handleClick}>test</Button>
            {cookies.length === 0 ? (
                <motion.p
                    initial={{opacity: 0, x: 0, y: -20}}
                    animate={{opacity: 1, x: 0, y: 0}}
                    transition={{duration: 0.3, delay: 0.2}}
                    className="text-gray-500 text-center"
                >
                    No cookies have been added yet...
                </motion.p>
            ) : (
                <motion.ul
                    className="space-y-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {transition: {staggerChildren: 0.1}},
                    }}
                >
                    {cookies.map((cookie, index) => (
                        <CookieItem
                            key={cookie.alias}
                            cookie={cookie}
                            index={index}
                        />
                    ))}
                </motion.ul>
            )}
        </div>
    )
}

