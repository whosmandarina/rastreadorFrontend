export const validators = {
  correo: (value: string): string | null => {
    if (!value.trim()) return 'El correo es obligatorio';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'El correo no tiene un formato válido';
    return null;
  },

  nombre: (value: string): string | null => {
    if (!value.trim()) return 'El nombre es obligatorio';
    if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    if (!nombreRegex.test(value.trim())) return 'El nombre solo puede contener letras y espacios';
    return null;
  },

  password: (value: string): string | null => {
    if (!value) return 'La contraseña es obligatoria';
    if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    return null;
  },

  telefono: (value: string): string | null => {
    if (!value) return null; // opcional
    const telRegex = /^[0-9+\s\-()]{7,15}$/;
    if (!telRegex.test(value)) return 'El teléfono no tiene un formato válido';
    return null;
  },

  codigoSupervisor: (value: string): string | null => {
    if (!value.trim()) return 'El código de supervisor es obligatorio';
    if (isNaN(Number(value)) || Number(value) <= 0) return 'El código debe ser un número válido';
    return null;
  },

  // Valida un objeto de campos y retorna el primer error encontrado o null
  validate: (fields: Record<string, { value: string; validator: (v: string) => string | null }>): string | null => {
    for (const key of Object.keys(fields)) {
      const error = fields[key].validator(fields[key].value);
      if (error) return error;
    }
    return null;
  },
};
