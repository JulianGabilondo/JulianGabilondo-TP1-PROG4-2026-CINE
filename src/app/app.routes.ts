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
    path: 'pelicula/:id',
    loadComponent: () => import('./features/peliculas/detalle/detalle-pelicula.component').then(c => c.DetallePeliculaComponent)
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

  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(c => c.NotFoundComponent)
  },

  {
  path: 'compra/:funcionId',
  loadComponent: () => import('./features/compra/checkout/checkout.component').then(c => c.CheckoutComponent)
},

];

