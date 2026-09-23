import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export interface FacturacionDia {
  dia: string;
  cantidad_entradas: number;
  facturacion_total: number;
}

export interface PeliculaMasVista {
  titulo: string;
  butacas_vendidas: number;
}

export interface ProductoMasVendido {
  nombre: string;
  cantidad_vendida: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerFacturacionDiaria(): Promise<FacturacionDia[]> {
    const { data, error } = await this.supabaseService.client
      .from('vista_facturacion_diaria')
      .select('*')
      .order('dia', { ascending: false })
      .limit(30); // últimos 30 días, para no traer todo el histórico siempre

    return error ? [] : (data as FacturacionDia[]);
  }

  // Agrupa por semana o mes en el cliente, ya que la vista trae fila por venta.
  // Con el volumen de un cine (cientos/miles de filas, no millones), agrupar
  // en el navegador es más simple que armar 2 vistas SQL distintas (semana/mes).
  async peliculasMasVistas(periodo: 'semana' | 'mes'): Promise<PeliculaMasVista[]> {
    const desde = new Date();
    if (periodo === 'semana') {
      desde.setDate(desde.getDate() - 7);
    } else {
      desde.setMonth(desde.getMonth() - 1);
    }

    const { data, error } = await this.supabaseService.client
      .from('vista_peliculas_mas_vistas')
      .select('*')
      .gte('created_at', desde.toISOString());

    if (error || !data) return [];

    const acumulado = new Map<string, number>();
    for (const fila of data as any[]) {
      acumulado.set(fila.titulo, (acumulado.get(fila.titulo) ?? 0) + fila.butacas_vendidas);
    }

    return [...acumulado.entries()]
      .map(([titulo, butacas_vendidas]) => ({ titulo, butacas_vendidas }))
      .sort((a, b) => b.butacas_vendidas - a.butacas_vendidas)
      .slice(0, 10); // top 10 para que el gráfico sea legible
  }

  async productosMasVendidos(): Promise<ProductoMasVendido[]> {
    const { data, error } = await this.supabaseService.client
      .from('vista_productos_mas_vendidos')
      .select('*')
      .limit(10);

    return error ? [] : (data as ProductoMasVendido[]);
  }

  exportarFacturacionPDF(datos: FacturacionDia[]) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de facturación', 20, 20);

    let y = 35;
    doc.setFontSize(10);
    doc.text('Fecha', 20, y);
    doc.text('Entradas vendidas', 80, y);
    doc.text('Facturación', 150, y);
    y += 7;

    for (const fila of datos) {
      doc.text(fila.dia, 20, y);
      doc.text(String(fila.cantidad_entradas), 80, y);
      doc.text(`$${fila.facturacion_total.toFixed(2)}`, 150, y);
      y += 7;

      // Salto de página simple si se llena la hoja
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save('facturacion.pdf');
  }

  exportarFacturacionExcel(datos: FacturacionDia[]) {
    // Aplanamos a un formato simple de filas/columnas para la hoja de cálculo
    const filas = datos.map(f => ({
      Fecha: f.dia,
      'Entradas vendidas': f.cantidad_entradas,
      'Facturación total': f.facturacion_total
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Facturación');
    XLSX.writeFile(libro, 'facturacion.xlsx');
  }
}