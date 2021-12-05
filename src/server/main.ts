import type { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import * as compression from "compression";
import * as helmet from "helmet";
import { AppService } from "./app.service";

(async () => {
  // prepare precomputed scripts
  AppService.compileSass();
  AppService.compileTypeScript();

  // create app
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // set middlewares
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "connect-src": [ "https://crates.io/" ]
      }
    }
  }));

  await app.listen(3000);
  Logger.log(`server listening: ${await app.getUrl()}`);
})();
