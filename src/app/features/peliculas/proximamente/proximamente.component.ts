import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService, Pelicula } from '../../../core/services/peliculas.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './proximamente.component.html',
  styleUrl: './proximamente.component.scss'
})
export class ProximamenteComponent implements OnInit {
  peliculas = signal<Pelicula[]>([]);
  cargandoAlerta = signal<number | null>(null); // id de película mientras se activa/desactiva

  constructor(
    private peliculasService: PeliculasService,
    public alertasService: AlertasService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    this.peliculas.set(await this.peliculasService.proximosEstrenos());
    await this.alertasService.cargarMisAlertas();
  }

  async toggleAlerta(peliculaId: number) {
    if (!this.authService.estaLogueado()) return;

    this.cargandoAlerta.set(peliculaId);

    if (this.alertasService.tieneAlerta(peliculaId)) {
      await this.alertasService.desactivar(peliculaId);
    } else {
      await this.alertasService.activar(peliculaId);
    }

    this.cargandoAlerta.set(null);
  }
}