import { z } from 'zod';

export const VALIDATION_LIMITS = {
  nameMin: 2,
  nameMax: 50,
  emailMax: 100,
  passwordMin: 8,
  passwordMax: 50,
  phoneMinDigits: 7,
  phoneMaxDigits: 15,
  supervisorCodeMax: 10,
  geofenceNameMax: 50,
  geofenceRadiusMin: 10,
  geofenceRadiusMax: 50000,
} as const;

const nombreSchema = z
  .string()
  .trim()
  .min(1, { message: 'El nombre es obligatorio' })
  .min(VALIDATION_LIMITS.nameMin, {
    message: `El nombre debe tener al menos ${VALIDATION_LIMITS.nameMin} caracteres`,
  })
  .max(VALIDATION_LIMITS.nameMax, {
    message: `El nombre no puede exceder los ${VALIDATION_LIMITS.nameMax} caracteres`,
  })
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, {
    message: 'El nombre solo debe contener letras y espacios',
  });

const correoSchema = z
  .string()
  .trim()
  .min(1, { message: 'El correo es obligatorio' })
  .max(VALIDATION_LIMITS.emailMax, {
    message: `El correo no puede exceder los ${VALIDATION_LIMITS.emailMax} caracteres`,
  })
  .email({ message: 'El correo debe ser válido' });

const passwordSchema = z
  .string()
  .min(1, { message: 'La contraseña es obligatoria' })
  .min(VALIDATION_LIMITS.passwordMin, {
    message: `La contraseña debe tener al menos ${VALIDATION_LIMITS.passwordMin} caracteres`,
  })
  .max(VALIDATION_LIMITS.passwordMax, {
    message: `La contraseña no puede exceder los ${VALIDATION_LIMITS.passwordMax} caracteres`,
  });

const telefonoSchema = z
  .string()
  .refine(
    (value) => {
      if (!value) return true;
      return /^[0-9+\s\-()]+$/.test(value);
    },
    { message: 'El teléfono solo debe contener caracteres válidos' },
  )
  .refine(
    (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return (
        digits.length >= VALIDATION_LIMITS.phoneMinDigits &&
        digits.length <= VALIDATION_LIMITS.phoneMaxDigits
      );
    },
    {
      message: `El teléfono debe tener entre ${VALIDATION_LIMITS.phoneMinDigits} y ${VALIDATION_LIMITS.phoneMaxDigits} dígitos`,
    },
  );

const codigoSupervisorSchema = z
  .string()
  .trim()
  .min(1, { message: 'El código de supervisor es obligatorio' })
  .max(VALIDATION_LIMITS.supervisorCodeMax, {
    message: `El código no puede exceder los ${VALIDATION_LIMITS.supervisorCodeMax} dígitos`,
  })
  .regex(/^\d+$/, { message: 'El código de supervisor debe ser numérico' })
  .refine((value) => Number(value) > 0, {
    message: 'El código de supervisor debe ser mayor a 0',
  });

const getFirstError = (result: z.SafeParseReturnType<string, string>) => {
  if (result.success) return null;
  return result.error.issues[0]?.message || 'valor inválido';
};

export const validators = {
  correo: (value: string): string | null =>
    getFirstError(correoSchema.safeParse(value)),
  nombre: (value: string): string | null =>
    getFirstError(nombreSchema.safeParse(value)),
  password: (value: string): string | null =>
    getFirstError(passwordSchema.safeParse(value)),
  telefono: (value: string): string | null =>
    getFirstError(telefonoSchema.safeParse(value || '')),
  codigoSupervisor: (value: string): string | null =>
    getFirstError(codigoSupervisorSchema.safeParse(value)),
  validate: (
    fields: Record<
      string,
      { value: string; validator: (v: string) => string | null }
    >,
  ): string | null => {
    for (const key of Object.keys(fields)) {
      const error = fields[key].validator(fields[key].value);
      if (error) return error;
    }
    return null;
  },
};
