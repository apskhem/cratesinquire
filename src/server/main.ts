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
  // prepare precomputed scripts
  AppService.compileSass();
  AppService.compileTypeScript();

  // create app
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // set middlewares
  await Promise.all([
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

  await app.listen(process.env["PORT"] || 3000);
  Logger.log(`server listening: ${await app.getUrl()}`);

  if ("hot" in module) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
})();
