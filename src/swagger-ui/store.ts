import {useSyncExternalStore} from "react";

export interface Store<T> {
    get(): T;
    set(update: Partial<T> | ((state: T) => T)): void;
    subscribe(listener: () => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
    let state = initial;
    const listeners = new Set<() => void>();
    return {
        get: () => state,
        set(update) {
            state = typeof update === "function" ? update(state) : {...state, ...update};
            listeners.forEach((listener) => listener());
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

/** Selector must return a value that is stable between renders (primitive or stored reference). */
export function useStore<T extends object, S>(store: Store<T>, selector: (state: T) => S): S {
    return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
