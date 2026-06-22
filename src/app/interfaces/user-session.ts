export interface UserSession {
  sessionId: string;
  user: {
    userId: string;
    email: string;
    userStatus: string;
    imageUrl?: string;
    person?: {
      personId: string;
      name: string;
      nickName?: string;
      email?: string;
      phone?: string;
      relationship?: string;
      legalEntity: boolean;
    };
  };
  ipAddress: string;
  userAgent: string;
  storeName: string;
  createdAt: string; // ISO DateTime UTC
  expiresAt: string; // ISO DateTime UTC
}
