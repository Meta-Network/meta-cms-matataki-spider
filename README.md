# Meta-CMS-Matataki-Spider

A tiny services, for request/catch article and posts from third-party platform.

## Usage

### For production.

See [Dockerfile](./Dockerfile). build it and set the environment.

### For development.
Complete program environment. (including production service, target service, message service), please contact the system administrator/other project developers for assistance.

Run this command for in terminal:
```shell
MATATAKI_API_PREFIX=https://apitest.mttk.net NATS_SERVER='nats://127.0.0.1:4222' MATATAKI_COVER_PREFIX=https://ssimg.frontenduse.top DB_HOST="ls-cc91ffdb114ed61b34a327880ef1df5f75d4caa1.cbpzuz8ohv9x.ap-northeast-1.rds.amazonaws.com" DB_DATABASE=meta-cms-dev DB_USER=meta-cms DB_PASSWORD=ecea0cb7-87f5-43d3-bf14-84d222210d32 deno run --allow-net --allow-env --unstable main.ts
```
