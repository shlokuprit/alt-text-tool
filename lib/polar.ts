import { Polar } from "@polar-sh/sdk";

let _polar: Polar | null = null;

export function getPolar(): Polar {
  if (_polar) return _polar;
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not configured");
  }
  const server = process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
  _polar = new Polar({ accessToken, server });
  return _polar;
}

export const CREDITS_PER_PURCHASE = Number(
  process.env.POLAR_CREDITS_PER_PURCHASE ?? 500,
);
