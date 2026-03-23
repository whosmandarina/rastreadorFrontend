import { Platform } from 'react-native';

/**
 * Sanitiza texto para prevenir XSS.
 * En web usa DOMPurify, en nativo escapa caracteres HTML peligrosos.
 */
export const sanitizeText = (input: string): string => {
    if (!input) return '';

    if (Platform.OS === 'web') {
        try {
            const DOMPurify = require('dompurify');
            // Solo texto plano, sin HTML
            return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        } catch {
            return escapeHtml(input);
        }
    }

    return escapeHtml(input);
};

/**
 * Escapa caracteres HTML peligrosos manualmente.
 */
export const escapeHtml = (input: string): string => {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Valida y sanitiza un nombre (solo letras, números, espacios y caracteres comunes).
 * Retorna null si es válido, o un mensaje de error si no.
 */
export const validateName = (input: string, fieldName = 'El campo'): string | null => {
    if (!input?.trim()) return `${fieldName} es obligatorio`;
    if (input.trim().length < 2) return `${fieldName} debe tener al menos 2 caracteres`;
    if (input.trim().length > 255) return `${fieldName} no puede superar 255 caracteres`;

    // Detectar intentos de inyección XSS — NO bloquear acentos ni caracteres latinos
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<img\s/i,
        /alert\s*\(/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i,
        /<\s*\/?\s*(script|iframe|object|embed|link|style|base|meta)/i,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            return `${fieldName} contiene caracteres no permitidos`;
        }
    }

    return null;
};