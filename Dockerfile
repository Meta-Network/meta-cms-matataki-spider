FROM denoland/deno:1.14.3

WORKDIR /app
USER deno

COPY deps.ts .
RUN deno cache --unstable deps.ts

ADD . .
RUN deno cache --unstable main.ts

CMD ["run", "--allow-net", "--allow-env", "--unstable", "main.ts"]
