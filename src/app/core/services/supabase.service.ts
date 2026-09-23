import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root' // singleton disponible en toda la app sin registrarlo en un módulo
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Se crea una única instancia del cliente que van a usar todos los servicios
    // específicos (PeliculasService, ComprasService, etc.) inyectando este service
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}