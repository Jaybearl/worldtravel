"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { getCountryByNumericId } from "@/lib/countries";

const WIDTH = 960;
const HEIGHT = 500;
const MOSAIC_COLS = 3;
const MOSAIC_ROWS = 3;
const MAX_TILES = MOSAIC_COLS * MOSAIC_ROWS;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

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
  const [isZoomed, setIsZoomed] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

  useEffect(() => {
    if (!features || !svgRef.current || !gRef.current) return;
    const g = gRef.current;

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .clickDistance(3)
      .on("zoom", (event) => {
        g.setAttribute("transform", event.transform.toString());
        setIsZoomed(event.transform.k > MIN_ZOOM);
      });

    zoomBehaviorRef.current = zoomBehavior;
    const svgSelection = select(svgRef.current);
    svgSelection.call(zoomBehavior);

    return () => {
      svgSelection.on(".zoom", null);
    };
  }, [features]);

  function handleResetZoom() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity);
  }

  if (!features) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center text-sm text-neutral-400">
        지도를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="세계지도"
      >
        <defs>
          {Array.from(photosByCountry.entries()).map(([code, urls]) => {
            const uniqueUrls = urls.slice(0, MAX_TILES);
            const cols = Math.min(MOSAIC_COLS, Math.ceil(Math.sqrt(uniqueUrls.length)));
            const rows = Math.min(MOSAIC_ROWS, Math.ceil(uniqueUrls.length / cols));
            const cellW = 1 / cols;
            const cellH = 1 / rows;

            return (
              // width/height=1 with objectBoundingBox units makes the pattern
              // tile exactly match the country shape's own bounding box, so
              // the collage fills it once instead of repeating like wallpaper.
              <pattern
                key={code}
                id={`mosaic-${code}`}
                patternUnits="objectBoundingBox"
                patternContentUnits="objectBoundingBox"
                width={1}
                height={1}
              >
                {uniqueUrls.map((url, i) => (
                  <image
                    key={i}
                    href={url}
                    x={(i % cols) * cellW}
                    y={Math.floor(i / cols) * cellH}
                    width={cellW}
                    height={cellH}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ))}
              </pattern>
            );
          })}
        </defs>

        <g ref={gRef}>
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
        </g>
      </svg>

      {isZoomed && (
        <button
          type="button"
          onClick={handleResetZoom}
          className="absolute right-2 top-2 rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-300"
        >
          확대 초기화
        </button>
      )}
    </div>
  );
}
