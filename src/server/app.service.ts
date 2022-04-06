import { Injectable } from "@nestjs/common";
import fetch from "node-fetch";
import NodeCache from "node-cache";

@Injectable()
export class AppService {
  private readonly crateCache = new NodeCache({ stdTTL: 600, checkperiod: 600 });

  async fetchCrate(id: string) {
    const raw = await fetch(`https://crates.io/api/v1/crates/${id}`);
    const data = await raw.json() as CrateResponse;

    return data;
  }

  async fetchCache(id: string) {
    const cachedCrate = this.crateCache.get<CrateResponse>(id);

    if (cachedCrate) {
      return cachedCrate;
    }
    
    const data = await this.fetchCrate(id);
    this.crateCache.set(id, data);

    return data;
  }
}
