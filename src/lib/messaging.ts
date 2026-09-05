export type SendResult =
  | { ok: true }
  | { ok: false; error: string };

export type SmsInput = {
  to: string;
  body: string;
};

export type EmailInput = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Provider-agnostic messaging. Swap StubMessageProvider for Twilio/etc later.
 */
export interface MessageProvider {
  sendSms(input: SmsInput): Promise<SendResult>;
  sendEmail(input: EmailInput): Promise<SendResult>;
}

export class StubMessageProvider implements MessageProvider {
  async sendSms(input: SmsInput): Promise<SendResult> {
    console.info("[MessageProvider:stub] SMS", {
      to: input.to,
      body: input.body,
    });
    return { ok: true };
  }

  async sendEmail(input: EmailInput): Promise<SendResult> {
    console.info("[MessageProvider:stub] Email", {
      to: input.to,
      subject: input.subject,
      body: input.body,
    });
    return { ok: true };
  }
}

let provider: MessageProvider = new StubMessageProvider();

export function getMessageProvider(): MessageProvider {
  return provider;
}

/** Test/helper hook so a real provider can replace the stub later. */
export function setMessageProvider(next: MessageProvider) {
  provider = next;
}
