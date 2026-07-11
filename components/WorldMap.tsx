"use client";

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { getCountryByNumericId } from "@/lib/countries";

const WIDTH = 960;
const HEIGHT = 500;
const MOSAIC_COLS = 3;
const MOSAIC_ROWS = 3;
const TILE_SIZE = 9;

type CountryFeature = {
  type: "Feature";
  id?: string | number;
  properties: { name: string };
  geometry: Geometry;
};

type Props = {
  photosByCountry: Map<string, string[]>;
  selectedCode: string | null;
  onSelectCountry: (code: string | null, nameEn: string) => void;
};

export default function WorldMap({ photosByCountry, selectedCode, onSelectCountry }: Props) {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/countries-110m.json")
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const collection = feature(
          topology,
          topology.objects.countries
        ) as unknown as FeatureCollection;
        setFeatures(collection.features as CountryFeature[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { pathFor } = useMemo(() => {
    if (!features) return { pathFor: () => "" };
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: features as unknown as FeatureCollection["features"],
    };
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], collection);
    const path = geoPath(projection);
    return {
      pathFor: (f: CountryFeature) => path(f as unknown as never) ?? "",
    };
  }, [features]);

  if (!features) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center text-sm text-neutral-400">
        지도를 불러오는 중...
      </div>
    );
  }

  const MAX_TILES = MOSAIC_COLS * MOSAIC_ROWS;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="세계지도"
    >
      <defs>
        {Array.from(photosByCountry.entries()).map(([code, urls]) => {
          const uniqueUrls = urls.slice(0, MAX_TILES);
          const cols = Math.min(MOSAIC_COLS, Math.ceil(Math.sqrt(uniqueUrls.length)));
          const rows = Math.min(MOSAIC_ROWS, Math.ceil(uniqueUrls.length / cols));

          return (
            <pattern
              key={code}
              id={`mosaic-${code}`}
              patternUnits="userSpaceOnUse"
              width={cols * TILE_SIZE}
              height={rows * TILE_SIZE}
            >
              {uniqueUrls.map((url, i) => (
                <image
                  key={i}
                  href={url}
                  x={(i % cols) * TILE_SIZE}
                  y={Math.floor(i / cols) * TILE_SIZE}
                  width={TILE_SIZE}
                  height={TILE_SIZE}
                  preserveAspectRatio="xMidYMid slice"
                />
              ))}
            </pattern>
          );
        })}
      </defs>

      {features.map((f) => {
        const code = getCountryByNumericId(f.id ?? "")?.code;
        const isVisited = !!code && photosByCountry.has(code);
        const isSelected = !!code && code === selectedCode;

        const fill = isVisited ? `url(#mosaic-${code})` : undefined;
        const fillClass = isVisited ? "" : "fill-neutral-200 dark:fill-neutral-700";

        return (
          <path
            key={String(f.id ?? f.properties.name)}
            d={pathFor(f)}
            fill={fill}
            className={`transition-colors ${fillClass} ${
              isSelected
                ? "stroke-amber-500"
                : "stroke-white dark:stroke-neutral-900"
            } ${isVisited ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
            strokeWidth={isSelected ? 1.5 : 0.5}
            onClick={() => {
              if (!code) return;
              onSelectCountry(isSelected ? null : code, f.properties.name);
            }}
          />
        );
      })}
    </svg>
  );
}
