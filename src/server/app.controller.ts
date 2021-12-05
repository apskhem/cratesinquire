import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  getHello(): string {
    return this.appService.getCompiledIndex();
  }

  @Get("/crates/:id")
  // :id format: <package-name>[@<version>?]
  getCrateById(): string {
    return this.appService.getCompiledIndex();
  }

  @Get("/summary")
  getSummary(): string {
    return this.appService.getCompiledIndex();
  }
}
