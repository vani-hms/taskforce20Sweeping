import jwt from "jsonwebtoken";
import { AuthClaims } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"; // replace in production
const ACCESS_EXPIRES_IN = "1h";

export function signAccessToken(payload: AuthClaims) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AuthClaims {
  return jwt.verify(token, JWT_SECRET) as AuthClaims;
}
