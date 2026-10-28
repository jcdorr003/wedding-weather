// Response schemas for NWS (api.weather.gov) and Open-Meteo: only the fields the page reads. Optional fields are
// nullish so a missing value never fails a whole forecast.
import * as z from 'zod/mini'

const str = z.nullish(z.string())
const num = z.nullish(z.number())

export const PointsSchema = z.object({
  properties: z.object({
    gridId: z.string(),
    gridX: z.number(),
    gridY: z.number(),
    forecast: str,
    forecastHourly: str,
    forecastGridData: str,
    radarStation: str,
    forecastZone: str,
    county: str,
  }),
})

export const PeriodSchema = z.object({
  startTime: z.string(),
  isDaytime: z.optional(z.boolean()),
  temperature: z.number(),
  probabilityOfPrecipitation: z.nullish(z.object({ value: num })),
  windSpeed: str,
  windDirection: str,
  shortForecast: str,
  detailedForecast: str,
})
export type Period = z.infer<typeof PeriodSchema>

export const ForecastSchema = z.object({
  properties: z.object({ updateTime: str, generatedAt: str, periods: z.array(PeriodSchema) }),
})

export const LayerSchema = z.nullish(z.object({ values: z.array(z.object({ validTime: z.string(), value: num })) }))
export type Layer = z.infer<typeof LayerSchema>

export const GridSchema = z.object({
  properties: z.object({
    quantitativePrecipitation: LayerSchema,
    windGust: LayerSchema,
    probabilityOfThunder: LayerSchema,
  }),
})

export const AlertsSchema = z.object({
  features: z.array(
    z.object({
      properties: z.nullish(
        z.object({
          status: str,
          messageType: str,
          event: str,
          headline: str,
          severity: str,
          ends: str,
          expires: str,
          parameters: z.nullish(z.object({ NWSheadline: z.nullish(z.array(z.string())) })),
        }),
      ),
    }),
  ),
})

export const EnsembleSchema = z.object({
  hourly: z.catchall(z.object({ time: z.array(z.string()) }), z.array(z.nullable(z.number()))),
})
