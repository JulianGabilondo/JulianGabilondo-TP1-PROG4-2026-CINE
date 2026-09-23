import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Sala } from '../../models/sala.model';

@Injectable({
  providedIn: 'root'
})
export class SalasService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerTodas(): Promise<Sala[]> {
    const { data, error } = await this.supabaseService.client
      .from('salas')
      .select('*')
      .order('nombre');

    return error ? [] : (data as Sala[]);
  }

  // Cantidad de butacas por tipo, útil para mostrar en el admin
  // (ej: "Sala 1 — 380 normales, 60 accesibles, 24 VIP")
  async contarButacasPorTipo(salaId: number): Promise<Record<string, number>> {
    const { data, error } = await this.supabaseService.client
      .from('butacas')
      .select('tipo')
      .eq('sala_id', salaId);

    if (error || !data) return {};

    return data.reduce((acc: Record<string, number>, b: any) => {
      acc[b.tipo] = (acc[b.tipo] ?? 0) + 1;
      return acc;
    }, {});
  }
}