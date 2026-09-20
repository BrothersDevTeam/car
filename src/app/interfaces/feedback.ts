export type FeedbackType = 'BUG' | 'SUGGESTION' | 'IMPROVEMENT' | 'CRITICISM' | 'PRAISE' | 'OTHER';

export type FeedbackStatus = 'NEW' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'COMPLETED' | 'DISCARDED';

export interface FeedbackInteraction {
  id: string;
  feedbackId: string;
  authorType: 'USER' | 'ADMIN';
  userId?: string;
  userName?: string;
  message: string;
  statusTransition?: FeedbackStatus;
  createdAt: string;
}

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
  interactions?: FeedbackInteraction[];
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

export interface FeedbackClientReviewPayload {
  approved: boolean;
  comment?: string;
}

