export const MAIL_TRANSPORT = Symbol(`MAIL_TRANSPORT`);

export type MailTransportAttachment = {
  filename: string;
  content: Buffer | Uint8Array | string;
};

export type MailTransportSendOptions = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: MailTransportAttachment[];
};

export type MailTransportPort = {
  sendMail(options: MailTransportSendOptions): Promise<void>;
  verify(): Promise<void>;
};
