import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca, ButacaConEstado } from '../../models/butaca.model';

const DURACION_RESERVA_MS = 5 * 60 * 1000; // 5 minutos para completar la compra

@Injectable({
  providedIn: 'root'
})
export class ButacasService {
  private sessionId = crypto.randomUUID();

  private butacasSalaSignal = signal<Butaca[]>([]);
  private vendidasSignal = signal<Set<number>>(new Set());     
  private misReservasSignal = signal<Set<number>>(new Set());

  butacasConEstado = computed<ButacaConEstado[]>(() => {
    const vendidas = this.vendidasSignal();
    const misReservas = this.misReservasSignal();

    return this.butacasSalaSignal().map(b => {
      let estado: ButacaConEstado['estado'] = 'libre';

      if (vendidas.has(b.id)) {
        estado = 'vendida';
      } else if (misReservas.has(b.id)) {
        estado = 'mia';
      }

      return { ...b, estado };
    });
  });

  private canal: ReturnType<SupabaseService['client']['channel']> | null = null;

  constructor(private supabaseService: SupabaseService) {}

  async iniciar(funcionId: number, salaId: number) {
    await this.cargarButacasDeSala(salaId);
    await this.cargarVendidas(funcionId);
    await this.cargarMisReservas(funcionId);
    this.suscribirseRealtime(funcionId);
  }

  private async cargarButacasDeSala(salaId: number) {
    const { data } = await this.supabaseService.client
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('numero');

    this.butacasSalaSignal.set((data ?? []) as Butaca[]);
  }

  private async cargarVendidas(funcionId: number) {
    const { data } = await this.supabaseService.client
      .from('entrada_butacas')
      .select('butaca_id')
      .eq('funcion_id', funcionId);

    this.vendidasSignal.set(new Set((data ?? []).map(r => r.butaca_id)));
  }

  private async cargarMisReservas(funcionId: number) {
    const { data } = await this.supabaseService.client
      .from('reservas_temporales')
      .select('butaca_id')
      .eq('funcion_id', funcionId)
      .eq('session_id', this.sessionId)
      .gt('expires_at', new Date().toISOString());

    this.misReservasSignal.set(new Set((data ?? []).map(r => r.butaca_id)));
  }

  private suscribirseRealtime(funcionId: number) {
    this.canal = this.supabaseService.client
      .channel(`funcion-${funcionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entrada_butacas', filter: `funcion_id=eq.${funcionId}` },
        payload => {
          const butacaId = (payload.new as any).butaca_id;
          this.vendidasSignal.update(set => new Set(set).add(butacaId));
        }
      )
      .subscribe();
  }

  async reservar(funcionId: number, butacaId: number): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('reservas_temporales')
      .insert({
        funcion_id: funcionId,
        butaca_id: butacaId,
        session_id: this.sessionId,
        expires_at: new Date(Date.now() + DURACION_RESERVA_MS).toISOString()
      });

    if (error) {
      return { error: 'Esa butaca acaba de ser tomada por otra persona' };
    }

    this.misReservasSignal.update(set => new Set(set).add(butacaId));
    return { error: null };
  }

  async liberar(funcionId: number, butacaId: number) {
    const { error } = await this.supabaseService.client
      .from('reservas_temporales')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('butaca_id', butacaId)
      .eq('session_id', this.sessionId);

    if (!error) {
      this.misReservasSignal.update(set => {
        const nuevo = new Set(set);
        nuevo.delete(butacaId);
        return nuevo;
      });
    }
  }

  async liberarTodasMisReservas(funcionId: number) {
    await this.supabaseService.client
      .from('reservas_temporales')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('session_id', this.sessionId);

    this.misReservasSignal.set(new Set());
  }

  getSessionId(): string {
    return this.sessionId;
  }

  desuscribirse() {
    if (this.canal) {
      this.supabaseService.client.removeChannel(this.canal);
      this.canal = null;
    }
  }
}