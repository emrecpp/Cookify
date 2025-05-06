import { z } from 'zod';

/**
 * Schema for Cookie data
 */
export const cookieSchema = z.object({
  alias: z.string().min(1, { message: "Alias is required" }),
  name: z.string().min(1, { message: "Cookie name is required" }),
  value: z.string().min(1, { message: "Cookie value is required" }),
  url: z.string().optional(),
  domain: z.string().optional(),
  project: z.string().optional(),
  order: z.number().optional()
});

export type CookieSchema = z.infer<typeof cookieSchema>;

/**
 * Schema for Swagger data
 */
export const swaggerSchema = z.object({
  alias: z.string().min(1, { message: "Alias is required" }),
  urls: z.array(z.string()),
  bearerToken: z.string().min(1, { message: "Bearer token is required" }),
  autoLogin: z.enum(["true", "false"]).default("false"),
  project: z.string().optional(),
  order: z.number().optional()
});

export type SwaggerSchema = z.infer<typeof swaggerSchema>; 