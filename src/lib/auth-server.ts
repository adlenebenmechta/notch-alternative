// VIP Emails - Users with these emails get admin access
export const VIP_EMAILS = new Set([
  'novaamz@gmail.com',
  'mecifmouhaned@gmail.com',
]);

export function isVIP(email: string | null | undefined): boolean {
  if (!email) return false;
  return VIP_EMAILS.has(email.toLowerCase().trim());
}

export function getUserRole(email: string | null | undefined): {
  role: 'admin' | 'user';
  plan: 'enterprise' | 'free';
  credits: number;
} {
  if (isVIP(email)) {
    return {
      role: 'admin',
      plan: 'enterprise',
      credits: 999999,
    };
  }
  return {
    role: 'user',
    plan: 'free',
    credits: 5,
  };
}
