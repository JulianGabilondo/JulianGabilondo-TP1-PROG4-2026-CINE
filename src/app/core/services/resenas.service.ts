import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Resena } from '../../models/resena.model';

@Injectable({
  providedIn: 'root'
})
export class ResenasService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerPorPelicula(peliculaId: number): Promise<Resena[]> {
    // Join contra `perfiles` para mostrar el nombre del autor sin exponer más
    // datos suyos (RLS igual protege perfiles, pero acá pedimos solo lo necesario)
    const { data, error } = await this.supabaseService.client
      .from('resenas')
      .select('*, perfiles(nombre)')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      ...r,
      autor_nombre: r.perfiles?.nombre ?? 'Usuario'
    }));
  }

  // El UNIQUE(pelicula_id, usuario_id) de la tabla hace que esto falle
  // si el usuario ya reseñó la película — el service solo propaga el error
  async crear(peliculaId: number, estrellas: number, comentario: string): Promise<{ error: string | null }> {
    const { data: { user } } = await this.supabaseService.client.auth.getUser();
    if (!user) return { error: 'Tenés que iniciar sesión para dejar una reseña' };

    const { error } = await this.supabaseService.client
      .from('resenas')
      .insert({
        pelicula_id: peliculaId,
        usuario_id: user.id,
        estrellas,
        comentario
      });

    return { error: error?.message ?? null };
  }
}