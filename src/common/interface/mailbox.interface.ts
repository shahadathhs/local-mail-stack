export interface MailboxMessage {
  id: string;
  subject: string;
  text: string;
  html: string;
  date: string;
  from: string;
  to: string;
  isRead: boolean;
  attachments?: {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }[];
}
