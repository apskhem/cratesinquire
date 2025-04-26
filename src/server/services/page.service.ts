import axios, { AxiosError } from "axios";
import * as fs from "fs";
import * as path from "path";

export async function fetchCrateData(
  id: string
): Promise<CrateResponse | null> {
  try {
    const response = await axios.get<CrateResponse>(
      `https://crates.io/api/v1/crates/${id}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(error.response?.data);
    }
    return null;
  }
}

export async function fetchCrateWithVersionData(
  id: string,
  version: string
): Promise<CrateVersionResponse | null> {
  try {
    const response = await axios.get<CrateVersionResponse>(
      `https://crates.io/api/v1/crates/${id}/${version}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(error.response?.data);
    }
    return null;
  }
}

export async function fetchCrateDepsData(
  id: string,
  version: string
): Promise<DependenciesResponse | null> {
  try {
    const response = await axios.get<DependenciesResponse>(
      `https://crates.io/api/v1/crates/${id}/${version}/dependencies`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(error.response?.data);
    }
    return null;
  }
}

export function getAdvisoriesById(id: string): any[] {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, `./rustsec/${id}.json`),
      "utf-8"
    );
    const data = JSON.parse(raw);

    return data;
  } catch (error) {
    return [];
  }
}
