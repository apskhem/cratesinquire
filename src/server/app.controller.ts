import { Controller, Get, Header, Param, HttpStatus } from "@nestjs/common";
import { AppService } from "./app.service";
import fetch from "node-fetch";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @Header("content-type", "text/html")
  getHello() {
    return this.appService.renderIndex();
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
      return this.appService.renderNotFound(id, `Could not find "${id}" crate.`, HttpStatus.BAD_REQUEST);
    }

    const data = await this.appService.fetchCache(id);

    if ("errors" in data) {
      return this.appService.renderNotFound(id, `Could not find "${id}" crate.`, HttpStatus.NOT_FOUND);
    }

    return this.appService.renderCrate(data);
  }

  @Get("*")
  @Header("content-type", "text/html")
  getSummary() {
    return this.appService.renderNotFound("Unknown Route", "Unknown route.", HttpStatus.NOT_FOUND);
  }

  // @Get("/explore")
  // @Header("content-type", "text/html")
  // getSummary() {
  //   return this.appService.compileIndex();
  // }
}
