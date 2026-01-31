import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    scope?: {
      wardIds?: number[]; // adjust this type based on your app
      // you can add other properties here if needed
    };
  }
}
