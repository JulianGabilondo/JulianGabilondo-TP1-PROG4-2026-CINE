import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege rutas que requieren estar logueado pero sin rol específico,
// como /perfil, /mis-peliculas o el checkout cuando el usuario decide no ser anónimo
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaLogueado()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};