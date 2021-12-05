import { Controller, Get, Param, HttpException, HttpStatus } from "@nestjs/common";
import { AppService } from "./app.service";
import fetch from "node-fetch";
import * as semver from "semver";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  async getHello() {
    return this.appService.getCompiledIndex();
  }

  @Get("/crates/:id")
  // :id format: <package-name>[@<version>?]
  async getCrateById(
    @Param("id") id: string
  ) {
    // extract id into parts
    const [ name, version ] = id.split("@");

    // validate semver
    if (version && !semver.valid(version)) {
      throw new HttpException("bad version format", HttpStatus.BAD_REQUEST);
    }

    // send request
    const res = version
      ? await fetch(`https://crates.io/api/v1/crates/${name}/${version}`)
      : await fetch(`https://crates.io/api/v1/crates/${name}`);
    
    // get json
    const data = await res.json();

    if (data.errors) {
      throw new HttpException("cannot get the specific crate", HttpStatus.NOT_FOUND);
    }

    // console.log(data);

    return this.appService.getCompiledCratesId(id, data, version);
  }

  @Get("/explore")
  async getSummary() {
    return this.appService.getCompiledIndex();
  }
}
