import { Controller, Get, Param, HttpException, HttpStatus } from "@nestjs/common";
import { AppService } from "./app.service";
import fetch from "node-fetch";
import * as semver from "semver";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  async getHello() {
    return this.appService.compileIndex();
  }

  @Get("/crates/:id")
  // :id format: <package-name>[@<version>?]
  async getCrateById(
    @Param("id") id: string
  ) {
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
  async getSummary() {
    return this.appService.compileIndex();
  }
}
