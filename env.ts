const env = Deno.env.toObject();

assertEnvironmentVariable("MATATAKI_API_PREFIX");
assertEnvironmentVariable("DB_HOST");
assertEnvironmentVariable("DB_USER");
assertEnvironmentVariable("DB_PASSWORD");
assertEnvironmentVariable("DB_DATABASE");
assertEnvironmentVariable("NATS_SERVER");

export const MATATAKI_API_PREFIX = env.MATATAKI_API_PREFIX;
export const DB_HOST = env.DB_HOST;
export const DB_USER = env.DB_USER;
export const DB_PASSWORD = env.DB_PASSWORD;
export const DB_DATABASE = env.DB_DATABASE;

export const NATS_SERVER = env.NATS_SERVER;

function assertEnvironmentVariable(name: string) {
  if (env[name])
    return;

  console.error(`Missing ${name} environment variable`);
  Deno.exit(1);
}
