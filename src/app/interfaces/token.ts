export interface TokenPayload {
  sub: string;
  roles: string;
  storeId: string;
  username: string;
  iat: number;
  exp: number;
  authorizations?: string;
  personName?: string;
  personRelationship?: string;
}
