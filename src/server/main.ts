import * as path from "path";
import * as http from "http";

import { Router, createApi, mergeEndpointGroups } from "@apskhem/linz";
import serveStatic from "serve-static";
import { install } from "source-map-support";

import pageController from "./controllers/page.controller";
import apiController from "./controllers/api.controller";

// Enable source map support
install();

const app = new Router();

const port = process.env["PORT"] || 3000;

app.use("/", serveStatic(path.join(__dirname, "./public/"), {}));

const router = mergeEndpointGroups("", [pageController, apiController]);

createApi(app, router, {
  cors: true
});

http.createServer(app.handler()).listen(port);
