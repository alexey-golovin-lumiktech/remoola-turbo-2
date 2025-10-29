export interface RefreshTokenPayload {
  sub: string;
  phone: string;
  exp: number;
  iat: number;
}
