import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models';

declare const io: (url: string, opts?: Record<string, unknown>) => SocketIOClient;

interface SocketIOClient {
  on(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, data?: unknown): void;
  disconnect(): void;
  connect(): void;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: SocketIOClient | null = null;

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  connect(token: string): void {
    if (typeof io === 'undefined') {
      console.warn('Socket.io not loaded');
      return;
    }
    this.socket = io(environment.socketUrl, {
      withCredentials: true,
      auth: { token },
    });

    this.socket.on('notification', (data: unknown) => {
      const notif = data as Notification;
      this.notifications.update(prev => [notif, ...prev].slice(0, 50));
    });

    this.socket.on('admin:message', (data: unknown) => {
      const notif = data as Notification;
      this.notifications.update(prev => [notif, ...prev].slice(0, 50));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onNotification(): Observable<Notification> {
    return new Observable(observer => {
      if (!this.socket) return;
      this.socket.on('notification', (data: unknown) => {
        observer.next(data as Notification);
      });
    });
  }

  sendAdminMessage(payload: { title: string; message: string; type: string; targetRole?: string }): void {
    this.socket?.emit('admin:send-message', payload);
  }

  markAllRead(): void {
    this.notifications.update(n => n.map(notif => ({ ...notif, read: true })));
  }

  markRead(id: string): void {
    this.notifications.update(n =>
      n.map(notif => notif._id === id ? { ...notif, read: true } : notif)
    );
  }
}
