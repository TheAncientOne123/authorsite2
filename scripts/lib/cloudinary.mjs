/**
 * Cloudinary SDK — solo para scripts Node (subida, migración).
 * No importar desde componentes React (Docusaurus / navegador).
 */
import { v2 as cloudinary } from 'cloudinary';

function requireEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(
      `Falta ${name}. Copia .env.example a .env y completa las credenciales de Cloudinary.`,
    );
  }
  return value.trim();
}

cloudinary.config({
  cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
  api_key: requireEnv('CLOUDINARY_API_KEY'),
  api_secret: requireEnv('CLOUDINARY_API_SECRET'),
});

/** Nombre de la nube (público). Útil para armar URLs de entrega sin el SDK. */
export const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();

export { cloudinary };

/**
 * URL de entrega optimizada (no requiere api_secret en runtime del sitio).
 * @param {string} publicId
 * @param {import('cloudinary').TransformationOptions | Record<string, unknown>} [options]
 */
export function deliveryUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
    ...options,
  });
}
