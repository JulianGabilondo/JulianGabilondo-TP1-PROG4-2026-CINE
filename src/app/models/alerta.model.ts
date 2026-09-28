export interface AlertaConPelicula {
  id: number;
  peliculaId: number;
  titulo: string;
  imagenUrl: string;
  fechaEstreno: string;
  notificado: boolean; // true = ya se habilitó la venta para esa película
}