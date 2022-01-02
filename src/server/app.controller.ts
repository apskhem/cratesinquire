import { Controller, Get, Param, HttpStatus, HttpException, Render, UseFilters } from "@nestjs/common";
import { AppService } from "./app.service";
import { HttpExceptionFilter } from "./http-exception.filter";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @Render("index.pug")
  getHello() {
    return {};
  }

  @Get("/crates/:id")
  @UseFilters(HttpExceptionFilter)
  @Render("crate.pug")
  async getCrateById(@Param("id") id: string) {
    // only in development mode
    if (!this.appService.isProductionMode) {
      await this.appService.compilePreprocess();
    }

    // validate id
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new HttpException({
        title: id,
        msg: `Could not find "${id}" crate.`
      }, HttpStatus.BAD_REQUEST);
    }

    // fetch crate data
    const data = await this.appService.fetchCache(id);

    if ("errors" in data) {
      throw new HttpException({
        title: id,
        msg: `Could not find "${id}" crate.`
      }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Get("*")
  @UseFilters(HttpExceptionFilter)
  getSummary() {
    throw new HttpException({
      title: "Unknown Route",
      msg: "Unknown route."
    }, HttpStatus.NOT_FOUND);
  }

  // @Get("/explore")
  // @Header("content-type", "text/html")
  // getSummary() {
  //   return this.appService.compileIndex();
  // }
}
