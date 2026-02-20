import { getClientIp } from "get-client-ip";
import { UAParser } from "ua-parser-js";
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "pino";

export interface ClientDetailsType {
  ip: string;
  userAgent: string;
  location: string;
}

interface IpApiResponse {
  status: "success" | "fail";
  country?: string;
  city?: string;
}

// Assigns client details to the given request object.
export default async function assignClientDetails(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  let clientIp = getClientIp(req);
  if (!clientIp) {
    clientIp = "Unknown";
  }
  const userAgent = getUserAgent(req.headers["user-agent"]);
  const location = await getLocation(clientIp, req.log);

  req.clientDetails = {
    ip: clientIp ?? "",
    userAgent,
    location,
  };

  req.log.info("Client's ip, user agent, and location assigned.");

  next();
}

/**
 * Returns a string containing information about the browser, device, and OS based on the given user agent string.
 * If the user agent string is not provided, it returns a default string with unknown values.
 * @returns {string} - A string containing information about the browser, device, and OS.
 */
function getUserAgent(userAgentString: string | undefined): string {
  if (!userAgentString) {
    return "Browser: Unknown Browser Device: Unknown Device DeviceType: Unknown Device Type OS: Unknown OS";
  }

  const result = UAParser(userAgentString);
  const userAgent = `Browser: ${result.browser.name ?? "Unknown Browser"} ${result.browser.version ?? ""} Device: ${result.device.vendor ?? "Unknown Device"} ${result.device.model ?? ""} DeviceType: ${result.device.type ?? ""} OS:  ${result.os.name ?? ""} ${result.os.version ?? ""}`;
  return userAgent;
}

/**
 * Gets the location of the given ip address from ip-api.com.
 * @param {string | null} ip - The ip address to get the location of.
 * @param {Logger} log - The logger to log errors with.
 * @returns {Promise<string>} - A promise that resolves with the location of the given ip address.
 */
async function getLocation(ip: string | null, log: Logger): Promise<string> {
  if (!ip) {
    return "Unknown Location";
  }
  const url = `http://ip-api.com/json/${ip}?fields=status,country,city`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (dataIsIpApiResponseData(data)) {
      if (data.status === "fail" || (!data.city && !data.country))
        return "Unknown Location";

      if (!data.city) {
        return data.country ?? "Unknown Location";
      }
      if (!data.country) {
        return data.city ?? "Unknown Location";
      }

      return `${data.city ?? ""}, ${data.country ?? ""}`;
    } else {
      return "Unknown Location";
    }
  } catch (error) {
    log.error({ error }, "Error getting location from ip-api.");
    return "Unknown Location";
  }
}

/**
 * Checks if the given data is an IpApiResponse object.
 * This function only checks if the given data is an object and has a "status" property.
 * It does not check for the presence of other properties like "country" or "city".
 * @param data - The data to check.
 * @returns True if the given data is an IpApiResponse object, false otherwise.
 */
function dataIsIpApiResponseData(data: unknown): data is IpApiResponse {
  // We only check for status because API returns only the status on failure.
  if (typeof data === "object" && data && "status" in data) {
    return true;
  }
  return false;
}
