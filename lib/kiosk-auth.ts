import { prisma } from "./db";

/**
 * Validates the X-Device-Token header for KIOSK role requests.
 * Returns true if:
 *   - No KioskDevices are registered yet (backward compat / initial setup)
 *   - The token matches a registered device
 * Returns false if devices exist but the token is missing or unrecognised.
 */
export async function isValidKioskDevice(req: Request): Promise<boolean> {
  const token = req.headers.get("X-Device-Token");
  const count = await (prisma as any).kioskDevice.count();
  if (count === 0) return true; // no devices registered — allow any (setup mode)
  if (!token) return false;
  const device = await (prisma as any).kioskDevice.findUnique({ where: { token } });
  return !!device;
}
