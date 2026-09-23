import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Genero {
  id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class GenerosService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerTodos(): Promise<Genero[]> {
    const { data, error } = await this.supabaseService.client
      .from('generos')
      .select('*')
      .order('nombre');

    return error ? [] : (data as Genero[]);
  }

  // Crea el género si no existe (usado desde el admin al tipear uno nuevo)
  async obtenerOCrear(nombre: string): Promise<Genero | null> {
    const { data: existente } = await this.supabaseService.client
      .from('generos')
      .select('*')
      .ilike('nombre', nombre)
      .maybeSingle();

    if (existente) return existente as Genero;

    const { data, error } = await this.supabaseService.client
      .from('generos')
      .insert({ nombre })
      .select()
      .single();

    return error ? null : (data as Genero);
  }
}