// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATION CLIENT — Browser push subscription management
// ═══════════════════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Get current notification permission status
export function getPermissionStatus(): NotificationPermission {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

// Request notification permission
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";

  const permission = await Notification.requestPermission();
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;

  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    const permission = await requestPermission();
    if (permission !== "granted") return null;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    return subscription;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (err) {
    console.error("Push unsubscribe failed:", err);
    return false;
  }
}

// Get current subscription
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Convert subscription to JSON for Convex
export function subscriptionToJSON(subscription: PushSubscription): {
  endpoint: string;
  p256dh: string;
  auth: string;
} {
  const keys = subscription.getKey("p256dh");
  const authSecret = subscription.getKey("auth");

  return {
    endpoint: subscription.endpoint,
    p256dh: keys
      ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(keys))))
      : "",
    auth: authSecret
      ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authSecret))))
      : "",
  };
}
