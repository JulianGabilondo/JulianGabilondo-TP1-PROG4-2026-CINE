import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { SalasService } from './salas.service';
import { Sala } from '../../models/sala.model';

export interface DatosNuevaFuncion {
  peliculaId: number;
  duracionMinutos: number;
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
    private salasService: SalasService
  ) {}

  async obtenerSalas(): Promise<Sala[]> {
    return this.salasService.obtenerTodas();
  }

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

  private calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
    const [h, m] = horaInicio.split(':').map(Number);
    const inicioEnMinutos = h * 60 + m;
    const finEnMinutos = inicioEnMinutos + duracionMinutos + MARGEN_MINUTOS;

    const horaFin = Math.floor(finEnMinutos / 60) % 24;
    const minutoFin = finEnMinutos % 60;

    return `${String(horaFin).padStart(2, '0')}:${String(minutoFin).padStart(2, '0')}`;
  }

  private async buscarSalaLibre(fecha: string, horaInicio: string, horaFin: string): Promise<Sala | null> {
    const salas = await this.obtenerSalas();

    const { data: funcionesDelDia } = await this.supabaseService.client
      .from('funciones')
      .select('sala_id, hora_inicio, hora_fin')
      .eq('fecha', fecha);

    for (const sala of salas) {
      const ocupaciones = (funcionesDelDia ?? []).filter(f => f.sala_id === sala.id);

      const haySolapamiento = ocupaciones.some(
        f => horaInicio < f.hora_fin && horaFin > f.hora_inicio
      );

      if (!haySolapamiento) {
        return sala;
      }
    }

    return null;
  }

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

  private async registrarLog(accion: string, detalle: Record<string, unknown>) {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return;

    await this.supabaseService.client
      .from('log_actividad')
      .insert({ usuario_id: usuarioId, accion, detalle });
  }
}