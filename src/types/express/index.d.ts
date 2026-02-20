import type { Logger } from "pino";
import type { ClientDetailsType } from "../../middlewares/assignClientDetails.ts";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      requestId: string;
      clientDetails?: ClientDetailsType;
    }
  }
}

export {};
