// ═══════════════════════════════════════════════════════════════════
// KORA PAY PAYMENT SERVICE
// Handles payment initiation, verification, and status tracking
// ═══════════════════════════════════════════════════════════════════

const API_ENDPOINTS = [
  '/api',
  'https://dutchkem-prosuite.onrender.com/api',
  'http://localhost:3001/api',
];

export interface PaymentRequest {
  amount: number;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  agentId: string;
  serviceName: string;
  reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  checkoutUrl?: string;
  reference?: string;
  message: string;
}

export interface PaymentStatus {
  success: boolean;
  status: 'success' | 'pending' | 'failed' | 'reversed';
  amount?: number;
  reference?: string;
}

// Generate unique payment reference
function generateReference(agentId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DK-${agentId}-${timestamp}-${random}`.toUpperCase();
}

// Initiate payment via backend → Kora Pay
export async function initiatePayment(req: PaymentRequest): Promise<PaymentResponse> {
  const reference = req.reference || generateReference(req.agentId);

  for (const base of API_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/payments/kora/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: req.amount,
          currency: 'NGN',
          customer: {
            email: req.customerEmail || `${req.customerPhone}@dutchkem.com`,
            phone: req.customerPhone,
            name: req.customerName,
          },
          reference,
          agentId: req.agentId,
          serviceName: req.serviceName,
          redirect_url: window.location.origin + '?payment_status=success&ref=' + reference,
          notification_url: `${base.replace('/api', '')}/api/payments/kora/webhook`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.checkoutUrl) {
          // Store payment reference locally for verification later
          const payments = JSON.parse(localStorage.getItem('dk_pending_payments') || '[]');
          payments.push({
            reference,
            amount: req.amount,
            agentId: req.agentId,
            serviceName: req.serviceName,
            initiatedAt: Date.now(),
            status: 'pending',
          });
          localStorage.setItem('dk_pending_payments', JSON.stringify(payments));

          return {
            success: true,
            checkoutUrl: data.checkoutUrl,
            reference,
            message: 'Payment initiated',
          };
        }
      }
    } catch {
      continue;
    }
  }

  // All endpoints failed
  return {
    success: false,
    message: 'Could not connect to payment server. Please check your internet connection and try again in a moment.',
  };
}

// Check payment status
export async function checkPaymentStatus(reference: string): Promise<PaymentStatus> {
  for (const base of API_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/payments/kora/verify/${reference}`);
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          status: data.status,
          amount: data.amount,
          reference: data.reference,
        };
      }
    } catch {
      continue;
    }
  }

  return { success: false, status: 'pending' };
}

// Get payment history for current user
export function getLocalPayments(): Array<{
  reference: string;
  amount: number;
  agentId: string;
  serviceName: string;
  initiatedAt: number;
  status: string;
}> {
  try {
    return JSON.parse(localStorage.getItem('dk_pending_payments') || '[]');
  } catch {
    return [];
  }
}

// Update local payment status
export function updateLocalPayment(reference: string, status: string): void {
  const payments = getLocalPayments();
  const idx = payments.findIndex(p => p.reference === reference);
  if (idx !== -1) {
    payments[idx].status = status;
    localStorage.setItem('dk_pending_payments', JSON.stringify(payments));
  }
}
