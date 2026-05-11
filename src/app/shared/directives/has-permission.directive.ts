import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject, OnChanges } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit, OnChanges {
  @Input('hasPermission') permission!: string | string[];

  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  ngOnInit(): void {
    this.updateView();
  }

  ngOnChanges(): void {
    this.updateView();
  }

  private updateView(): void {
    this.viewContainer.clear();
    if (this.auth.hasPermission(this.permission)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
