export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}
