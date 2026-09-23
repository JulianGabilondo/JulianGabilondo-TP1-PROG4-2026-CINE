import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import {
  ReportesService,
  FacturacionDia,
  PeliculaMasVista,
  ProductoMasVendido
} from '../../../core/services/reportes.service';
import { LogService, LogEntry } from '../../../core/services/log.service';
import { DatePipe, JsonPipe } from '@angular/common';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [DatePipe, JsonPipe],
  templateUrl: './admin-reportes.component.html',
  styleUrl: './admin-reportes.component.scss'
})
export class AdminReportesComponent implements OnInit, AfterViewInit {
  facturacion = signal<FacturacionDia[]>([]);
  peliculasMasVistas = signal<PeliculaMasVista[]>([]);
  productosMasVendidos = signal<ProductoMasVendido[]>([]);
  logs = signal<LogEntry[]>([]);

  periodoSeleccionado = signal<'semana' | 'mes'>('semana');

  // Referencias a los <canvas> del HTML, para dibujar los gráficos de Chart.js ahí adentro
  @ViewChild('canvasPeliculas') canvasPeliculas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasProductos') canvasProductos!: ElementRef<HTMLCanvasElement>;

  private chartPeliculas: Chart | null = null;
  private chartProductos: Chart | null = null;

  constructor(
    private reportesService: ReportesService,
    private logService: LogService
  ) {}

  async ngOnInit() {
    this.facturacion.set(await this.reportesService.obtenerFacturacionDiaria());
    this.productosMasVendidos.set(await this.reportesService.productosMasVendidos());
    this.logs.set(await this.logService.obtenerUltimos());
    await this.cargarPeliculasMasVistas();
  }

  ngAfterViewInit() {
    // Los canvas recién existen en el DOM después de esta hook,
    // así que los gráficos se dibujan acá, no en ngOnInit
    this.dibujarGraficoProductos();
    this.dibujarGraficoPeliculas();
  }

  async cambiarPeriodo(periodo: 'semana' | 'mes') {
    this.periodoSeleccionado.set(periodo);
    await this.cargarPeliculasMasVistas();
    this.dibujarGraficoPeliculas();
  }

  private async cargarPeliculasMasVistas() {
    this.peliculasMasVistas.set(
      await this.reportesService.peliculasMasVistas(this.periodoSeleccionado())
    );
  }

  private dibujarGraficoPeliculas() {
    if (!this.canvasPeliculas) return;

    // Si ya había un gráfico dibujado (por ejemplo al cambiar de semana a mes),
    // hay que destruirlo antes de crear uno nuevo o Chart.js tira error de canvas reusado
    this.chartPeliculas?.destroy();

    const datos = this.peliculasMasVistas();

    this.chartPeliculas = new Chart(this.canvasPeliculas.nativeElement, {
      type: 'bar',
      data: {
        labels: datos.map(d => d.titulo),
        datasets: [{
          label: 'Butacas vendidas',
          data: datos.map(d => d.butacas_vendidas),
          backgroundColor: '#4caf50'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  private dibujarGraficoProductos() {
    if (!this.canvasProductos) return;

    const datos = this.productosMasVendidos();

    this.chartProductos = new Chart(this.canvasProductos.nativeElement, {
      type: 'bar',
      data: {
        labels: datos.map(d => d.nombre),
        datasets: [{
          label: 'Unidades vendidas',
          data: datos.map(d => d.cantidad_vendida),
          backgroundColor: '#d4af37'
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y', // barras horizontales, más legible con nombres largos de productos
        plugins: { legend: { display: false } }
      }
    });
  }

  exportarPDF() {
    this.reportesService.exportarFacturacionPDF(this.facturacion());
  }

  exportarExcel() {
    this.reportesService.exportarFacturacionExcel(this.facturacion());
  }
}