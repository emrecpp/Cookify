import {useState} from "react";
import {createStore, useStore} from "../store";

// ---------------------------------------------------------------------------
// Text prompt (replaces window.prompt, which would block the page)

interface PromptState {
    title: string;
    label?: string;
    initial?: string;
    confirm?: string;
    resolve: (value: string | null) => void;
}

const promptStore = createStore<{ prompt: PromptState | null }>({prompt: null});

export function askText(options: Omit<PromptState, "resolve">): Promise<string | null> {
    return new Promise((resolve) => promptStore.set({prompt: {...options, resolve}}));
}

function PromptDialog({prompt}: { prompt: PromptState }) {
    const [value, setValue] = useState(prompt.initial ?? "");
    const finish = (result: string | null) => {
        promptStore.set({prompt: null});
        prompt.resolve(result);
    };
    return (
        <div className="cf-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && finish(null)}>
            <div className="cf-modal is-small" role="dialog" aria-label={prompt.title}>
                <div className="cf-modal-head">
                    <span className="cf-modal-title">{prompt.title}</span>
                    <span className="cf-flex"/>
                    <button className="cf-modal-close" onClick={() => finish(null)} title="Close (Esc)">×</button>
                </div>
                <div className="cf-modal-body">
                    {prompt.label && <label className="cf-modal-label">{prompt.label}</label>}
                    <input
                        className="cf-input"
                        autoFocus
                        value={value}
                        spellCheck={false}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && value.trim()) finish(value.trim());
                            if (e.key === "Escape") finish(null);
                        }}
                    />
                </div>
                <div className="cf-modal-actions">
                    <button className="cf-btn" onClick={() => finish(null)}>Cancel</button>
                    <button className="cf-btn is-primary" disabled={!value.trim()} onClick={() => finish(value.trim())}>{prompt.confirm ?? "OK"}</button>
                </div>
            </div>
        </div>
    );
}

export {guessKind, KIND_LABEL, KIND_SHORT, newId} from "../state";

export function DialogHost() {
    const prompt = useStore(promptStore, (s) => s.prompt);
    return (
        <>
            {prompt && <PromptDialog prompt={prompt}/>}
        </>
    );
}
