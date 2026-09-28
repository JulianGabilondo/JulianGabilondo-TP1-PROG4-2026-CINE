import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { empleadoGuard } from './core/guards/empleado.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/peliculas/home/home.component').then(c => c.HomeComponent)
  },
  {
    path: 'proximamente',
    loadComponent: () => import('./features/peliculas/proximamente/proximamente.component').then(c => c.ProximamenteComponent)
  },
  {
    path: 'pelicula/:id',
    loadComponent: () => import('./features/peliculas/detalle/detalle-pelicula.component').then(c => c.DetallePeliculaComponent)
  },
  // Sin authGuard a propósito: el cliente pidió que se pueda comprar de forma anónima.
  {
    path: 'compra/:funcionId',
    loadComponent: () => import('./features/compra/checkout/checkout.component').then(c => c.CheckoutComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro.component').then(c => c.RegistroComponent)
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil.component').then(c => c.PerfilComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(r => r.ADMIN_ROUTES)
  },
  {
    path: 'empleado',
    canActivate: [empleadoGuard],
    loadComponent: () => import('./features/empleado/validador-qr.component').then(c => c.ValidadorQrComponent)
  },
  // El comodín siempre va al final: si va antes, se traga todas las rutas de abajo
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(c => c.NotFoundComponent)
  }
];