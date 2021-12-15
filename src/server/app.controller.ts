import { Controller, Get, Header, Param, HttpStatus } from "@nestjs/common";
import { AppService, PUG_404_PATH, PUG_CRATES_ID_PATH } from "./app.service";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @Header("content-type", "text/html")
  getHello() {
    return this.appService.generateIndex();
  }

  @Get("/crates/:id")
  @Header("content-type", "text/html")
  async getCrateById(@Param("id") id: string) {
    // only in development mode
    if (!this.appService.isProductionMode) {
      await this.appService.compilePreprocess();
    }

    // validate id
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return this.appService.generateStaticSite("404", PUG_404_PATH, {
        title: id,
        msg: `Could not find "${id}" crate.`,
        status: HttpStatus.BAD_REQUEST
      });
    }

    // fetch crate data
    const data = await this.appService.fetchCache(id);

    if ("errors" in data) {
      return this.appService.generateStaticSite("404", PUG_404_PATH, {
        title: id,
        msg: `Could not find "${id}" crate.`,
        status: HttpStatus.NOT_FOUND
      });
    }

    return this.appService.generateStaticSite("crate", PUG_CRATES_ID_PATH, { data });
  }

  @Get("*")
  @Header("content-type", "text/html")
  getSummary() {
    return this.appService.generateStaticSite("404", PUG_404_PATH, {
      title: "Unknown Route",
      msg: "Unknown route.",
      status: HttpStatus.NOT_FOUND
    });
  }

  // @Get("/explore")
  // @Header("content-type", "text/html")
  // getSummary() {
  //   return this.appService.compileIndex();
  // }
}
