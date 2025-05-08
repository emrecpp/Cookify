import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import {z} from 'zod';

interface UseZodFormOptions<T, S extends z.ZodType<T>> {
    initialData: T | null;
    emptyData: T;
    schema: S;
    onSubmit: (data: T) => void;
    setCurrentView: (view: string) => void;
    clearEditing: () => void;
    backView: string;
}

export function useZodForm<T, S extends z.ZodType<T>>({
                                                          initialData,
                                                          emptyData,
                                                          schema,
                                                          onSubmit,
                                                          setCurrentView,
                                                          clearEditing,
                                                          backView,
                                                      }: UseZodFormOptions<T, S>) {
    const [formData, setFormData] = useState<T>(initialData ? {...initialData} : emptyData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setFormData({...initialData});
            setErrors({});
        }
    }, [initialData]);

    const validateForm = () => {
        try {
            schema.parse(formData);
            setErrors({});
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                const formattedErrors: Record<string, string> = {};
                err.errors.forEach((error) => {
                    const path = error.path.join('.');
                    formattedErrors[path] = error.message;
                });
                console.log("formattedErrors: ", formattedErrors)
                setErrors(formattedErrors);
            }
            return false;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = validateForm();
        if (isValid) {
            onSubmit(formData);
        } else {
            toast.error('Please fill the required fields.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {id, value} = e.target;
        setFormData(prev => ({...prev, [id]: value}));

        if (errors[id]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[id];
                return newErrors;
            });
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleBack = () => {
        setCurrentView(backView);
        setTimeout(() => {
            clearEditing();
            setErrors({});
        }, 200);
    };

    const isFormValid = Object.keys(errors).length === 0;

    return {
        formData,
        setFormData,
        handleSubmit,
        handleInputChange,
        handleFieldChange,
        handleBack,
        errors,
        isFormValid,
        isEditing: !!initialData,
        validateForm
    };
} 