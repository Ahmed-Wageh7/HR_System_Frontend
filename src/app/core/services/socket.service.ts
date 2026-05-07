import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Notification } from '../models';
import { showAppToast } from '../utils/toast';

type SocketMessageType = 'announcement' | 'payroll' | 'warning';
type SocketTargetRole = 'all' | 'staff' | 'admin';

interface IncomingNotificationPayload {
  _id?: string;
  id?: string;
  type?: SocketMessageType;
  title?: string;
  message?: string;
  targetRole?: SocketTargetRole;
  referenceKey?: string;
  createdAt?: string;
}

interface OutgoingAdminMessage {
  type: SocketMessageType;
  title: string;
  message: string;
  targetRole?: SocketTargetRole;
  referenceKey?: string;
  expiresAt?: string | Date;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = computed(() =>
    this.notifications().filter(notification => !notification.read).length
  );

  connect(token: string): void {
    if (!token) return;

    if (this.socket?.connected && this.currentToken === token) {
      return;
    }

    this.disconnect();
    this.currentToken = token;

    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 1,
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('authenticate', token);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('Socket connection failed', error?.message ?? error);
    });

    this.socket.on('error', (message: unknown) => {
      if (message === 'Authentication failed') {
        showAppToast('error', 'Socket authentication failed.');
      }
    });

    this.socket.on('user:receive-message', (payload: unknown) => {
      this.pushNotification(this.normalizeNotification(payload));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentToken = null;
  }

  onNotification(): Observable<Notification> {
    return new Observable(observer => {
      if (!this.socket) return;
      this.socket.on('user:receive-message', (payload: unknown) => {
        observer.next(this.normalizeNotification(payload));
      });
    });
  }

  sendAdminMessage(payload: OutgoingAdminMessage): void {
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
    const value = (payload ?? {}) as IncomingNotificationPayload;
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
