// ============================================================================
// WSAPI 3.0 Operation Router
// Unified POST /api/v1/wsapi/:operation endpoint that dispatches to service
// layer methods, mirroring the AMS360 SOAP operation dispatch pattern.
// ============================================================================

import { Router, Response, NextFunction } from 'express';
import { wsapiAuthMiddleware, WsapiAuthenticatedRequest } from '../middleware/wsapi.auth.js';
import { AuthService } from '../services/auth.service.js';
import { AmsService } from '../services/ams.service.js';
import {
  WsapiResponse,
  WsapiOperationName,
  LoginRequest,
  LoginResponse,
  CustomerGetRequest,
  PolicyGetRequest,
  ValueListGetRequest,
  ValueListGetResponse,
} from '../types/wsapi.js';

const router: Router = Router();

// Apply WSAPI auth middleware to all operation routes
router.post('/:operation', wsapiAuthMiddleware, async (req: WsapiAuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const operation = req.params.operation as WsapiOperationName;
    const payload = req.body?.requestPayload ?? req.body;

    switch (operation) {
      // ── Auth Operations ─────────────────────────────────────────────
      case 'Login':
        handleLogin(payload, res);
        break;

      case 'Logout':
        handleLogout(req, res);
        break;

      case 'ValidateAgentLogin':
        handleValidateAgentLogin(payload, res);
        break;

      // ── Customer Operations ─────────────────────────────────────────
      case 'CustomerGet':
        await handleCustomerGet(payload, res);
        break;

      case 'CustomerInsert':
        await handleCustomerInsert(payload, res);
        break;

      case 'CustomerUpdate':
        await handleCustomerUpdate(payload, res);
        break;

      // ── Policy Operations ───────────────────────────────────────────
      case 'PolicyGet':
        await handlePolicyGet(payload, res);
        break;

      // ── Reference Data ──────────────────────────────────────────────
      case 'ValueListGet':
        handleValueListGet(payload, res);
        break;

      // ── Unsupported / Future Phase Operations ───────────────────────
      default:
        sendFault(res, operation, 'OPERATION_NOT_SUPPORTED',
          `Operation '${operation}' is not yet implemented. It is planned for a future phase.`);
        break;
    }
  } catch (err: any) {
    const operation = req.params.operation || 'Unknown';
    sendFault(res, operation, 'INTERNAL_ERROR', err.message || 'An unexpected error occurred.');
  }
});

// ── Convenience GET route for value lists ──────────────────────────────────
router.get('/valuelists/:name', (req: WsapiAuthenticatedRequest, res: Response) => {
  handleValueListGet({ listName: req.params.name }, res);
});

// ============================================================================
// Handler Implementations
// ============================================================================

function handleLogin(payload: LoginRequest, res: Response): void {
  if (!payload?.loginId || !payload?.password) {
    sendFault(res, 'Login', 'VALIDATION_ERROR', 'Login requires loginId and password fields.');
    return;
  }

  const authService = AuthService.getInstance();
  const session = authService.login(payload.loginId, payload.password);

  if (!session) {
    sendFault(res, 'Login', 'INVALID_CREDENTIALS',
      'Invalid loginId or password. In development, use wsapi-admin/admin123.');
    return;
  }

  const response: WsapiResponse<LoginResponse> = {
    status: 'success',
    operation: 'Login',
    ticket: session.ticket,
    responsePayload: {
      loginId: session.loginId,
      displayName: session.displayName,
      expiresAt: session.expiresAt.toISOString(),
    },
  };

  res.status(200).json(response);
}

function handleLogout(req: WsapiAuthenticatedRequest, res: Response): void {
  const ticket =
    (req.headers['x-wsapi-ticket'] as string) ||
    (req.body?.ticket as string);

  if (ticket) {
    const authService = AuthService.getInstance();
    authService.logout(ticket);
  }

  const response: WsapiResponse = {
    status: 'success',
    operation: 'Logout',
    responsePayload: { message: 'Session terminated successfully.' },
  };

  res.status(200).json(response);
}

function handleValidateAgentLogin(payload: LoginRequest, res: Response): void {
  if (!payload?.loginId || !payload?.password) {
    sendFault(res, 'ValidateAgentLogin', 'VALIDATION_ERROR',
      'ValidateAgentLogin requires loginId and password fields.');
    return;
  }

  const authService = AuthService.getInstance();
  const session = authService.login(payload.loginId, payload.password);

  if (!session) {
    const response: WsapiResponse = {
      status: 'success',
      operation: 'ValidateAgentLogin',
      responsePayload: { valid: false },
    };
    res.status(200).json(response);
    return;
  }

  // Clean up — ValidateAgentLogin is a validation-only check, no persistent session
  authService.logout(session.ticket);

  const response: WsapiResponse = {
    status: 'success',
    operation: 'ValidateAgentLogin',
    responsePayload: { valid: true, loginId: session.loginId, displayName: session.displayName },
  };

  res.status(200).json(response);
}

async function handleCustomerGet(payload: CustomerGetRequest, res: Response): Promise<void> {
  const amsService = AmsService.getInstance();

  if (payload?.customerId) {
    const customer = await amsService.getCustomerById('tenant-001', payload.customerId);
    if (!customer) {
      sendFault(res, 'CustomerGet', 'ENTITY_NOT_FOUND',
        `Customer '${payload.customerId}' not found in CoreAMS registry.`);
      return;
    }

    // Build enriched response with optional related data
    const responseData: Record<string, unknown> = { customer };

    if (payload.includePolicies) {
      responseData.policies = await amsService.getPolicies('tenant-001', { customerId: customer.customerId });
    }

    sendSuccess(res, 'CustomerGet', responseData);
    return;
  }

  // Search by name or FEIN
  const customers = await amsService.getCustomers('tenant-001', {
    name: payload?.name,
  });

  if (payload?.feinOrSsn) {
    const filtered = customers.filter(c => c.feinOrSsn === payload.feinOrSsn);
    sendSuccess(res, 'CustomerGet', { customers: filtered, count: filtered.length });
    return;
  }

  sendSuccess(res, 'CustomerGet', { customers, count: customers.length });
}

async function handleCustomerInsert(payload: any, res: Response): Promise<void> {
  if (!payload || (!payload.businessName && !payload.lastName)) {
    sendFault(res, 'CustomerInsert', 'VALIDATION_ERROR',
      'CustomerInsert requires at least businessName or lastName.');
    return;
  }

  const amsService = AmsService.getInstance();
  const created = await amsService.createCustomer('tenant-001', payload);

  sendSuccess(res, 'CustomerInsert', { customer: created }, 201);
}

async function handleCustomerUpdate(payload: any, res: Response): Promise<void> {
  if (!payload?.customerId) {
    sendFault(res, 'CustomerUpdate', 'VALIDATION_ERROR',
      'CustomerUpdate requires a customerId field.');
    return;
  }

  const amsService = AmsService.getInstance();
  const existing = await amsService.getCustomerById('tenant-001', payload.customerId);

  if (!existing) {
    sendFault(res, 'CustomerUpdate', 'ENTITY_NOT_FOUND',
      `Customer '${payload.customerId}' not found.`);
    return;
  }

  // Merge update fields into existing customer
  const updated = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  // Re-create to persist (since in-memory store uses array replacement)
  // For Phase 5B, this will be handled properly in the dedicated customer service
  sendSuccess(res, 'CustomerUpdate', { customer: updated });
}

async function handlePolicyGet(payload: PolicyGetRequest, res: Response): Promise<void> {
  const amsService = AmsService.getInstance();

  if (payload?.policyId || payload?.policyNumber) {
    const policy = await amsService.getPolicyById('tenant-001', payload.policyId || payload.policyNumber || '');
    if (!policy) {
      sendFault(res, 'PolicyGet', 'ENTITY_NOT_FOUND',
        `Policy '${payload.policyId || payload.policyNumber}' not found.`);
      return;
    }
    sendSuccess(res, 'PolicyGet', { policy });
    return;
  }

  const policies = await amsService.getPolicies('tenant-001', {
    customerId: payload?.customerId,
    carrierId: payload?.carrierId,
    status: payload?.status,
    effectiveDate: payload?.effectiveDate,
  });

  sendSuccess(res, 'PolicyGet', { policies, count: policies.length });
}

function handleValueListGet(payload: ValueListGetRequest, res: Response): void {
  if (!payload?.listName) {
    sendFault(res, 'ValueListGet', 'VALIDATION_ERROR',
      'ValueListGet requires a listName field.');
    return;
  }

  const list = getValueList(payload.listName);

  if (!list) {
    sendFault(res, 'ValueListGet', 'ENTITY_NOT_FOUND',
      `Value list '${payload.listName}' is not a recognized list name. ` +
      `Supported lists: ${SUPPORTED_VALUE_LISTS.join(', ')}`);
    return;
  }

  const response: WsapiResponse<ValueListGetResponse> = {
    status: 'success',
    operation: 'ValueListGet',
    responsePayload: {
      listName: payload.listName,
      values: list,
    },
  };

  res.status(200).json(response);
}

// ============================================================================
// Value List Registry
// ============================================================================

const SUPPORTED_VALUE_LISTS = [
  'EmployeeStatus', 'PersonnelRole', 'TransactionType', 'PolicyType',
  'TypeOfBusiness', 'PolicyStatus', 'ClaimStatus', 'SuspensePriority',
  'SuspenseStatus', 'ActivityType', 'RemarkCategory', 'BillingType',
  'PaymentMethod', 'EntityType', 'TimeZone',
];

function getValueList(listName: string): Array<{ code: string; description: string }> | null {
  const lists: Record<string, Array<{ code: string; description: string }>> = {
    EmployeeStatus: [
      { code: 'Active', description: 'Currently employed and active' },
      { code: 'Inactive', description: 'Temporarily inactive' },
      { code: 'Terminated', description: 'Employment terminated' },
    ],
    PersonnelRole: [
      { code: 'CSR', description: 'Customer Service Representative' },
      { code: 'Producer', description: 'Insurance Producer / Agent' },
      { code: 'AccountExecutive', description: 'Account Executive' },
      { code: 'Manager', description: 'Agency Manager' },
      { code: 'Admin', description: 'System Administrator' },
    ],
    TransactionType: [
      { code: 'NewBusiness', description: 'New policy placement' },
      { code: 'Renewal', description: 'Policy renewal' },
      { code: 'Endorsement', description: 'Mid-term policy change' },
      { code: 'Cancellation', description: 'Policy cancellation' },
      { code: 'Reinstatement', description: 'Policy reinstatement' },
    ],
    PolicyType: [
      { code: 'Monoline', description: 'Single line of business policy' },
      { code: 'BOP', description: 'Business Owners Policy' },
      { code: 'Package', description: 'Multi-line package policy' },
      { code: 'Umbrella', description: 'Umbrella / excess liability policy' },
    ],
    TypeOfBusiness: [
      { code: 'Commercial Auto', description: 'Commercial automobile coverage' },
      { code: 'General Liability', description: 'Commercial general liability' },
      { code: 'Commercial Property', description: 'Commercial property coverage' },
      { code: 'Workers Comp', description: 'Workers compensation insurance' },
      { code: 'BOP', description: 'Business owners policy' },
      { code: 'Personal Auto', description: 'Personal automobile coverage' },
      { code: 'Homeowners', description: 'Homeowners insurance' },
    ],
    PolicyStatus: [
      { code: 'Active', description: 'Policy currently in force' },
      { code: 'Expired', description: 'Policy term has ended' },
      { code: 'Cancelled', description: 'Policy has been cancelled' },
      { code: 'Pending', description: 'Policy is pending issuance' },
    ],
    ClaimStatus: [
      { code: 'Open', description: 'Claim is open and under investigation' },
      { code: 'Closed', description: 'Claim has been settled and closed' },
      { code: 'In_Review', description: 'Claim is under review' },
      { code: 'Reopened', description: 'Previously closed claim has been reopened' },
    ],
    SuspensePriority: [
      { code: 'Low', description: 'Low priority follow-up' },
      { code: 'Medium', description: 'Standard priority' },
      { code: 'High', description: 'High priority — requires prompt attention' },
      { code: 'Urgent', description: 'Urgent — immediate action required' },
    ],
    SuspenseStatus: [
      { code: 'Incomplete', description: 'Task not yet completed' },
      { code: 'Complete', description: 'Task has been completed' },
      { code: 'Deferred', description: 'Task deferred to a later date' },
      { code: 'Cancelled', description: 'Task has been cancelled' },
    ],
    ActivityType: [
      { code: 'Note', description: 'General note or memo' },
      { code: 'PhoneCall', description: 'Phone call record' },
      { code: 'Email', description: 'Email correspondence' },
      { code: 'Meeting', description: 'In-person or virtual meeting' },
      { code: 'PolicyChange', description: 'Policy modification activity' },
      { code: 'ClaimFiled', description: 'New claim filing activity' },
      { code: 'Renewal', description: 'Renewal processing activity' },
      { code: 'Endorsement', description: 'Endorsement processing activity' },
      { code: 'Cancellation', description: 'Cancellation processing activity' },
      { code: 'SystemGenerated', description: 'Automatically generated by system' },
    ],
    RemarkCategory: [
      { code: 'General', description: 'General remark' },
      { code: 'Underwriting', description: 'Underwriting-related note' },
      { code: 'Claims', description: 'Claims-related note' },
      { code: 'Billing', description: 'Billing or accounting note' },
      { code: 'Compliance', description: 'Compliance or regulatory note' },
    ],
    BillingType: [
      { code: 'Agency Bill', description: 'Agency billed — agency collects premium' },
      { code: 'Direct Bill', description: 'Direct billed — carrier collects premium' },
    ],
    PaymentMethod: [
      { code: 'Check', description: 'Payment by check' },
      { code: 'ACH', description: 'ACH electronic transfer' },
      { code: 'Credit_Card', description: 'Credit card payment' },
      { code: 'Wire', description: 'Wire transfer' },
    ],
    EntityType: [
      { code: 'Individual', description: 'Personal / individual insured' },
      { code: 'Commercial', description: 'Commercial / business entity' },
    ],
    TimeZone: [
      { code: 'US/Eastern', description: 'Eastern Time (ET)' },
      { code: 'US/Central', description: 'Central Time (CT)' },
      { code: 'US/Mountain', description: 'Mountain Time (MT)' },
      { code: 'US/Pacific', description: 'Pacific Time (PT)' },
      { code: 'US/Alaska', description: 'Alaska Time (AKT)' },
      { code: 'US/Hawaii', description: 'Hawaii-Aleutian Time (HAT)' },
    ],
  };

  return lists[listName] ?? null;
}

// ============================================================================
// Response Helpers
// ============================================================================

function sendSuccess(res: Response, operation: string, payload: unknown, statusCode = 200): void {
  const response: WsapiResponse = {
    status: 'success',
    operation,
    responsePayload: payload,
  };
  res.status(statusCode).json(response);
}

function sendFault(
  res: Response,
  operation: string,
  code: WsapiResponse['fault'] extends undefined ? never : NonNullable<WsapiResponse['fault']>['code'],
  message: string
): void {
  const statusMap: Record<string, number> = {
    INVALID_CREDENTIALS: 401,
    INVALID_TICKET: 401,
    TICKET_EXPIRED: 401,
    ENTITY_NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    OPERATION_NOT_SUPPORTED: 501,
    INTERNAL_ERROR: 500,
    DUPLICATE_ENTITY: 409,
  };

  const response: WsapiResponse = {
    status: 'fault',
    operation,
    fault: { code, message },
  };

  res.status(statusMap[code] || 500).json(response);
}

export default router;
