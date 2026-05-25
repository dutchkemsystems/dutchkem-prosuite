// src/components/KoraPayment.jsx
import { useState } from 'react';

// Hardcoded API URL (temporary fix for import.meta error)
// Change this to your actual backend URL if different
const API_URL = 'https://dutchkem-prosuite.onrender.com';

export const KoraPayment = ({ amount, email, phone, name, onSuccess, onError, buttonText, className }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('[KORA] Initiating payment...');
            console.log('[KORA] Amount: ₦' + amount);
            console.log('[KORA] API URL:', API_URL);

            // Prepare request body
            const requestBody = {
                amount: amount,
                email: email || 'customer@dutchkem.com',
                phone: phone || '2348121161202',
                name: name || 'Dutchkem Customer'
            };

            console.log('[KORA] Request body:', requestBody);

            // Call your backend
            const response = await fetch(`${API_URL}/api/payments/kora/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log('[KORA] Response:', data);

            if (data.success && data.authorization_url) {
                // Redirect to Kora checkout page
                window.location.href = data.authorization_url;
                if (onSuccess) onSuccess(data);
            } else {
                throw new Error(data.message || 'Payment initialization failed');
            }
        } catch (err) {
            console.error('[KORA] Payment error:', err);
            setError(err.message);
            if (onError) onError(err.message);
            alert('Could not connect to payment server. Please try again.\n\nError: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="kora-payment-container">
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
                    ⚠️ {error}
                </div>
            )}
            <button
                onClick={handlePayment}
                disabled={loading}
                className={className || "w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </span>
                ) : (
                    buttonText || `Pay ₦${amount.toLocaleString()}`
                )}
            </button>
        </div>
    );
};

export default KoraPayment;