import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(c => c.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'peliculas',
        loadComponent: () => import('./peliculas/admin-peliculas.component').then(c => c.AdminPeliculasComponent)
      },
      {
        path: 'funciones',
        loadComponent: () => import('./funciones/admin-funciones.component').then(c => c.AdminFuncionesComponent)
      },
      {
        path: 'productos',
        loadComponent: () => import('./productos/admin-productos.component').then(c => c.AdminProductosComponent)
      },
      {
        path: 'reportes',
        loadComponent: () => import('./reportes/admin-reportes.component').then(c => c.AdminReportesComponent)
      }
    ]
  }
];