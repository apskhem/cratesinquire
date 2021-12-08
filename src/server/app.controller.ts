import { Controller, Get, Header, Param, HttpException, HttpStatus } from "@nestjs/common";
import { AppService } from "./app.service";
import fetch from "node-fetch";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @Header("content-type", "text/html")
  getHello() {
    return this.appService.compileIndex();
  }

  @Get("/crates/:id")
  @Header("content-type", "text/html")
  async getCrateById(@Param("id") id: string) {
    // validate id
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new HttpException("bad package name identifier format", HttpStatus.BAD_REQUEST);
    }

    // send request
    const res = await fetch(`https://crates.io/api/v1/crates/${id}`);
    
    // get json
    const data = await res.json();

    if (data.errors) {
      throw new HttpException("cannot get the specific crate", HttpStatus.NOT_FOUND);
    }

    return this.appService.compileCrate(data);
  }

  @Get("/explore")
  @Header("content-type", "text/html")
  getSummary() {
    return this.appService.compileIndex();
  }
}
