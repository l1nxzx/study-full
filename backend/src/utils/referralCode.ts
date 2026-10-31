import { randomInt } from "node:crypto";

// Codes are typed by hand, so the alphabet leaves out look-alikes (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 12; // about 60 bits: not guessable

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** What people type: spaces, dashes and lower case are ignored. */
export function normalizeReferralCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** How a code is shown: XXXX-XXXX-XXXX. */
export function formatReferralCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}
