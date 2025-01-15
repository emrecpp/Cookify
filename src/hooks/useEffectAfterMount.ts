import {useEffect, useRef} from "react";

export function useEffectAfterMount(effect:any, deps:any) {
    const isMounted = useRef(false);

    useEffect(() => {
        if (isMounted.current) return effect();
        else isMounted.current = true;
    }, deps);

    // reset on unmount; in React 18, components can mount again
    useEffect(() => () => {
        isMounted.current = false;
    }, []);
}