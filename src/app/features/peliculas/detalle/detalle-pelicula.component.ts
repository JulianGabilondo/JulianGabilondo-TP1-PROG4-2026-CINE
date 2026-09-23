import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { PeliculasService, Pelicula } from '../../../core/services/peliculas.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { Resena, Funcion } from '../../../models/resena.model';

@Component({
  selector: 'app-detalle-pelicula',
  standalone: true,
  imports: [RouterLink, FormsModule, KeyValuePipe],
  templateUrl: './detalle-pelicula.component.html',
  styleUrl: './detalle-pelicula.component.scss'
})
export class DetallePeliculaComponent implements OnInit {
  pelicula = signal<Pelicula | null>(null);
  resenas = signal<Resena[]>([]);
  funciones = signal<Funcion[]>([]);

  nuevaEstrellas = signal(5);
  nuevoComentario = signal('');
  errorResena = signal<string | null>(null);

  funcionesPorFecha = computed(() => {
    const grupos = new Map<string, Funcion[]>();
    for (const f of this.funciones()) {
      const lista = grupos.get(f.fecha) ?? [];
      lista.push(f);
      grupos.set(f.fecha, lista);
    }
    return grupos;
  });

  // Renombrado sin ñ: Angular no parsea bien identificadores con tildes/ñ en los templates
  usuarioYaReseno = computed(() => {
    const userId = this.authService.perfil()?.id;
    return !!userId && this.resenas().some(r => r.usuario_id === userId);
  });

  constructor(
    private route: ActivatedRoute,
    private peliculasService: PeliculasService,
    private resenasService: ResenasService,
    private funcionesService: FuncionesService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = Number(params.get('id'));
      if (!id) return;

      this.pelicula.set(await this.peliculasService.obtenerPorId(id));
      this.resenas.set(await this.resenasService.obtenerPorPelicula(id));
      this.funciones.set(await this.funcionesService.obtenerPorPelicula(id));
    });
  }

  async enviarResena() {
    const peli = this.pelicula();
    if (!peli) return;

    const { error } = await this.resenasService.crear(
      peli.id,
      this.nuevaEstrellas(),
      this.nuevoComentario()
    );

    if (error) {
      this.errorResena.set(error);
      return;
    }

    this.errorResena.set(null);
    this.nuevoComentario.set('');
    this.resenas.set(await this.resenasService.obtenerPorPelicula(peli.id));
  }
}