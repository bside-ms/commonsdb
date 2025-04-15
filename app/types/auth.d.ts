declare module "#auth-utils" {
  interface User {
    id: string;
    username: string;
    roles: string[];
    email: user.email;
    firstname?: string;
    lastname?: string;
  }

  interface SecureSessionData {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
  }

  interface UserSession {
    loggedInAt: number;
  }
}

export {};
