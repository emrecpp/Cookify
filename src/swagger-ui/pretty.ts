/** A response or request body for display: JSON is re-indented, anything else is shown as it is. */
export function prettyBody(text: string, contentType: string): { text: string; isJson: boolean } {
    const trimmed = text.trim();
    if (/json/i.test(contentType) || /^[[{]/.test(trimmed)) {
        try {
            return {text: JSON.stringify(JSON.parse(trimmed), null, 2), isJson: true};
        } catch {
            // not json
        }
    }
    return {text, isJson: false};
}
