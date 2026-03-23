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
  .min(1, { message: 'name is required' })
  .min(VALIDATION_LIMITS.nameMin, {
    message: `name must have at least ${VALIDATION_LIMITS.nameMin} characters`,
  })
  .max(VALIDATION_LIMITS.nameMax, {
    message: `name must have at most ${VALIDATION_LIMITS.nameMax} characters`,
  })
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, {
    message: 'name must contain letters and spaces only',
  });

const correoSchema = z
  .string()
  .trim()
  .min(1, { message: 'email is required' })
  .max(VALIDATION_LIMITS.emailMax, {
    message: `email must have at most ${VALIDATION_LIMITS.emailMax} characters`,
  })
  .email({ message: 'email must be valid' });

const passwordSchema = z
  .string()
  .min(1, { message: 'password is required' })
  .min(VALIDATION_LIMITS.passwordMin, {
    message: `password must have at least ${VALIDATION_LIMITS.passwordMin} characters`,
  })
  .max(VALIDATION_LIMITS.passwordMax, {
    message: `password must have at most ${VALIDATION_LIMITS.passwordMax} characters`,
  });

const telefonoSchema = z
  .string()
  .refine(
    (value) => {
      if (!value) return true;
      return /^[0-9+\s\-()]+$/.test(value);
    },
    { message: 'phone must contain valid characters only' },
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
      message: `phone must have between ${VALIDATION_LIMITS.phoneMinDigits} and ${VALIDATION_LIMITS.phoneMaxDigits} digits`,
    },
  );

const codigoSupervisorSchema = z
  .string()
  .trim()
  .min(1, { message: 'supervisor code is required' })
  .max(VALIDATION_LIMITS.supervisorCodeMax, {
    message: `supervisor code must have at most ${VALIDATION_LIMITS.supervisorCodeMax} digits`,
  })
  .regex(/^\d+$/, { message: 'supervisor code must be numeric' })
  .refine((value) => Number(value) > 0, {
    message: 'supervisor code must be greater than 0',
  });

const getFirstError = (result: z.SafeParseReturnType<string, string>) => {
  if (result.success) return null;
  return result.error.issues[0]?.message || 'invalid value';
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
