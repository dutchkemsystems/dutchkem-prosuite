export function getDeviceFingerprint() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
    new Date().getTimezoneOffset(),
  ];

  const raw = parts.join('|||');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  return {
    fingerprint: Math.abs(hash).toString(36),
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency,
  };
}
