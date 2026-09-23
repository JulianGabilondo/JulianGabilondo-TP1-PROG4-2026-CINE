import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca, ButacaConEstado } from '../../models/butaca.model';

const DURACION_RESERVA_MS = 5 * 60 * 1000; // 5 minutos para completar la compra

@Injectable({
  providedIn: 'root'
})
export class ButacasService {
  // Id de sesión propio del browser, para distinguir "mis" reservas de las de otros
  private sessionId = crypto.randomUUID();

  private butacasSalaSignal = signal<Butaca[]>([]);
  private vendidasSignal = signal<Set<number>>(new Set());       // ids de butaca ya compradas
  private reservadasSignal = signal<Map<number, string>>(new Map()); // butaca_id -> session_id que la reservó

  // Combina las 3 fuentes en el estado final que consume el componente del mapa
  butacasConEstado = computed<ButacaConEstado[]>(() => {
    const vendidas = this.vendidasSignal();
    const reservadas = this.reservadasSignal();

    return this.butacasSalaSignal().map(b => {
      let estado: ButacaConEstado['estado'] = 'libre';

      if (vendidas.has(b.id)) {
        estado = 'vendida';
      } else if (reservadas.has(b.id)) {
        estado = reservadas.get(b.id) === this.sessionId ? 'mia' : 'reservada';
      }

      return { ...b, estado };
    });
  });

  private canal: ReturnType<SupabaseService['client']['channel']> | null = null;

  constructor(private supabaseService: SupabaseService) {}

  // Se llama al entrar a la pantalla de selección de butacas para una función
  async iniciar(funcionId: number, salaId: number) {
    await this.cargarButacasDeSala(salaId);
    await this.cargarVendidas(funcionId);
    await this.cargarReservas(funcionId);
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

  private async cargarReservas(funcionId: number) {
    // Solo trae reservas todavía no vencidas
    const { data } = await this.supabaseService.client
      .from('reservas_temporales')
      .select('butaca_id, session_id')
      .eq('funcion_id', funcionId)
      .gt('expires_at', new Date().toISOString());

    const mapa = new Map<number, string>();
    (data ?? []).forEach(r => mapa.set(r.butaca_id, r.session_id));
    this.reservadasSignal.set(mapa);
  }

  // Escucha cambios en vivo: reservas nuevas/borradas de OTROS usuarios,
  // y compras confirmadas, para que el mapa se actualice sin recargar la página
  private suscribirseRealtime(funcionId: number) {
    this.canal = this.supabaseService.client
      .channel(`funcion-${funcionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas_temporales', filter: `funcion_id=eq.${funcionId}` },
        payload => this.procesarCambioReserva(payload)
      )
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

  private procesarCambioReserva(payload: any) {
    this.reservadasSignal.update(mapa => {
      const nuevo = new Map(mapa);
      if (payload.eventType === 'DELETE') {
        nuevo.delete(payload.old.butaca_id);
      } else {
        nuevo.set(payload.new.butaca_id, payload.new.session_id);
      }
      return nuevo;
    });
  }

  // El usuario toca una butaca libre: se intenta reservar.
  // El UNIQUE(funcion_id, butaca_id) hace que esto falle solo si alguien
  // la reservó una fracción de segundo antes (condición de carrera real).
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

    return { error: null };
  }

  // El usuario deselecciona una butaca antes de confirmar
  async liberar(funcionId: number, butacaId: number) {
    await this.supabaseService.client
      .from('reservas_temporales')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('butaca_id', butacaId)
      .eq('session_id', this.sessionId); // solo puede liberar sus propias reservas
  }

  // Se llama al confirmar el pago o al salir de la pantalla sin comprar
  async liberarTodasMisReservas(funcionId: number) {
    await this.supabaseService.client
      .from('reservas_temporales')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('session_id', this.sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Se llama al salir de la pantalla de compra, para no dejar el canal escuchando de más
  desuscribirse() {
    if (this.canal) {
      this.supabaseService.client.removeChannel(this.canal);
      this.canal = null;
    }
  }
}