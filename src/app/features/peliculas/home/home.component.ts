import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PeliculasService, Pelicula } from '../../../core/services/peliculas.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  busqueda = signal('');
  generoSeleccionado = signal<string | null>(null);

  // Computed: se recalcula solo cuando cambia busqueda, generoSeleccionado,
  // o el catálogo del service — no hace falta un método "aplicarFiltros" manual
  resultados = computed(() =>
    this.peliculasService.buscar(this.busqueda(), this.generoSeleccionado())
  );

  top3 = computed(() => this.peliculasService.top3MasVendidas());

  // Lista de géneros disponibles para el <select> del filtro,
  // derivada de las películas ya cargadas (sin pegarle a la tabla `generos`)
  generosDisponibles = computed(() => {
    const todos = this.peliculasService.peliculas().flatMap(p => p.generos ?? []);
    return [...new Set(todos)].sort();
  });

  constructor(private peliculasService: PeliculasService) {}

  async ngOnInit() {
    await this.peliculasService.cargarCatalogo();
  }
}