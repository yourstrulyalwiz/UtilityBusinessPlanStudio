import { useRef, useState } from "react";
import { useGetMetadata, useListUsers, getListUsersQueryKey, useRequestUploadUrl, useConfirmUpload, type UtilityInput } from "@workspace/api-client-react";
import { ImageUp, Loader2, X } from "lucide-react";
import { Field, inputCls, Btn } from "@/components/kit";
import { errMsg, logoUrl } from "@/lib/app";

const YEAR = new Date().getFullYear();
export const PLAN_YEARS = [YEAR - 1, YEAR, YEAR + 1, YEAR + 2, YEAR + 3];

export function useLogoUpload() {
  const req = useRequestUploadUrl();
  const confirm = useConfirmUpload();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File): Promise<string> => {
    if (!["image/png", "image/svg+xml"].includes(file.type)) throw new Error("Logo must be a PNG or SVG file.");
    if (file.size > 2 * 1024 * 1024) throw new Error("Logo must be 2 MB or smaller.");
    setBusy(true);
    try {
      const r = await req.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as "image/png" | "image/svg+xml" } });
      const put = await fetch(r.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Upload to storage failed.");
      await confirm.mutateAsync({ data: { objectPath: r.objectPath } });
      return r.objectPath;
    } finally {
      setBusy(false);
    }
  };
  return { upload, busy };
}

export function LogoPicker({ value, onChange }: { value: string | null; onChange: (p: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { upload, busy } = useLogoUpload();
  const [err, setErr] = useState("");
  const src = logoUrl(value);
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : src ? <img src={src} alt="Utility logo" className="h-full w-full object-contain p-1" /> : <ImageUp className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <Btn type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()} data-testid="button-upload-logo">{value ? "Replace" : "Upload logo"}</Btn>
          {value && <Btn type="button" variant="ghost" onClick={() => onChange(null)} data-testid="button-remove-logo"><X className="h-4 w-4" /></Btn>}
        </div>
        <input ref={ref} type="file" accept="image/png,image/svg+xml" className="hidden" data-testid="input-logo"
          onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            setErr("");
            try { onChange(await upload(f)); } catch (x) { setErr(errMsg(x)); }
          }} />
      </div>
      <div className={"mt-1.5 text-xs " + (err ? "text-destructive" : "text-muted-foreground")}>{err || "PNG or SVG, up to 2 MB. Uploaded before you save."}</div>
    </div>
  );
}

export function UtilityForm({ initial, submitLabel, pending, onSubmit, onCancel }: {
  initial?: Partial<UtilityInput>; submitLabel: string; pending?: boolean; onSubmit: (v: UtilityInput) => void; onCancel: () => void;
}) {
  const meta = useGetMetadata();
  const users = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const ttls = (users.data ?? []).filter((u) => (u.role === "ttl" || u.id === "00000000-0000-4000-8000-000000000001") && u.isActive);
  const [v, setV] = useState<UtilityInput>({
    name: "", shortName: "", countryIso3: "", serviceArea: "", ttlUserId: "", planYear: YEAR, currency: "USD", wbProjectId: "", logoPath: null, ...initial,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof UtilityInput>(k: K, val: UtilityInput[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.name.trim()) er.name = "Utility name is required.";
    if (!v.countryIso3) er.countryIso3 = "Select a country.";
    if (!v.serviceArea.trim()) er.serviceArea = "Service area is required.";
    if (!v.ttlUserId) er.ttlUserId = "Assign a Task Team Leader.";
    if ((v.shortName ?? "").length > 12) er.shortName = "12 characters maximum.";
    if (v.wbProjectId && !/^P\d{6}$/.test(v.wbProjectId)) er.wbProjectId = "Format: P followed by 6 digits, e.g. P178123.";
    setErrors(er);
    if (Object.keys(er).length) return;
    onSubmit({ ...v, name: v.name.trim(), serviceArea: v.serviceArea.trim(), shortName: v.shortName?.trim() || undefined, wbProjectId: v.wbProjectId || undefined, currency: v.currency || "USD" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Utility name" required error={errors.name}><input className={inputCls} value={v.name} maxLength={200} onChange={(e) => set("name", e.target.value)} data-testid="input-name" /></Field>
        <Field label="Short name" error={errors.shortName} hint="Up to 12"><input className={inputCls} value={v.shortName ?? ""} maxLength={12} onChange={(e) => set("shortName", e.target.value)} data-testid="input-short-name" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country" required error={errors.countryIso3} hint={meta.data?.countrySource ? `Source: ${meta.data.countrySource}` : undefined}>
          <select className={inputCls} value={v.countryIso3} data-testid="select-country"
            onChange={(e) => { const c = meta.data?.countries.find((x) => x.iso3 === e.target.value); setV((s) => ({ ...s, countryIso3: e.target.value, currency: c?.currencyCode || s.currency })); }}>
            <option value="">Select country…</option>
            {(meta.data?.countries ?? []).map((c) => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Service area" required error={errors.serviceArea}><input className={inputCls} value={v.serviceArea} maxLength={200} onChange={(e) => set("serviceArea", e.target.value)} data-testid="input-service-area" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Task Team Leader" required error={errors.ttlUserId}>
          <select className={inputCls} value={v.ttlUserId} onChange={(e) => set("ttlUserId", e.target.value)} data-testid="select-ttl">
            <option value="">{users.isLoading ? "Loading…" : ttls.length ? "Select TTL…" : "No TTLs yet — invite one"}</option>
            {ttls.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </Field>
        <Field label="Plan year" required>
          <select className={inputCls} value={v.planYear} onChange={(e) => set("planYear", Number(e.target.value))} data-testid="select-plan-year">
            {PLAN_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Currency"><input className={inputCls + " uppercase"} value={v.currency ?? ""} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} data-testid="input-currency" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WB project ID" error={errors.wbProjectId} hint="Optional, e.g. P178123"><input className={inputCls} value={v.wbProjectId ?? ""} maxLength={7} onChange={(e) => set("wbProjectId", e.target.value.toUpperCase())} data-testid="input-wb-project" /></Field>
      </div>
      <Field label="Logo"><LogoPicker value={v.logoPath ?? null} onChange={(p) => set("logoPath", p)} /></Field>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Btn type="button" variant="ghost" onClick={onCancel} data-testid="button-cancel">Cancel</Btn>
        <Btn type="submit" disabled={pending} data-testid="button-submit-utility">{pending ? "Saving…" : submitLabel}</Btn>
      </div>
    </form>
  );
}
