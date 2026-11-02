export interface AuthUserPayload {
  id: string;
  email?: string | null;
  phone?: string | null;
  /** Tenant selected and resolved server-side for this request. */
  tenantId?: string;
  membershipId?: string;
  role?: string | null;
  permissions: string[];
  isPlatformAdmin?: boolean;
  tokenVersion?: number;
}
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUserPayload {}
    interface Request {
      clientIp?: string;
    }
  }
}
