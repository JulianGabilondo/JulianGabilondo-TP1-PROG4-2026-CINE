import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { SalasService } from './salas.service';
import { AlertasService } from './alertas.service';
import { Sala } from '../../models/sala.model';

export interface DatosNuevaFuncion {
  peliculaId: number;
  duracionMinutos: number; // viene de la película, se usa para calcular hora_fin
  fecha: string;
  horaInicio: string;
  precioBase: number;
  precioVip: number;
}

export interface FuncionAdmin {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_base: number;
  precio_vip: number;
  pelicula_id: number;
  pelicula_titulo: string;
  sala_id: number;
  sala_nombre: string;
}

const MARGEN_MINUTOS = 30;

@Injectable({
  providedIn: 'root'
})
export class FuncionesAdminService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private salasService: SalasService,
    private alertasService: AlertasService
  ) {}

  // Delegado a SalasService en vez de duplicar la query acá adentro
  async obtenerSalas(): Promise<Sala[]> {
    return this.salasService.obtenerTodas();
  }

  // Lista las funciones futuras con título de película y nombre de sala
  // ya resueltos, usando la vista `vista_funciones_admin`
  async listar(): Promise<FuncionAdmin[]> {
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabaseService.client
      .from('vista_funciones_admin')
      .select('*')
      .gte('fecha', hoy)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    return error ? [] : (data as FuncionAdmin[]);
  }

  // Calcula la hora de fin sumando la duración de la película + el margen de 30 min
  private calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
    const [h, m] = horaInicio.split(':').map(Number);
    const inicioEnMinutos = h * 60 + m;
    const finEnMinutos = inicioEnMinutos + duracionMinutos + MARGEN_MINUTOS;

    const horaFin = Math.floor(finEnMinutos / 60) % 24;
    const minutoFin = finEnMinutos % 60;

    return `${String(horaFin).padStart(2, '0')}:${String(minutoFin).padStart(2, '0')}`;
  }

  // Busca la primera sala libre para el rango [horaInicio, horaFin] en esa fecha.
  // "Libre" significa: ninguna función existente en esa sala se solapa con el nuevo rango,
  // considerando que cada función ya tiene su propio margen incluido en su hora_fin guardada.
  private async buscarSalaLibre(fecha: string, horaInicio: string, horaFin: string): Promise<Sala | null> {
    const salas = await this.obtenerSalas();

    // Traemos TODAS las funciones de ese día de una sola vez, en vez de consultar sala por sala
    const { data: funcionesDelDia } = await this.supabaseService.client
      .from('funciones')
      .select('sala_id, hora_inicio, hora_fin')
      .eq('fecha', fecha);

    for (const sala of salas) {
      const ocupaciones = (funcionesDelDia ?? []).filter(f => f.sala_id === sala.id);

      // Dos rangos se solapan si uno empieza antes de que el otro termine, en ambos sentidos.
      // Si NINGUNA ocupación existente se solapa con el nuevo rango, la sala está libre.
      const haySolapamiento = ocupaciones.some(
        f => horaInicio < f.hora_fin && horaFin > f.hora_inicio
      );

      if (!haySolapamiento) {
        return sala;
      }
    }

    return null; // no hay ninguna sala libre en ese horario
  }

  // Crea la función asignando sala automáticamente. Devuelve error si no hay
  // ninguna sala disponible en ese horario (el admin tiene que elegir otro).
  async crearFuncion(datos: DatosNuevaFuncion): Promise<{ error: string | null }> {
    const horaFin = this.calcularHoraFin(datos.horaInicio, datos.duracionMinutos);
    const salaLibre = await this.buscarSalaLibre(datos.fecha, datos.horaInicio, horaFin);

    if (!salaLibre) {
      return { error: 'No hay salas disponibles en ese horario. Probá con otro horario.' };
    }

    const { error } = await this.supabaseService.client
      .from('funciones')
      .insert({
        pelicula_id: datos.peliculaId,
        sala_id: salaLibre.id,
        fecha: datos.fecha,
        hora_inicio: datos.horaInicio,
        hora_fin: horaFin,
        precio_base: datos.precioBase,
        precio_vip: datos.precioVip
      });

    if (error) {
      return { error: error.message };
    }

    // Marca como "notificadas" las alertas de "Próximamente" que tenían
    // usuarios esperando esta película, ahora que ya tiene función cargada
    await this.alertasService.marcarNotificadasPorPelicula(datos.peliculaId);

    await this.registrarLog('crear_funcion', {
      pelicula_id: datos.peliculaId,
      sala_id: salaLibre.id,
      fecha: datos.fecha,
      hora: datos.horaInicio
    });

    return { error: null };
  }

  async actualizarPrecio(funcionId: number, precioBase: number, precioVip: number): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('funciones')
      .update({ precio_base: precioBase, precio_vip: precioVip })
      .eq('id', funcionId);

    if (!error) {
      await this.registrarLog('modificar_precio', {
        funcion_id: funcionId,
        precio_base: precioBase,
        precio_vip: precioVip
      });
    }

    return { error: error?.message ?? null };
  }

  // Log de actividad, pedido explícitamente por el cliente en los emails
  private async registrarLog(accion: string, detalle: Record<string, unknown>) {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return;

    await this.supabaseService.client
      .from('log_actividad')
      .insert({ usuario_id: usuarioId, accion, detalle });
  }
}