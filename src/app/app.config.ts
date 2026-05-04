import { ApplicationConfig, APP_INITIALIZER, EnvironmentProviders } from '@angular/core';
import * as ngCore from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { refreshInterceptor } from './core/interceptors/refresh.interceptor';
import { errorInterceptor, loaderInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { AppTitleStrategy } from './core/services/app-title.strategy';

function initializeApp(authService: AuthService) {
  return () => firstValueFrom(authService.initializeAuth()).catch(() => {
    // Silently fail — user will be redirected to login by guard
    return null;
  });
}

function provideBestAvailableZonelessMode(): EnvironmentProviders[] {
  const core = ngCore as typeof ngCore & {
    provideZonelessChangeDetection?: () => EnvironmentProviders;
    provideExperimentalZonelessChangeDetection?: () => EnvironmentProviders;
  };

  if (core.provideZonelessChangeDetection) {
    return [core.provideZonelessChangeDetection()];
  }

  if (core.provideExperimentalZonelessChangeDetection) {
    return [core.provideExperimentalZonelessChangeDetection()];
  }

  return [];
}

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideBestAvailableZonelessMode(),
    provideRouter(
      appRoutes,
      withPreloading(PreloadAllModules)
    ),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        refreshInterceptor,
        errorInterceptor,
        loaderInterceptor,
      ])
    ),
    provideAnimations(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true,
    },
  ],
};
