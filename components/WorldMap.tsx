"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { getCountryByNumericId } from "@/lib/countries";
import MapSearch, { type CityIndexEntry } from "@/components/MapSearch";
import CountryInfoPanel from "@/components/CountryInfoPanel";

const WIDTH = 960;
const HEIGHT = 500;
const MOSAIC_COLS = 3;
const MOSAIC_ROWS = 3;
const MAX_TILES = MOSAIC_COLS * MOSAIC_ROWS;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const FOCUS_FIT_RATIO = 0.6; // target country fills ~60% of the viewport when focused

type CountryFeature = {
  type: "Feature";
  id?: string | number;
  properties: { name: string };
  geometry: Geometry;
};

type Props = {
  photosByCountry: Map<string, string[]>;
  cityIndex: CityIndexEntry[];
  selectedCode: string | null;
  onSelectCountry: (code: string | null, nameEn: string) => void;
};

// Natural Earth bundles a country's overseas territories into the same
// multipolygon as its mainland. France's feature (id 250) includes French
// Guiana (South America), Martinique/Guadeloupe (Caribbean), and Mayotte/
// Réunion (Indian Ocean, near Africa) alongside mainland Europe and
// Corsica - all of which read as stray patches far from the rest of the
// country. All of those territories sit south of latitude 35°N, while
// mainland France and Corsica don't, so filter rings on that basis.
function dropFarFlungTerritories(f: CountryFeature): CountryFeature {
  if (f.id !== "250" || f.geometry.type !== "MultiPolygon") return f;

  const coordinates = (f.geometry.coordinates as number[][][][]).filter((polygon) => {
    const lats = polygon[0].map(([, lat]) => lat);
    return Math.max(...lats) > 35;
  });

  return { ...f, geometry: { ...f.geometry, coordinates } };
}

export default function WorldMap({
  photosByCountry,
  cityIndex,
  selectedCode,
  onSelectCountry,
}: Props) {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/countries-50m.json")
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const collection = feature(
          topology,
          topology.objects.countries
        ) as unknown as FeatureCollection;
        setFeatures(
          (collection.features as CountryFeature[]).map(dropFarFlungTerritories)
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { pathFor, centroidFor, boundsFor } = useMemo(() => {
    if (!features) {
      return { pathFor: () => "", centroidFor: () => null, boundsFor: () => null };
    }
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: features as unknown as FeatureCollection["features"],
    };
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], collection);
    const path = geoPath(projection);
    return {
      pathFor: (f: CountryFeature) => path(f as unknown as never) ?? "",
      centroidFor: (f: CountryFeature) => path.centroid(f as unknown as never),
      boundsFor: (f: CountryFeature) => path.bounds(f as unknown as never),
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

  // Center and zoom in on whichever country becomes selected, whether that
  // came from clicking the map or picking a result in the search box.
  useEffect(() => {
    if (!selectedCode || !features || !svgRef.current || !zoomBehaviorRef.current) return;

    const target = features.find(
      (f) => getCountryByNumericId(f.id ?? "")?.code === selectedCode
    );
    if (!target) return;

    const centroid = centroidFor(target);
    const bounds = boundsFor(target);
    if (!centroid || !bounds || centroid.some((n) => Number.isNaN(n))) return;

    const [[x0, y0], [x1, y1]] = bounds;
    const boxWidth = Math.max(x1 - x0, 1);
    const boxHeight = Math.max(y1 - y0, 1);
    const fitScale = FOCUS_FIT_RATIO * Math.min(WIDTH / boxWidth, HEIGHT / boxHeight);
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitScale));

    const [cx, cy] = centroid;
    const transform = zoomIdentity.translate(WIDTH / 2 - cx * k, HEIGHT / 2 - cy * k).scale(k);
    select(svgRef.current).call(zoomBehaviorRef.current.transform, transform);
  }, [selectedCode, features, centroidFor, boundsFor]);

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
        className="h-auto w-full touch-none select-none rounded-lg bg-sky-100 dark:bg-slate-800"
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
                key={`${f.properties.name}-${String(f.id ?? "")}`}
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

      <div className="absolute left-2 top-2 w-36 sm:w-48">
        <MapSearch value={selectedCode ?? ""} cityIndex={cityIndex} onSelect={onSelectCountry} />
      </div>

      {isZoomed && (
        <button
          type="button"
          onClick={handleResetZoom}
          className="absolute right-2 top-2 rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-300"
        >
          확대 초기화
        </button>
      )}

      {selectedCode && <CountryInfoPanel key={selectedCode} code={selectedCode} />}
    </div>
  );
}
