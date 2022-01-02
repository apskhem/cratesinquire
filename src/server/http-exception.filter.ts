import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import type { } from "point-of-view";
import type { FastifyReply } from "fastify";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const msg = exception.getResponse() as Record<string, string>;
    const status = exception.getStatus();

    return await reply
      .code(status)
      .view("404.pug", { ...msg, status });
  }
}
