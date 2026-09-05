// ============================================================================
// WSAPI Auth Middleware
// Extracts and validates the X-WSAPI-Ticket header for all WSAPI operations
// except Login, Logout, and ValidateAgentLogin (which are auth operations).
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { WsapiResponse, WsapiSession } from '../types/wsapi.js';

/** Operations that do NOT require a valid session ticket */
const AUTH_EXEMPT_OPERATIONS = new Set([
  'Login',
  'ValidateAgentLogin',
]);

/**
 * Extended request type carrying the validated WSAPI session.
 */
export interface WsapiAuthenticatedRequest extends Request {
  wsapiSession?: WsapiSession;
}

/**
 * Middleware that validates the WSAPI session ticket.
 *
 * Ticket can be supplied via:
 *   1. `X-WSAPI-Ticket` header (preferred)
 *   2. `ticket` field in the JSON request body (fallback)
 *
 * Auth-exempt operations (Login, ValidateAgentLogin) skip validation.
 */
export function wsapiAuthMiddleware(
  req: WsapiAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Determine the operation from the route param
  const operation = req.params.operation;

  // Skip auth for exempt operations
  if (AUTH_EXEMPT_OPERATIONS.has(operation)) {
    next();
    return;
  }

  // Extract ticket from header or body
  const ticket =
    (req.headers['x-wsapi-ticket'] as string) ||
    (req.body && typeof req.body.ticket === 'string' ? req.body.ticket : undefined);

  if (!ticket) {
    const fault: WsapiResponse = {
      status: 'fault',
      operation: operation || 'Unknown',
      fault: {
        code: 'INVALID_TICKET',
        message: 'Missing WSAPI session ticket. Call Login first to obtain a ticket, then include it in the X-WSAPI-Ticket header.',
      },
    };
    res.status(401).json(fault);
    return;
  }

  const authService = AuthService.getInstance();
  const session = authService.validateTicket(ticket);

  if (!session) {
    const fault: WsapiResponse = {
      status: 'fault',
      operation: operation || 'Unknown',
      fault: {
        code: 'TICKET_EXPIRED',
        message: 'WSAPI session ticket is invalid or has expired. Please call Login again to obtain a new ticket.',
      },
    };
    res.status(401).json(fault);
    return;
  }

  // Attach session to request for downstream handlers
  req.wsapiSession = session;
  next();
}
