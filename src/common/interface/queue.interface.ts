import { QueueEventsEnum } from '../enum/queue-events.enum';

export interface MailboxSetupPayload {
  userId: string;
  email: string;
}

export interface Meta {
  performedBy: string; // System or any user
  recordType: string; // Prisma model
  recordId: string; // Prisma model ID
  others?: Record<string, any>; // Additional data
  [key: string]: any; // Allow extra fields
}

export interface NotificationPayload {
  type: QueueEventsEnum;
  title: string;
  message: string;
  createdAt: Date;
  meta: Meta;
}

export interface QueuePayload extends NotificationPayload {
  recipients: { id: string }[];
}
