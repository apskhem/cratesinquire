import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import compression from "fastify-compress";
import { fastifyHelmet } from "fastify-helmet";
import * as helmet from "helmet";
import * as pug from "pug";
import { join } from "path";
import fastifyStatic from "fastify-static";
import httpsRedirect from "fastify-https-redirect";
import { AppModule } from "./app.module";

void (async () => {
  // create app
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // set middlewares
  await Promise.all([
    app.register(httpsRedirect),
    app.register(compression),
    app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "connect-src": [ "https://crates.io/" ]
        }
      }
    }),
    // app.register(fastifyStatic, {
    //   root: join(__dirname, "..", "public"),
    //   wildcard: false
    // }),
    app.setViewEngine({
      engine: { pug },
      templates: join(__dirname, "..", "src", "client", "templates")
    })
  ]);

  const host = process.env["HOST"] || "127.0.0.1";
  const port = process.env["PORT"] || 3000;
  await app.listen(port, host);
  Logger.log(`server listening: ${await app.getUrl()}`);
})();
