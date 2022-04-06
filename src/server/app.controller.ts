import { Controller, Get, Param, Render, UseFilters, BadRequestException, NotFoundException } from "@nestjs/common";
import { AppService } from "./app.service";
import { HttpExceptionFilter } from "./http-exception.filter";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @Render("index.pug")
  getIndex() {
    return {};
  }

  @Get("/crates/:id")
  @UseFilters(HttpExceptionFilter)
  @Render("crate.pug")
  async getCrateById(@Param("id") id: string) {
    // validate id
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new BadRequestException({
        title: id,
        msg: `Could not find "${id}" crate.`
      });
    }

    // fetch crate data
    const data = await this.appService.fetchCache(id);

    if ("errors" in data) {
      throw new NotFoundException({
        title: id,
        msg: `Could not find "${id}" crate.`
      });
    }

    return { data };
  }

  @Get("*")
  @UseFilters(HttpExceptionFilter)
  getSummary() {
    throw new NotFoundException({
      title: "Unknown Route",
      msg: "Unknown route."
    });
  }

  // @Get("/explore")
  // @Header("content-type", "text/html")
  // getSummary() {
  //   return this.appService.compileIndex();
  // }
}
