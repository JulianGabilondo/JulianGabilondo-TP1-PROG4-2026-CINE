import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Funcion } from '../../models/resena.model';

@Injectable({
  providedIn: 'root'
})
export class FuncionesService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerPorPelicula(peliculaId: number): Promise<Funcion[]> {
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .gte('fecha', hoy)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    return error ? [] : (data as Funcion[]);
  }

  // Ahora también trae restriccion_edad, necesario para validar la compra en checkout
  async obtenerPorId(funcionId: number): Promise<{
    funcion: Funcion;
    peliculaTitulo: string;
    restriccionEdad: number | null;
    salaId: number;
    salaNombre: string;
  } | null> {
    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*, peliculas(titulo, restriccion_edad), salas(id, nombre)')
      .eq('id', funcionId)
      .single();

    if (error || !data) return null;

    const { peliculas, salas, ...funcion } = data as any;

    return {
      funcion: funcion as Funcion,
      peliculaTitulo: peliculas?.titulo ?? '',
      restriccionEdad: peliculas?.restriccion_edad ?? null,
      salaId: salas?.id,
      salaNombre: salas?.nombre ?? ''
    };
  }
}