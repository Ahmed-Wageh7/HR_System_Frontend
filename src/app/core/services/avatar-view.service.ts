import { Injectable } from '@angular/core';

export interface AvatarViewSettings {
  x: number;
  y: number;
  scale: number;
}

@Injectable({ providedIn: 'root' })
export class AvatarViewService {
  private readonly storageKey = 'hr.avatar_view';
  private readonly defaults: AvatarViewSettings = { x: 50, y: 50, scale: 1 };

  get(userId: string | null | undefined): AvatarViewSettings {
    if (!userId) {
      return { ...this.defaults };
    }

    const raw = localStorage.getItem(this.key(userId));
    if (!raw) {
      return { ...this.defaults };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AvatarViewSettings>;
      return this.normalize(parsed);
    } catch {
      localStorage.removeItem(this.key(userId));
      return { ...this.defaults };
    }
  }

  save(userId: string | null | undefined, settings: Partial<AvatarViewSettings>): AvatarViewSettings {
    const normalized = this.normalize(settings);
    if (userId) {
      localStorage.setItem(this.key(userId), JSON.stringify(normalized));
    }
    return normalized;
  }

  clear(userId: string | null | undefined): void {
    if (!userId) {
      return;
    }
    localStorage.removeItem(this.key(userId));
  }

  toStyle(settings: AvatarViewSettings): Record<string, string> {
    return {
      width: '100%',
      height: '100%',
      'border-radius': '50%',
      'object-fit': 'cover',
      'object-position': `${settings.x}% ${settings.y}%`,
      transform: `scale(${settings.scale})`,
      'transform-origin': 'center center',
    };
  }

  private normalize(settings: Partial<AvatarViewSettings>): AvatarViewSettings {
    return {
      x: this.clamp(settings.x ?? this.defaults.x, 0, 100),
      y: this.clamp(settings.y ?? this.defaults.y, 0, 100),
      scale: this.clamp(settings.scale ?? this.defaults.scale, 1, 2.5),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private key(userId: string): string {
    return `${this.storageKey}:${userId}`;
  }
}
