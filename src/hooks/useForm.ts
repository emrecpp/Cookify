import { handleFormBack, validateFormData } from '@/lib/form-utils';
import { useEffect, useState } from 'react';

interface UseFormOptions<T> {
    initialData: T | null;
    emptyData: T;
    onSubmit: (data: T) => void;
    setCurrentView: (view: string) => void;
    clearEditing: () => void;
    backView: string;
    unrequiredFields?: string[];
}

export function useForm<T extends Record<string, any>>({
    initialData,
    emptyData,
    onSubmit,
    setCurrentView,
    clearEditing,
    backView,
    unrequiredFields = []
}: UseFormOptions<T>) {
    // Initialize form data with initial data or empty data
    const [formData, setFormData] = useState<T>(initialData ? { ...initialData } : emptyData);

    // Update form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({ ...initialData });
        }
    }, [initialData]);

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // Handle field change
    const handleFieldChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle back button
    const handleBack = () => {
        handleFormBack(backView, setCurrentView, clearEditing);
    };

    // Check if form is valid
    const isFormValid = validateFormData(formData, unrequiredFields);

    return {
        formData,
        setFormData,
        handleSubmit,
        handleInputChange,
        handleFieldChange,
        handleBack,
        isFormValid,
        isEditing: !!initialData
    };
} 