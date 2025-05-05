/**
 * Form değerlerinin geçerliliğini kontrol eden yardımcı fonksiyon 
 */
export function validateFormData<T extends Record<string, any>>(
    formData: T, 
    unrequiredFields: string[] = []
): boolean {
    return Object.entries(formData)
        .filter(([key]) => !unrequiredFields.includes(key) && !key.startsWith('_'))
        .every(([_, value]) => {
            // Array değerlere özel kontrol
            if (Array.isArray(value)) {
                return true; // Boş dizilere izin veriyoruz
            }
            return Boolean(value); 
        });
}

/**
 * Form durumunu güncellemek için yardımcı fonksiyon 
 */
export function updateFormState<T>(
    prevState: T, 
    field: string, 
    value: any
): T {
    return {
        ...prevState,
        [field]: value
    };
}

/**
 * Genel form geri dönüş işlemi
 */
export function handleFormBack(
    navigateTo: string,
    setCurrentView: (view: string) => void,
    clearEditingItem: () => void
): void {
    setCurrentView(navigateTo);
    setTimeout(() => {
        clearEditingItem();
    }, 200);
} 