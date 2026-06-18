import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if (!document.querySelector('app-root')) {
  document.body.appendChild(document.createElement('app-root'));
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
