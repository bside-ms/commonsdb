export interface KeycloakUser {
  sub: string;
  email_verified: boolean;
  roles: string[];
  name: string;
  preferred_username: string;
  given_name: string;
  locale: string;
  family_name: string;
  email: string;
}

export interface KeycloakToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
}

export enum KeycloakUserRoles {
  USER = "commonsdb_user",
  ADMIN = "commonsdb_admin",
}
