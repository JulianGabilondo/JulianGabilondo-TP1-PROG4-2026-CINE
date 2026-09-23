import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface PeliculaVista {
  peliculaId: number;
  titulo: string;
  imagenUrl: string;
  fechaVista: string;
  miCalificacion: number | null; // estrellas que dejó el usuario, si dejó reseña
}

@Injectable({
  providedIn: 'root'
})
export class MisPeliculasService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // "Vio" una película = tiene al menos una entrada validada (entró al cine) para una función de esa película.
  // Se cruza con reseñas propias para mostrar su calificación si ya la puso.
  async obtenerMisPeliculas(): Promise<PeliculaVista[]> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return [];

    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select(`
        created_at,
        funciones ( fecha, peliculas ( id, titulo, imagen_url ) )
      `)
      .eq('usuario_id', usuarioId)
      .eq('qr_validado', true);

    if (error || !data) return [];

    const { data: misResenas } = await this.supabaseService.client
      .from('resenas')
      .select('pelicula_id, estrellas')
      .eq('usuario_id', usuarioId);

    const mapaCalificaciones = new Map<number, number>();
    (misResenas ?? []).forEach((r: any) => mapaCalificaciones.set(r.pelicula_id, r.estrellas));

    // Dedup por película: si vio la misma película dos veces, se muestra una sola vez
    // con la fecha más reciente
    const vistas = new Map<number, PeliculaVista>();

    for (const e of data as any[]) {
      const peli = e.funciones.peliculas;
      const existente = vistas.get(peli.id);

      if (!existente || e.funciones.fecha > existente.fechaVista) {
        vistas.set(peli.id, {
          peliculaId: peli.id,
          titulo: peli.titulo,
          imagenUrl: peli.imagen_url,
          fechaVista: e.funciones.fecha,
          miCalificacion: mapaCalificaciones.get(peli.id) ?? null
        });
      }
    }

    return [...vistas.values()].sort((a, b) => b.fechaVista.localeCompare(a.fechaVista));
  }
}