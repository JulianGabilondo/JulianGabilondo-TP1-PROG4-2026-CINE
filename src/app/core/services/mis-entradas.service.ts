import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface EntradaUsuario {
  id: number;
  total: number;
  cancelada: boolean;
  qr_validado: boolean;
  created_at: string;
  peliculaTitulo: string;
  peliculaImagen: string;
  peliculaId: number;
  fecha: string;
  horaInicio: string;
  butacas: string[];
  fechaHoraFuncion: Date; // combinado, para calcular las 2hs de margen de cancelación
}

const HORAS_LIMITE_CANCELACION = 2;

@Injectable({
  providedIn: 'root'
})
export class MisEntradasService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async obtenerMisEntradas(): Promise<EntradaUsuario[]> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return [];

    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select(`
        id, total, cancelada, qr_validado, created_at,
        funciones ( fecha, hora_inicio, peliculas ( id, titulo, imagen_url ) ),
        entrada_butacas ( butacas ( fila, numero ) )
      `)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map(e => {
      const funcion = e.funciones;
      const fechaHoraFuncion = new Date(`${funcion.fecha}T${funcion.hora_inicio}`);

      return {
        id: e.id,
        total: e.total,
        cancelada: e.cancelada,
        qr_validado: e.qr_validado,
        created_at: e.created_at,
        peliculaTitulo: funcion.peliculas.titulo,
        peliculaImagen: funcion.peliculas.imagen_url,
        peliculaId: funcion.peliculas.id,
        fecha: funcion.fecha,
        horaInicio: funcion.hora_inicio,
        butacas: (e.entrada_butacas ?? []).map((eb: any) => `${eb.butacas.fila}${eb.butacas.numero}`),
        fechaHoraFuncion
      };
    });
  }

  // Se puede cancelar si faltan más de 2 horas para la función, no está cancelada,
  // y no fue validada todavía (no tiene sentido cancelar una entrada ya usada)
  puedeCancelarse(entrada: EntradaUsuario): boolean {
    if (entrada.cancelada || entrada.qr_validado) return false;

    const ahora = new Date();
    const diferenciaHoras = (entrada.fechaHoraFuncion.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    return diferenciaHoras >= HORAS_LIMITE_CANCELACION;
  }

  // Cancela y acredita el total como crédito en el perfil (no devuelve dinero, según pidió el cliente)
  async cancelar(entrada: EntradaUsuario): Promise<{ error: string | null }> {
    if (!this.puedeCancelarse(entrada)) {
      return { error: 'Esta entrada ya no se puede cancelar (menos de 2hs para la función, o ya fue usada).' };
    }

    const { error: errorCancelacion } = await this.supabaseService.client
      .from('entradas')
      .update({ cancelada: true })
      .eq('id', entrada.id);

    if (errorCancelacion) {
      return { error: errorCancelacion.message };
    }

    const perfil = this.authService.perfil();
    if (perfil) {
      await this.supabaseService.client
        .from('perfiles')
        .update({ credito_disponible: perfil.credito_disponible + entrada.total })
        .eq('id', perfil.id);
    }

    return { error: null };
  }
}