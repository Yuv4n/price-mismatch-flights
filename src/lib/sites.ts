// Flight search sites the agents visit. Each site gets one agent per country
// proxy, so differences come from where the visitor appears to be — not from
// the route, which is identical for every job.

export interface FlightSite {
  id: string;
  name: string;
  /** date is ISO YYYY-MM-DD */
  buildUrl: (origin: string, destination: string, date: string) => string;
}

const googleFlights: FlightSite = {
  id: "google-flights",
  name: "Google Flights",
  buildUrl: (origin, destination, date) =>
    `https://www.google.com/travel/flights?q=${encodeURIComponent(
      `Flights from ${origin} to ${destination} on ${date} one way`,
    )}`,
};

const kayak: FlightSite = {
  id: "kayak",
  name: "Kayak",
  buildUrl: (origin, destination, date) =>
    `https://www.kayak.com/flights/${origin}-${destination}/${date}?sort=price_a`,
};

const skyscanner: FlightSite = {
  id: "skyscanner",
  name: "Skyscanner",
  buildUrl: (origin, destination, date) => {
    const compact = date.replaceAll("-", "").slice(2); // YYYY-MM-DD → YYMMDD
    return `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${compact}/?adultsv2=1&cabinclass=economy&rtn=0`;
  },
};

export const SITES: FlightSite[] = [googleFlights, kayak, skyscanner];

export const DEFAULT_SITES: string[] = ["google-flights", "kayak"];

export function getSite(id: string): FlightSite | undefined {
  return SITES.find((s) => s.id === id);
}

export function isSiteId(value: unknown): value is string {
  return typeof value === "string" && SITES.some((s) => s.id === value);
}
