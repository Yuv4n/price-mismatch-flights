// Curated list of major airports for the route picker.
// Codes are IATA; the agent goal includes the city so it can recover
// if a site shows an unfamiliar code.

export interface Airport {
  code: string; // IATA
  city: string;
  name: string;
}

export const AIRPORTS: Airport[] = [
  { code: "LHR", city: "London", name: "Heathrow" },
  { code: "LGW", city: "London", name: "Gatwick" },
  { code: "MAN", city: "Manchester", name: "Manchester" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle" },
  { code: "ORY", city: "Paris", name: "Orly" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt" },
  { code: "MAD", city: "Madrid", name: "Barajas" },
  { code: "BCN", city: "Barcelona", name: "El Prat" },
  { code: "FCO", city: "Rome", name: "Fiumicino" },
  { code: "ZRH", city: "Zurich", name: "Zurich" },
  { code: "DUB", city: "Dublin", name: "Dublin" },
  { code: "JFK", city: "New York", name: "John F. Kennedy" },
  { code: "EWR", city: "Newark", name: "Newark Liberty" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles Intl" },
  { code: "SFO", city: "San Francisco", name: "San Francisco Intl" },
  { code: "ORD", city: "Chicago", name: "O'Hare" },
  { code: "MIA", city: "Miami", name: "Miami Intl" },
  { code: "YYZ", city: "Toronto", name: "Pearson" },
  { code: "YVR", city: "Vancouver", name: "Vancouver Intl" },
  { code: "DXB", city: "Dubai", name: "Dubai Intl" },
  { code: "DOH", city: "Doha", name: "Hamad Intl" },
  { code: "SIN", city: "Singapore", name: "Changi" },
  { code: "HND", city: "Tokyo", name: "Haneda" },
  { code: "NRT", city: "Tokyo", name: "Narita" },
  { code: "ICN", city: "Seoul", name: "Incheon" },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong Intl" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi" },
  { code: "SYD", city: "Sydney", name: "Kingsford Smith" },
  { code: "GRU", city: "São Paulo", name: "Guarulhos" },
  { code: "MEX", city: "Mexico City", name: "Benito Juárez" },
  { code: "JNB", city: "Johannesburg", name: "O.R. Tambo" },
];

export const DEFAULT_ORIGIN = "LHR";
export const DEFAULT_DESTINATION = "JFK";

export function isAirportCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value);
}

export function getAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}
