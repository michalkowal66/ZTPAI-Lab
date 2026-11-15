const { z } = require("zod");

try {
  process.loadEnvFile();
} catch {}

const envSchema = z.object({
  DATABASE_URL: z.string()
    .refine(value => /^postgres(ql)?:\/\/.+@.+\/.+/.test(value), {
      message: "must be a valid postgres connection string (postgres://user:pass@host:port/db)"
    }),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().min(1).default("15m"),
  PORT: z.coerce.number().int().positive().default(3000)
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration. Fix the following and restart:");
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

module.exports = { config: result.data };
