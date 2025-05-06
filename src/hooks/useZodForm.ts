import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';

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
  const [formData, setFormData] = useState<T>(initialData ? { ...initialData } : emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      setErrors({});
    }
  }, [initialData]);

  // Validate form and return errors
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
        setErrors(formattedErrors);
      }
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateForm();
    if (isValid) {
      onSubmit(formData);
    } else {
      // Form geçersizse kullanıcıya bildir
      toast.error('Lütfen zorunlu alanları doldurun');
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    
    // Eğer halihazırda error varsa, inputun değeri değiştiğinde temizle
    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Eğer halihazırda error varsa, field değeri değiştiğinde temizle
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle back button
  const handleBack = () => {
    setCurrentView(backView);
    setTimeout(() => {
      clearEditing();
      setErrors({});
    }, 200);
  };

  // Form sadece gönderilmek üzereyken veya düzenleme modundaysa doğruluk kontrolü yapılacak
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