const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Kora API configuration
const KORA_API_BASE = 'https://api.korahq.com';
const KORA_SECRET_KEY = process.env.KORA_SECRET_KEY;
const KORA_PUBLIC_KEY = process.env.KORA_PUBLIC_KEY;
const KORA_ENCRYPTION_KEY = process.env.KORA_ENCRYPTION_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dutchkem-prosuite-app.vercel.app';

// Initialize Kora payment
router.post('/kora/initiate', async (req, res) => {
    try {
        const { amount, email, phone, name, plan } = req.body;

        if (!KORA_SECRET_KEY) {
            return res.status(503).json({ 
                success: false, 
                message: 'Payment service not configured. Please contact support.' 
            });
        }

        const payload = {
            amount: amount,
            currency: 'NGN',
            customer: {
                email: email,
                phone: phone,
                name: name
            },
            payment_method: 'subscription',
            recurring: {
                frequency: 'monthly',
                duration: 'indefinite'
            },
            callback_url: `${FRONTEND_URL}/payment/success`,
            webhook_url: `${process.env.BACKEND_URL || 'https://dutchkem-prosuite.onrender.com'}/api/payments/kora/webhook`
        };

        const response = await fetch(`${KORA_API_BASE}/api/v1/transaction/initiate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KORA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.status && data.data && data.data.authorization_url) {
            res.json({
                success: true,
                authorization_url: data.data.authorization_url,
                reference: data.data.reference
            });
        } else {
            throw new Error(data.message || 'Payment initialization failed');
        }
    } catch (error) {
        console.error('[KORA] Payment error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not connect to payment server. Please try again.'
        });
    }
});

// Kora webhook handler
router.post('/kora/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-kora-signature'];
        const payload = JSON.stringify(req.body);
        
        const expectedSignature = crypto
            .createHmac('sha256', KORA_ENCRYPTION_KEY)
            .update(payload)
            .digest('hex');

        if (signature !== `sha256=${expectedSignature}`) {
            console.error('[KORA] Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { event, data } = req.body;

        console.log(`[KORA WEBHOOK] Event: ${event} | Reference: ${data?.reference}`);

        switch (event) {
            case 'subscription.created':
            case 'charge.success':
                console.log(`[KORA] ✅ Payment successful: ${data?.amount} NGN`);
                // TODO: Update user subscription in database
                break;
                
            case 'charge.failed':
                console.log(`[KORA] ❌ Payment failed: ${data?.reference}`);
                break;
                
            case 'transfer.reversed':
                console.log(`[KORA] 🚨 REVERSAL detected: ${data?.reference}`);
                // TODO: Revoke user access
                break;
                
            default:
                console.log(`[KORA] Unhandled event: ${event}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[KORA] Webhook error:', error.message);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;