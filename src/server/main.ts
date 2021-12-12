import {
  FastifyAdapter,
  NestFastifyApplication
} from "@nestjs/platform-fastify";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import compression from "fastify-compress";
import { fastifyHelmet } from "fastify-helmet";
import * as helmet from "helmet";
import { AppService } from "./app.service";

declare const module: any;

void (async () => {
  // create app
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // set middlewares
  await Promise.all([
    AppService.bundleSass(),
    AppService.bundleTypeScript(),
    app.register(compression),
    app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "connect-src": [ "https://crates.io/" ]
        }
      }
    })
  ]);

  const host = process.env["HOST"] || "127.0.0.1";
  const port = process.env["PORT"] || 3000;
  await app.listen(port, host);
  Logger.log(`server listening: ${await app.getUrl()}`);

  if ("hot" in module) {
    module.hot.accept();
    // module.hot.accept([ "/src/client/scripts/index.ts" ], () => {
    //   AppService.compileTypeScript();
    // });
    // module.hot.accept("/src/client/scss/main.scss", () => {
    //   console.log("change");
    // });
    module.hot.dispose(() => app.close());
  }
})();
