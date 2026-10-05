# Travel reference catalogs

These checked-in JSON catalogs are the shared canonical source for frontend
selection and CRUD validation. Runtime reads use bundled/static data only; they
do not call a model or a provider.

## Countries

- Snapshot date: 2026-10-05.
- Source: IANA Time Zone Database `iso3166.tab`, version 2025b, distributed
  with the system tzdata package. The file lists ISO 3166-1 alpha-2 identifiers
  and names; the snapshot contains all 249 assigned two-letter entries.
- Filtering: omit comment and blank lines, uppercase the two-letter code, then
  sort by case-insensitive name and code. JSON fields are `code` and `name`.
- The source file declares itself public domain. Names are presentation labels;
  codes are canonical identifiers.

## Interests

- Snapshot date: 2026-10-05.
- Source: Travella's curated starter list from the selected onboarding design.
- Filtering: 20 manually selected starter labels; IDs are lowercase stable
  slugs; icons are presentation-only Unicode symbols. JSON fields are `id`,
  `label`, and `icon`.

## Airports

- Snapshot date: 2026-10-05; OurAirports reported its download files last
  modified 2026-10-04.
- Source: [OurAirports open data](https://ourairports.com/data/),
  [`airports.csv`](https://davidmegginson.github.io/ourairports-data/airports.csv).
- License: public domain. OurAirports makes no guarantee of accuracy or fitness
  for use.
- Deterministic filter: `scheduled_service` is `yes`; `iata_code` is exactly
  three ASCII letters; name and `iso_country` are present; latitude and
  longitude parse as finite numbers in geographic ranges; IATA code is unique.
  Rows are sorted by IATA code. The filter intentionally allows all airport
  types that meet those conditions, including cross-border options.
- JSON fields are `code`, `name`, `lat`, `lng`, and `country`. Coordinates are
  catalog coordinates used for approximate straight-line ranking only; they do
  not represent a route or guarantee current service.

Refresh catalogs deliberately and review the source/date/filter before changing
these snapshots. Do not download catalog data at runtime.
