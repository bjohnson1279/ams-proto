// ============================================================================
// WSAPI Auth Service — Session Ticket Management
// Mirrors the AMS360 WSAPI Login → Ticket → Operation authentication flow.
// In development mode, accepts static credentials for testing.
// ============================================================================

import { randomUUID } from 'crypto';
import { WsapiSession } from '../types/wsapi.js';

/** Default session TTL: 30 minutes */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** Interval for pruning expired sessions: 5 minutes */
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Static development credentials.
 * Only accepted when NODE_ENV !== 'production'.
 */
const DEV_CREDENTIALS: Array<{
  loginId: string;
  password: string;
  displayName: string;
  tenantId: string;
}> = [
  {
    loginId: 'wsapi-admin',
    password: 'admin123',
    displayName: 'WSAPI Administrator',
    tenantId: 'tenant-001',
  },
  {
    loginId: 'wsapi-user-1',
    password: 'user123',
    displayName: 'Sarah Jenkins (Producer)',
    tenantId: 'tenant-001',
  },
  {
    loginId: 'wsapi-user-2',
    password: 'user123',
    displayName: 'Mark Rivera (CSR)',
    tenantId: 'tenant-002',
  },
];

export class AuthService {
  private static instance: AuthService;

  /** Active sessions keyed by ticket string */
  private sessions: Map<string, WsapiSession> = new Map();

  /** Handle for the periodic session pruner */
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startPruner();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate credentials and create a new session ticket.
   * In development, accepts static credentials from DEV_CREDENTIALS.
   * Returns the session on success, or null on failure.
   */
  public login(loginId: string, password: string): WsapiSession | null {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Production: reject all static credentials — requires external auth provider
      console.warn('[AuthService] Production login attempted — external auth not yet configured.');
      return null;
    }

    const cred = DEV_CREDENTIALS.find(
      (c) => c.loginId === loginId && c.password === password
    );

    if (!cred) {
      return null;
    }

    const now = new Date();
    const session: WsapiSession = {
      ticket: `TKT-${randomUUID()}`,
      loginId: cred.loginId,
      displayName: cred.displayName,
      tenantId: cred.tenantId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    };

    this.sessions.set(session.ticket, session);
    return session;
  }

  /**
   * Validate a session ticket.
   * Returns the session if valid and not expired, or null otherwise.
   */
  public validateTicket(ticket: string): WsapiSession | null {
    const session = this.sessions.get(ticket);
    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      this.sessions.delete(ticket);
      return null;
    }

    return session;
  }

  /**
   * Invalidate a session ticket (logout).
   */
  public logout(ticket: string): boolean {
    return this.sessions.delete(ticket);
  }

  /**
   * Get count of active (non-expired) sessions.
   */
  public getActiveSessionCount(): number {
    this.pruneExpiredSessions();
    return this.sessions.size;
  }

  /**
   * Remove all expired sessions from the store.
   */
  private pruneExpiredSessions(): void {
    const now = new Date();
    for (const [ticket, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(ticket);
      }
    }
  }

  /**
   * Start periodic pruning of expired sessions.
   */
  private startPruner(): void {
    // Avoid duplicate timers
    if (this.pruneTimer) return;

    this.pruneTimer = setInterval(() => {
      this.pruneExpiredSessions();
    }, PRUNE_INTERVAL_MS);

    // Unref so the timer doesn't keep the process alive during tests
    if (this.pruneTimer && typeof this.pruneTimer.unref === 'function') {
      this.pruneTimer.unref();
    }
  }

  /**
   * Stop the pruner — primarily for test cleanup.
   */
  public stopPruner(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  /**
   * Clear all sessions — primarily for test isolation.
   */
  public clearSessions(): void {
    this.sessions.clear();
  }
}
