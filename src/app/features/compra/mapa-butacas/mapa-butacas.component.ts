import { Component, OnInit, OnDestroy, signal, computed, input, output } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { ButacasService } from '../../../core/services/butacas.service';
import { ButacaConEstado } from '../../../models/butaca.model';

@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
  imports: [KeyValuePipe],
  templateUrl: './mapa-butacas.component.html',
  styleUrl: './mapa-butacas.component.scss'
})
export class MapaButacasComponent implements OnInit, OnDestroy {
  funcionId = input.required<number>();
  salaId = input.required<number>();
  precioBase = input<number>(0);
  precioVip = input<number>(0);

  seleccionCambio = output<ButacaConEstado[]>();

  private seleccionadas = signal<ButacaConEstado[]>([]);

  filasAgrupadas = computed(() => {
    const grupos = new Map<string, ButacaConEstado[]>();
    for (const b of this.butacasService.butacasConEstado()) {
      const lista = grupos.get(b.fila) ?? [];
      lista.push(b);
      grupos.set(b.fila, lista);
    }
    return new Map([...grupos.entries()].sort());
  });

  totalSeleccion = computed(() =>
    this.seleccionadas().reduce((suma, b) => suma + this.precioDeButaca(b), 0)
  );

  constructor(public butacasService: ButacasService) {}

  async ngOnInit() {
    await this.butacasService.iniciar(this.funcionId(), this.salaId());
  }

  ngOnDestroy() {
    this.butacasService.liberarTodasMisReservas(this.funcionId());
    this.butacasService.desuscribirse();
  }

  async onClickButaca(butaca: ButacaConEstado) {
    if (butaca.estado === 'vendida' || butaca.estado === 'reservada') {
      return;
    }

    if (butaca.estado === 'mia') {
      await this.butacasService.liberar(this.funcionId(), butaca.id);
      this.seleccionadas.update(lista => lista.filter(b => b.id !== butaca.id));
    } else {
      const { error } = await this.butacasService.reservar(this.funcionId(), butaca.id);
      if (error) {
        alert(error);
        return;
      }
      this.seleccionadas.update(lista => [...lista, butaca]);
    }

    this.seleccionCambio.emit(this.seleccionadas());
  }

  precioDeButaca(butaca: ButacaConEstado): number {
    return butaca.tipo === 'vip' ? this.precioVip() : this.precioBase();
  }
}