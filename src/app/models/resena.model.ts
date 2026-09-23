export interface Resena {
  id: number;
  pelicula_id: number;
  usuario_id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  // Se completa con un join contra `perfiles` al leer, no vive en la tabla `resenas`
  autor_nombre?: string;
}

export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_base: number;
  precio_vip: number;
}