// ============================================================================
// WSAPI 3.0 Types — CoreAMS Operation Router
// Mirrors the SOAP-style request/response envelope pattern with JSON payloads.
// ============================================================================

/**
 * All supported WSAPI operation names.
 * Follows the AMS360 convention: EntityVerb (e.g. CustomerGet, PolicyInsert).
 */
export type WsapiOperationName =
  // Auth
  | 'Login'
  | 'Logout'
  | 'ValidateAgentLogin'
  // Customer
  | 'CustomerGet'
  | 'CustomerInsert'
  | 'CustomerUpdate'
  // Policy
  | 'PolicyGet'
  | 'PolicyInsert'
  | 'PolicyUpdate'
  | 'PolicyEndorse'
  | 'PolicyRenew'
  | 'PolicyCancel'
  // Personnel
  | 'PersonnelGet'
  | 'PersonnelInsert'
  | 'PersonnelUpdate'
  | 'ChangePolicyPersonnel'
  // Activity
  | 'ActivityGet'
  | 'ActivityInsert'
  // Suspense
  | 'SuspenseGet'
  | 'SuspenseInsert'
  | 'SuspenseUpdate'
  | 'SuspenseDelete'
  | 'SuspenseBulkAssign'
  // Remark
  | 'RemarkGet'
  | 'RemarkInsert'
  | 'RemarkUpdate'
  | 'RemarkDelete'
  // Claim
  | 'ClaimGet'
  | 'ClaimUpdate'
  // Reference Data
  | 'ValueListGet'
  // Compound Workflows
  | 'CustomerMerge';

/**
 * Inbound WSAPI request envelope.
 * Mirrors SOAP Body structure with typed operation + payload.
 */
export interface WsapiRequest<T = unknown> {
  operation: WsapiOperationName;
  requestPayload: T;
}

/**
 * Outbound WSAPI response envelope.
 * Includes status, operation echo, optional ticket (Login), and fault details.
 */
export interface WsapiResponse<T = unknown> {
  status: 'success' | 'fault';
  operation: string;
  ticket?: string;
  responsePayload?: T;
  fault?: WsapiFault;
}

export interface WsapiFault {
  code: WsapiFaultCode;
  message: string;
}

export type WsapiFaultCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TICKET'
  | 'TICKET_EXPIRED'
  | 'ENTITY_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'OPERATION_NOT_SUPPORTED'
  | 'INTERNAL_ERROR'
  | 'DUPLICATE_ENTITY';

// --- Auth-specific payload types ---

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  loginId: string;
  displayName: string;
  expiresAt: string;
}

// --- Session ticket type ---

export interface WsapiSession {
  ticket: string;
  loginId: string;
  displayName: string;
  tenantId: string;
  createdAt: Date;
  expiresAt: Date;
}

// --- Generic Get request filters ---

export interface CustomerGetRequest {
  customerId?: string;
  name?: string;
  feinOrSsn?: string;
  includeActivities?: boolean;
  includeSuspenses?: boolean;
  includePolicies?: boolean;
  includeRemarks?: boolean;
}

export interface PolicyGetRequest {
  policyId?: string;
  policyNumber?: string;
  customerId?: string;
  carrierId?: string;
  status?: string;
  effectiveDate?: string;
  lineOfBusiness?: string;
}

export interface ValueListGetRequest {
  listName: string;
}

export interface ValueListGetResponse {
  listName: string;
  values: Array<{ code: string; description: string }>;
}
