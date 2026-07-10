"use client";

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { getCountryByNumericId } from "@/lib/countries";

const WIDTH = 960;
const HEIGHT = 500;

type CountryFeature = {
  type: "Feature";
  id?: string | number;
  properties: { name: string };
  geometry: Geometry;
};

type Props = {
  visitedCodes: Set<string>;
  selectedCode: string | null;
  onSelectCountry: (code: string | null, nameEn: string) => void;
};

export default function WorldMap({ visitedCodes, selectedCode, onSelectCountry }: Props) {
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

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="세계지도"
    >
      {features.map((f) => {
        const code = getCountryByNumericId(f.id ?? "")?.code;
        const isVisited = !!code && visitedCodes.has(code);
        const isSelected = !!code && code === selectedCode;

        let fillClass = "fill-neutral-200 dark:fill-neutral-700";
        if (isVisited) fillClass = "fill-sky-400 dark:fill-sky-600";
        if (isSelected) fillClass = "fill-amber-500";

        return (
          <path
            key={String(f.id ?? f.properties.name)}
            d={pathFor(f)}
            className={`stroke-white transition-colors dark:stroke-neutral-900 ${fillClass} ${
              isVisited ? "cursor-pointer hover:fill-amber-400" : "cursor-default"
            }`}
            strokeWidth={0.5}
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
