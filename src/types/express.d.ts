declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
    interface Locals {
      idempotencyKey?: string;
    }
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody?: string;
  }
}

export {};
