import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard funcional (el estilo recomendado desde Angular 15+, reemplaza a la clase CanActivate)
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.esAdmin()) {
    return true;
  }

  // Si no es admin, lo mandamos al home en vez de dejarlo en una pantalla rota
  router.navigate(['/']);
  return false;
};