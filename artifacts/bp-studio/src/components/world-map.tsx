import { useState } from "react";
import { useLocation } from "wouter";
import { useListUtilities, getListUtilitiesQueryKey, type ListUtilitiesParams } from "@workspace/api-client-react";
import { MapPin, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { LAND_PATH, WORLD_W, WORLD_H } from "@/lib/world-land";
import { errMsg } from "@/lib/app";
import { cn } from "@/lib/utils";

const LAT = 9.65, LON = 123.85;
const MX = ((LON + 180) / 360) * WORLD_W;
const MY = ((90 - LAT) / 180 * WORLD_H);
const PARAMS: ListUtilitiesParams = { q: "Tagbilaran", country: "PHL", status: "active", page: "1" };

export function UtilityMap() {
  const [, navigate] = useLocation();
  const [zoom, setZoom] = useState(false);
  const q = useListUtilities(PARAMS, { query: { queryKey: getListUtilitiesQueryKey(PARAMS), staleTime: 60000 } });
  const u = (q.data?.items ?? []).find((x) => /tagbilaran|tcws/i.test(`${x.name} ${x.shortName ?? ""}`));
  const go = () => u && navigate(`/utilities/${u.id}`);
  const scale = zoom ? 5 : 1;
  const tx = zoom ? WORLD_W / 2 - MX * scale : 0;
  const ty = zoom ? WORLD_H / 2 - MY * scale : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#323D4F]/10 bg-gradient-to-b from-[#EAF6F7] to-[#F4F8FA]" data-testid="map-utilities">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Utility map</div>
          <div className="text-sm text-[#323D4F]">Showing Tagbilaran City Waterworks System</div>
        </div>
        <button type="button" onClick={() => setZoom((z) => !z)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#323D4F]/15 bg-white/80 px-3 text-xs font-medium text-[#323D4F] hover:bg-white" data-testid="button-map-zoom">
          {zoom ? <><Minimize2 className="h-3.5 w-3.5" /> World view</> : <><Maximize2 className="h-3.5 w-3.5" /> Zoom to Philippines</>}
        </button>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} className="block h-auto w-full" role="img" aria-label="World map with the location of Tagbilaran City Waterworks System, Philippines">
          <g style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transition: "transform 700ms cubic-bezier(.2,.7,.2,1)" }}>
            {[...Array(11)].map((_, i) => <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={WORLD_H} stroke="#127A80" strokeOpacity={0.06} strokeWidth={1 / scale} />)}
            {[...Array(6)].map((_, i) => <line key={`h${i}`} x1={0} y1={i * 100} x2={WORLD_W} y2={i * 100} stroke="#127A80" strokeOpacity={0.06} strokeWidth={1 / scale} />)}
            <path d={LAND_PATH} fill="#C9D6DF" stroke="#F4F8FA" strokeWidth={0.6 / scale} />
            {u && (
              <g transform={`translate(${MX} ${MY})`}>
                <circle r={14 / scale} fill="#1ED3D9" opacity={0.25} className="map-pulse" />
                <circle r={5 / scale} fill="#127A80" stroke="#F7F9FB" strokeWidth={1.5 / scale} />
              </g>
            )}
          </g>
        </svg>
        {u && (
          <button type="button" onClick={go} aria-label={`Open ${u.name} profile, Tagbilaran, Philippines`} data-testid={`marker-utility-${u.id}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#127A80]"
            style={{ left: `${(((zoom ? MX * scale + tx : MX)) / WORLD_W) * 100}%`, top: `${(((zoom ? MY * scale + ty : MY)) / WORLD_H) * 100}%`, transition: "left 700ms, top 700ms" }}>
            <span className="sr-only">{u.name}</span>
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-[#29323F] px-3 py-2 text-left text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="block font-semibold">{u.shortName || u.name}</span>
              <span className="block text-white/70">Tagbilaran, Philippines · 9.65N 123.85E</span>
              <span className="block text-[#1ED3D9]">Open utility profile</span>
            </span>
          </button>
        )}
        {(q.isLoading || q.isError || !u) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F4F8FA]/60 p-4">
            <div className={cn("max-w-xs rounded-xl border bg-white/95 px-4 py-3 text-center text-xs text-[#323D4F] shadow-sm", q.isLoading && "animate-pulse")}>
              {q.isLoading ? "Locating Tagbilaran City Waterworks System…" : q.isError ? (
                <>Map data could not load: {errMsg(q.error)}<button type="button" onClick={() => q.refetch()} className="mt-2 flex w-full items-center justify-center gap-1 font-medium text-[#127A80] hover:underline"><RotateCw className="h-3 w-3" /> Retry</button></>
              ) : <>Tagbilaran City Waterworks System is not in your active registry, so no map marker is shown.</>}
            </div>
          </div>
        )}
      </div>
      {u && (
        <button type="button" onClick={go} className="flex w-full items-center gap-2 border-t border-[#323D4F]/10 bg-white/60 px-5 py-3 text-left text-sm text-[#323D4F] hover:bg-white" data-testid={`link-map-utility-${u.id}`}>
          <MapPin className="h-4 w-4 text-[#127A80]" /><span className="truncate font-medium">{u.name}</span><span className="ml-auto shrink-0 text-xs text-[#127A80]">Open profile</span>
        </button>
      )}
    </div>
  );
}
