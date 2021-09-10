const env = Deno.env.toObject();

assertEnvironmentVariable("DB_HOST");
assertEnvironmentVariable("DB_USER");
assertEnvironmentVariable("DB_PASSWORD");
assertEnvironmentVariable("DB_DATABASE");

export const DB_HOST = env.DB_HOST;
export const DB_USER = env.DB_USER;
export const DB_PASSWORD = env.DB_PASSWORD;
export const DB_DATABASE = env.DB_DATABASE;

function assertEnvironmentVariable(name: string) {
  if (env[name])
    return;

  console.error(`Missing ${name} environment variable`);
  Deno.exit(1);
}