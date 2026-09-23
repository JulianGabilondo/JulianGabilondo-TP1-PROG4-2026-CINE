import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CandyProducto, Combo } from '../../models/candy.model';

@Injectable({
  providedIn: 'root'
})
export class CandyService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerProductos(): Promise<CandyProducto[]> {
    const { data, error } = await this.supabaseService.client
      .from('candy_productos')
      .select('*')
      .eq('activo', true);

    return error ? [] : (data as CandyProducto[]);
  }

  async obtenerCombos(): Promise<Combo[]> {
    const { data, error } = await this.supabaseService.client
      .from('combos')
      .select('*')
      .eq('activo', true);

    return error ? [] : (data as Combo[]);
  }
}