/**
 * Prueba de conexión con Cloudinary (equivalente al index.js del panel).
 * Uso: npm run cloudinary:demo
 */
import { cloudinary, deliveryUrl } from './lib/cloudinary.mjs';

const uploadResult = await cloudinary.uploader
  .upload('https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
    public_id: 'authorsite-demo-shoes',
    overwrite: true,
  })
  .catch((error) => {
    console.error('Error al subir:', error);
    process.exit(1);
  });

console.log('Subida OK:', uploadResult.secure_url);

const optimizeUrl = deliveryUrl('authorsite-demo-shoes');
console.log('URL optimizada:', optimizeUrl);

const autoCropUrl = deliveryUrl('authorsite-demo-shoes', {
  crop: 'auto',
  gravity: 'auto',
  width: 500,
  height: 500,
});
console.log('URL recorte:', autoCropUrl);
