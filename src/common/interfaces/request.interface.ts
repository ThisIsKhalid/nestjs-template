export interface AuthUserPayload {
  id: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  permissions: string[];
  tokenVersion?: number;
}

declare global {
  namespace Express {
    // Merges with Passport's Express.User
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUserPayload {}

    interface Request {
      clientIp?: string;
    }
  }
}
