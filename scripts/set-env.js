// Genera src/environments/environment.ts en tiempo de build, leyendo
// las variables de entorno que configuramos en el dashboard de Vercel.
// Así las claves de Supabase nunca quedan commiteadas en el repo.
const fs = require('fs');

const contenido = `export const environment = {
  production: true,
  supabaseUrl: '${process.env['SUPABASE_URL']}',
  supabaseKey: '${process.env['SUPABASE_KEY']}'
};
`;

fs.writeFileSync('src/environments/environment.ts', contenido);
fs.writeFileSync('src/environments/environment.development.ts', contenido);

console.log('environment.ts generado correctamente.');