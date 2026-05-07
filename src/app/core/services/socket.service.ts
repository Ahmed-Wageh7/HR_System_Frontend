import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Notification } from '../models';
import { showAppToast } from '../utils/toast';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private disabled = false;

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = computed(() =>
    this.notifications().filter(notification => !notification.read).length
  );

  connect(token: string): void {
    if (!token || this.disabled) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(environment.socketUrl, {
      transports: ['polling'],
      upgrade: false,
      reconnectionAttempts: 1,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('authenticate', token);
    });

    this.socket.on('connect_error', () => {
      this.disabled = true;
      this.socket?.disconnect();
      this.socket = null;
      console.warn('Socket connection failed');
    });

    this.socket.on('notification', (payload: unknown) => {
      this.pushNotification(this.normalizeNotification(payload));
    });

    this.socket.on('admin:message', (payload: unknown) => {
      this.pushNotification(this.normalizeNotification(payload));
    });

    this.socket.on('user:receive-message', (payload: unknown) => {
      this.pushNotification(this.normalizeNotification(payload));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onNotification(): Observable<Notification> {
    return new Observable(observer => {
      if (!this.socket) return;
      this.socket.on('notification', (payload: unknown) => {
        observer.next(this.normalizeNotification(payload));
      });
    });
  }

  sendAdminMessage(payload: { title: string; message: string; type: string; targetRole?: string }): void {
    this.socket?.emit('admin:send-message', payload);
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(notification => ({ ...notification, read: true })));
  }

  markRead(id: string): void {
    this.notifications.update(list =>
      list.map(notification => notification._id === id ? { ...notification, read: true } : notification)
    );
  }

  private pushNotification(notification: Notification): void {
    this.notifications.update(current => {
      const next = [notification, ...current.filter(item => item._id !== notification._id)].slice(0, 50);
      return next;
    });

    if (!notification.read) {
      showAppToast('info', notification.title || notification.message || 'New notification received.');
    }
  }

  private normalizeNotification(payload: unknown): Notification {
    const value = (payload ?? {}) as Partial<Notification> & { id?: string };
    return {
      _id: value._id ?? value.id ?? `${Date.now()}`,
      title: value.title ?? 'Notification',
      message: value.message ?? '',
      type: value.type ?? 'general',
      read: value.read ?? false,
      link: value.link,
      createdAt: value.createdAt ?? new Date().toISOString(),
    };
  }
}
