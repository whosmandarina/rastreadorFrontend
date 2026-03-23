export const geoValidators = {
    nombre: (value: string): string | null => {
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        if (value.trim().length > 50) return 'El nombre no puede superar 50 caracteres';
        const dangerous = /<script|javascript:|on\w+\s*=|<iframe|alert\s*\(|eval\s*\(/i;
        if (dangerous.test(value)) return 'El nombre contiene caracteres no permitidos';
        return null;
    },

    latitud: (value: string): string | null => {
        if (!value.trim()) return 'La latitud es obligatoria';
        const num = parseFloat(value);
        if (isNaN(num)) return 'La latitud debe ser un número';
        if (num < -90 || num > 90) return 'La latitud debe estar entre -90 y 90';
        return null;
    },

    longitud: (value: string): string | null => {
        if (!value.trim()) return 'La longitud es obligatoria';
        const num = parseFloat(value);
        if (isNaN(num)) return 'La longitud debe ser un número';
        if (num < -180 || num > 180) return 'La longitud debe estar entre -180 y 180';
        return null;
    },

    radio: (value: string): string | null => {
        if (!value.trim()) return 'El radio es obligatorio';
        const num = parseFloat(value);
        if (isNaN(num)) return 'El radio debe ser un número';
        if (num <= 0) return 'El radio debe ser mayor a 0 metros';
        if (num > 50000) return 'El radio no puede superar 50,000 metros (50 km)';
        return null;
    },

    puntoPoligono: (lat: string, lng: string, index: number): string | null => {
        const latErr = geoValidators.latitud(lat);
        if (latErr) return `Punto ${index + 1}: ${latErr}`;
        const lngErr = geoValidators.longitud(lng);
        if (lngErr) return `Punto ${index + 1}: ${lngErr}`;
        return null;
    },
};