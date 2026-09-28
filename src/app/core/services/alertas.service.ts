import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AlertaConPelicula } from '../../models/alerta.model';

@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  // Set de ids de película con alerta activa del usuario actual, para que
  // el botón "Avisarme" sepa en qué estado mostrarse sin pedir uno por uno
  private peliculasConAlertaSignal = signal<Set<number>>(new Set());
  peliculasConAlerta = this.peliculasConAlertaSignal.asReadonly();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async cargarMisAlertas(): Promise<void> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) {
      this.peliculasConAlertaSignal.set(new Set());
      return;
    }

    const { data } = await this.supabaseService.client
      .from('alertas_proximamente')
      .select('pelicula_id')
      .eq('usuario_id', usuarioId);

    this.peliculasConAlertaSignal.set(new Set((data ?? []).map((r: any) => r.pelicula_id)));
  }

  tieneAlerta(peliculaId: number): boolean {
    return this.peliculasConAlertaSignal().has(peliculaId);
  }

  async activar(peliculaId: number): Promise<{ error: string | null }> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return { error: 'Iniciá sesión para activar una alerta.' };

    const { error } = await this.supabaseService.client
      .from('alertas_proximamente')
      .insert({ usuario_id: usuarioId, pelicula_id: peliculaId });

    if (!error) {
      this.peliculasConAlertaSignal.update(set => new Set(set).add(peliculaId));
    }

    return { error: error?.message ?? null };
  }

  async desactivar(peliculaId: number): Promise<{ error: string | null }> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return { error: null };

    const { error } = await this.supabaseService.client
      .from('alertas_proximamente')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId);

    if (!error) {
      this.peliculasConAlertaSignal.update(set => {
        const nuevo = new Set(set);
        nuevo.delete(peliculaId);
        return nuevo;
      });
    }

    return { error: error?.message ?? null };
  }

  // Todas las alertas del usuario, con datos de la película, para la pantalla
  // de "Próximamente" y para el contador de notificaciones pendientes
  async obtenerMisAlertasConDetalle(): Promise<AlertaConPelicula[]> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return [];

    const { data, error } = await this.supabaseService.client
      .from('alertas_proximamente')
      .select('id, notificado, peliculas ( id, titulo, imagen_url, fecha_estreno )')
      .eq('usuario_id', usuarioId);

    if (error || !data) return [];

    return (data as any[]).map(a => ({
      id: a.id,
      peliculaId: a.peliculas.id,
      titulo: a.peliculas.titulo,
      imagenUrl: a.peliculas.imagen_url,
      fechaEstreno: a.peliculas.fecha_estreno,
      notificado: a.notificado
    }));
  }

  // Se llama desde el admin al crear la primera función de una película:
  // marca como "notificado" a todos los usuarios que tenían alerta activa,
  // simulando el aviso (no hay envío de mail/push real en el alcance de este TP)
  async marcarNotificadasPorPelicula(peliculaId: number): Promise<void> {
    await this.supabaseService.client
      .from('alertas_proximamente')
      .update({ notificado: true })
      .eq('pelicula_id', peliculaId)
      .eq('notificado', false);
  }
}