// src/config.js

// Lee la variable de entorno de Vite para la URL de la API.
// Si no está definida (ej. en producción sin .env), usa una ruta relativa.
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Exporta la URL base del servidor (sin /api)
// Esto es útil para construir URLs a archivos de medios (imágenes, etc.)
export const serverBaseUrl = VITE_API_BASE_URL;

// Exporta la URL completa de la API
export const apiBaseUrl = `${VITE_API_BASE_URL}/api`;

console.log(`API Base URL: ${apiBaseUrl}`);
console.log(`Server Base URL: ${serverBaseUrl}`);
