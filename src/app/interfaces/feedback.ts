export type FeedbackType = 'BUG' | 'SUGGESTION' | 'IMPROVEMENT' | 'CRITICISM' | 'OTHER';

export type FeedbackStatus = 'NEW' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'DISCARDED';

export interface Feedback {
  id: string;
  storeId: string;
  storeName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  type: FeedbackType;
  title: string;
  description: string;
  currentRoute?: string;
  browserInfo?: string;
  screenResolution?: string;
  screenshotUrl?: string;
  status: FeedbackStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackCreatePayload {
  type: FeedbackType;
  title: string;
  description: string;
  currentRoute?: string;
  browserInfo?: string;
  screenResolution?: string;
  screenshotBase64?: string;
}

export interface FeedbackStatusUpdatePayload {
  status: FeedbackStatus;
  adminNotes?: string;
}
