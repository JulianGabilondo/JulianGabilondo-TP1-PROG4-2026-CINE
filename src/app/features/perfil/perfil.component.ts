import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { MisEntradasService, EntradaUsuario } from '../../core/services/mis-entradas.service';
import { MisPeliculasService, PeliculaVista } from '../../core/services/mis-peliculas.service';

type PestanaPerfil = 'entradas' | 'peliculas';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit {
  pestanaActiva = signal<PestanaPerfil>('entradas');

  misEntradas = signal<EntradaUsuario[]>([]);
  misPeliculas = signal<PeliculaVista[]>([]);

  cancelandoId = signal<number | null>(null);
  mensaje = signal<string | null>(null);

  constructor(
    public authService: AuthService,
    private misEntradasService: MisEntradasService,
    private misPeliculasService: MisPeliculasService
  ) {}

  async ngOnInit() {
    await this.cargarEntradas();
    this.misPeliculas.set(await this.misPeliculasService.obtenerMisPeliculas());
  }

  private async cargarEntradas() {
    this.misEntradas.set(await this.misEntradasService.obtenerMisEntradas());
  }

  cambiarPestana(p: PestanaPerfil) {
    this.pestanaActiva.set(p);
  }

  puedeCancelarse(entrada: EntradaUsuario): boolean {
    return this.misEntradasService.puedeCancelarse(entrada);
  }

  async cancelar(entrada: EntradaUsuario) {
    if (!confirm('¿Cancelar esta entrada? El importe quedará como crédito en tu cuenta.')) return;

    this.cancelandoId.set(entrada.id);
    const { error } = await this.misEntradasService.cancelar(entrada);
    this.cancelandoId.set(null);

    if (error) {
      this.mensaje.set(error);
      return;
    }

    this.mensaje.set('Entrada cancelada. El crédito ya está disponible en tu cuenta.');
    await this.cargarEntradas();
  }

  cerrarSesion() {
    this.authService.logout();
  }
}