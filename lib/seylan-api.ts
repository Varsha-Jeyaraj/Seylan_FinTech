/**
 * Seylan Bank Sandbox API Client
 * Centralized service for all Seylan API calls
 * API Key and Base URL from environment variables
 */

const SEYLAN_BASE_URL = process.env.SEYLAN_SANDBOX_URL || 'http://34.21.206.87:3000';
const SEYLAN_API_KEY = process.env.SEYLAN_API_KEY;

if (!SEYLAN_API_KEY) {
  console.warn('[Seylan API] Warning: SEYLAN_API_KEY not configured');
}

// Type definitions for Seylan API responses
export interface SeylanTransferRequest {
  fromAccountNumber: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
  transactionRef?: string;
}

export interface SeylanCeftsRequest {
  fromAccountNumber: string;
  toAccountNumber: string;
  toBankCode: string;
  amount: number;
  description?: string;
  transactionRef?: string;
}

export interface SeylanTransferResponse {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  statusCode: number;
  message: string;
  amount: number;
  timestamp: string;
}

export interface SeylanBalanceResponse {
  accountNumber: string;
  balance: number;
  currency: string;
  availableBalance: number;
  lastUpdated: string;
}

export interface SeylanTransactionHistoryResponse {
  accountNumber: string;
  transactions: Array<{
    transactionId: string;
    date: string;
    description: string;
    amount: number;
    balance: number;
    transactionType: string;
    status: string;
  }>;
  totalCount: number;
}

export interface SeylanApiError {
  error: true;
  statusCode: number;
  message: string;
  details?: Record<string, any>;
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 500, // ms
  maxDelay: 2000, // ms
  backoffMultiplier: 2,
};

// Rate limiting (100 requests per 15 minutes)
let requestCount = 0;
let requestWindowStart = Date.now();
const RATE_LIMIT = 100;
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Internal function to make authenticated requests to Seylan API
 */
async function makeSeylanRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, any>,
  retryCount = 0
): Promise<T | SeylanApiError> {
  // Check rate limit
  const now = Date.now();
  if (now - requestWindowStart > RATE_WINDOW) {
    requestCount = 0;
    requestWindowStart = now;
  }

  if (requestCount >= RATE_LIMIT) {
    return {
      error: true,
      statusCode: 429,
      message: 'Rate limit exceeded (100 requests per 15 minutes)',
    };
  }

  requestCount++;

  const url = `${SEYLAN_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': SEYLAN_API_KEY || '',
  };

  const config: RequestInit = {
    method,
    headers,
    timeout: 30000, // 30 second timeout
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        if (retryCount < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
            RETRY_CONFIG.maxDelay
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return makeSeylanRequest<T>(method, endpoint, data, retryCount + 1);
        }
      }

      // Parse error response
      let errorData: Record<string, any> = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      return {
        error: true,
        statusCode: response.status,
        message: errorData.message || response.statusText,
        details: errorData,
      };
    }

    const responseData = await response.json();
    return responseData as T;
  } catch (error) {
    // Retry on timeout or network error
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelay
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return makeSeylanRequest<T>(method, endpoint, data, retryCount + 1);
    }

    console.error('[Seylan API] Request failed:', error);
    return {
      error: true,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}

/**
 * Helper to check if response is an error
 */
export function isSeylanError(response: any): response is SeylanApiError {
  return response && response.error === true;
}

/**
 * Internal Transfer - Transfer funds between two accounts
 */
export async function internalTransfer(
  request: SeylanTransferRequest
): Promise<SeylanTransferResponse | SeylanApiError> {
  return makeSeylanRequest<SeylanTransferResponse>(
    'POST',
    '/Posting/Account/InternalTransfer/1.0/TransferFunds',
    {
      sourceAccount: request.fromAccountNumber,
      destinationAccount: request.toAccountNumber,
      amount: request.amount,
      remarks: request.description || '',
      referenceNumber: request.transactionRef || `TXN-${Date.now()}`,
    }
  );
}

/**
 * CEFTS Transfer - Transfer funds via CEFTS system
 */
export async function ceftsTransfer(
  request: SeylanCeftsRequest
): Promise<SeylanTransferResponse | SeylanApiError> {
  return makeSeylanRequest<SeylanTransferResponse>(
    'POST',
    '/Posting/Account/Cefts/1.0/InitiateCEFTSTransfer',
    {
      sourceAccount: request.fromAccountNumber,
      beneficiaryAccount: request.toAccountNumber,
      beneficiaryBank: request.toBankCode,
      amount: request.amount,
      remarks: request.description || '',
      referenceNumber: request.transactionRef || `CEFTS-${Date.now()}`,
    }
  );
}

/**
 * Get Account Balance
 */
export async function getAccountBalance(
  accountNumber: string
): Promise<SeylanBalanceResponse | SeylanApiError> {
  return makeSeylanRequest<SeylanBalanceResponse>(
    'GET',
    `/Inquiry/Account/AccountInquiry/1.0/GetAccountBalance?accountNumber=${accountNumber}`
  );
}

/**
 * Get Account Transaction History
 */
export async function getAccountTransactions(
  accountNumber: string,
  limit: number = 50,
  offset: number = 0
): Promise<SeylanTransactionHistoryResponse | SeylanApiError> {
  return makeSeylanRequest<SeylanTransactionHistoryResponse>(
    'GET',
    `/Inquiry/Account/AccountInquiry/1.0/GetAccountTransactions?accountNumber=${accountNumber}&limit=${limit}&offset=${offset}`
  );
}

/**
 * Get API health status
 */
export async function getApiHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; timestamp: string }> {
  try {
    const response = await fetch(`${SEYLAN_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'x-api-key': SEYLAN_API_KEY || '' },
      timeout: 5000,
    });

    if (response.ok) {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
      };
    }
  } catch {
    return {
      status: 'down',
      timestamp: new Date().toISOString(),
    };
  }
}

// ----------------------------------------------------------------------------
// 3. JustPay Acquirer Services
// ----------------------------------------------------------------------------

export async function justPayRegisterAccount(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/JustPay/Acquirer/1.0/JustPayRegisterAccount', data);
}

export async function verifyJustPayRegistration(otp: string, accountId?: string): Promise<any | SeylanApiError> {
  // Assuming GET requires query params, though often OTP verifications are POSTs. 
  // We'll follow the manual strictly (GET).
  return makeSeylanRequest<any>('GET', `/JustPay/Acquirer/1.0/VerifyJustPayRegistration?otp=${otp}${accountId ? `&accountId=${accountId}` : ''}`);
}

export async function justPayGetCertificate(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/JustPay/Acquirer/1.0/JustPayGetCertificate', data);
}

export async function justPaySignDigitalMandate(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/JustPay/Acquirer/1.0/JustPaySignDigitalMandate', data);
}

export async function initiateJustPayTransaction(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/JustPay/Acquirer/1.0/InitiateJustPayTransaction', data);
}

export async function getJustPayTransactionStatus(transactionId: string): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('GET', `/JustPay/Acquirer/1.0/GetJustPayTransactionStatus?transactionId=${transactionId}`);
}

export async function refundJustPayTransaction(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/JustPay/Acquirer/1.0/RefundJustPayTransaction', data);
}

// ----------------------------------------------------------------------------
// 4. LankaQR Acquirer Services
// ----------------------------------------------------------------------------

export async function initiateLankaQRTransaction(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/QR/LankaQR/1.0/InitiateLankaQRTransaction', data);
}

export async function inquireLankaQRTransaction(transactionId: string): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('GET', `/QR/LankaQR/1.0/InquireLankaQRTransaction?transactionId=${transactionId}`);
}

// ----------------------------------------------------------------------------
// 5. Visa/Master QR Acquirer Services
// ----------------------------------------------------------------------------

export async function initiateVMQRTransaction(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/QR/VMQR/1.0/InitiateVMQRTransaction', data);
}

export async function inquireVMQRTransaction(transactionId: string): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('GET', `/QR/VMQR/1.0/InquireVMQRTransaction?transactionId=${transactionId}`);
}

// ----------------------------------------------------------------------------
// 6. QR Merchant API Services
// ----------------------------------------------------------------------------

export async function generateQR(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/MerchantQR/1.0/GenerateQR', data);
}

export async function qrTransactionView(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/MerchantQR/1.0/TransactionView', data);
}

export async function merchantRefund(data: any): Promise<any | SeylanApiError> {
  return makeSeylanRequest<any>('POST', '/MerchantQR/1.0/MerchantRefund', data);
}

/**
 * Get Seylan API Client instance with all methods
 */
export function getSeylanClient() {
  return {
    internalTransfer,
    ceTransfer: ceftsTransfer,
    getAccountBalance,
    getAccountDetails: getAccountBalance, // Alias for compatibility
    getAccountTransactions,
    getApiHealth,
    justPayRegisterAccount,
    verifyJustPayRegistration,
    justPayGetCertificate,
    justPaySignDigitalMandate,
    initiateJustPayTransaction,
    getJustPayTransactionStatus,
    refundJustPayTransaction,
    initiateLankaQRTransaction,
    inquireLankaQRTransaction,
    initiateVMQRTransaction,
    inquireVMQRTransaction,
    generateQR,
    qrTransactionView,
    merchantRefund,
  };
}

/**
 * Log API call to database
 */
export async function logBankAPICall(
  endpoint: string,
  method: string,
  requestBody: any,
  responseBody: any,
  executionTime: number = 0
) {
  try {
    const { supabase } = await import('./supabase');
    
    await supabase.from('bank_api_logs').insert({
      endpoint,
      method,
      request_body: requestBody,
      response_body: responseBody,
      status_code: responseBody?.status === 'success' ? 200 : 400,
      execution_time_ms: executionTime,
    });
  } catch (error) {
    console.error('[Seylan API] Failed to log API call:', error);
  }
}
