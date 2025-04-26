import * as d3 from "d3";

type DataPayload = CrateResponse & {
  advisories: any[];
};

export const consumeProps = (id: string): DataPayload => {
  const dataInputEl = d3.select(`#${id}`);
  const mainData = JSON.parse(dataInputEl.attr("value"));

  dataInputEl.remove();

  return mainData as DataPayload;
};
