// Genera src/environments/environment.ts en tiempo de build, leyendo
// las variables de entorno configuradas en el dashboard de Vercel.
// Así las claves de Supabase nunca quedan commiteadas en el repo.
const fs = require('fs');
const path = require('path');

const carpeta = path.join('src', 'environments');

// La carpeta puede no existir en el clon del repo: como sus archivos están
// en .gitignore, Git nunca subió el directorio en sí (no versiona carpetas
// vacías). La creamos si hace falta antes de escribir adentro.
if (!fs.existsSync(carpeta)) {
  fs.mkdirSync(carpeta, { recursive: true });
}

const contenido = `export const environment = {
  production: true,
  supabaseUrl: '${process.env['SUPABASE_URL']}',
  supabaseKey: '${process.env['SUPABASE_KEY']}'
};
`;

fs.writeFileSync(path.join(carpeta, 'environment.ts'), contenido);
fs.writeFileSync(path.join(carpeta, 'environment.development.ts'), contenido);

console.log('environment.ts generado correctamente.');