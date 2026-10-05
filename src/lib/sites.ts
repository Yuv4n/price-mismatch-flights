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

const momondo: FlightSite = {
  id: "momondo",
  name: "Momondo",
  buildUrl: (origin, destination, date) =>
    `https://www.momondo.com/flight-search/${origin}-${destination}/${date}?sort=price_a`,
};

const cheapflights: FlightSite = {
  id: "cheapflights",
  name: "Cheapflights",
  buildUrl: (origin, destination, date) =>
    `https://www.cheapflights.com/flight-search/${origin}-${destination}/${date}?sort=price_a`,
};

const expedia: FlightSite = {
  id: "expedia",
  name: "Expedia",
  buildUrl: (origin, destination, date) => {
    const [y, m, d] = date.split("-");
    return `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${origin},to:${destination},departure:${m}/${d}/${y}TANYT&passengers=adults:1&options=cabinclass:economy&mode=search`;
  },
};

const kiwi: FlightSite = {
  id: "kiwi",
  name: "Kiwi.com",
  buildUrl: (origin, destination, date) =>
    `https://www.kiwi.com/en/search/results/${origin}/${destination}/${date}/no-return?sortBy=price`,
};

const tripCom: FlightSite = {
  id: "trip-com",
  name: "Trip.com",
  buildUrl: (origin, destination, date) =>
    `https://www.trip.com/flights/showfarefirst?dcity=${origin.toLowerCase()}&acity=${destination.toLowerCase()}&ddate=${date}&triptype=ow&class=y&quantity=1&sort=price`,
};

const bookingCom: FlightSite = {
  id: "booking-com",
  name: "Booking.com",
  buildUrl: (origin, destination, date) =>
    `https://flights.booking.com/flights/${origin}.AIRPORT-${destination}.AIRPORT/?type=ONEWAY&adults=1&cabinClass=ECONOMY&depart=${date}&sort=CHEAPEST`,
};

export const SITES: FlightSite[] = [
  googleFlights,
  kayak,
  skyscanner,
  momondo,
  cheapflights,
  expedia,
  kiwi,
  tripCom,
  bookingCom,
];

export const DEFAULT_SITES: string[] = ["google-flights", "kayak"];

export function getSite(id: string): FlightSite | undefined {
  return SITES.find((s) => s.id === id);
}

export function isSiteId(value: unknown): value is string {
  return typeof value === "string" && SITES.some((s) => s.id === value);
}
