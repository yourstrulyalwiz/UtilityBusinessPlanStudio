import { useQuery } from "@tanstack/react-query";
export function useTestMode(){
  return useQuery<{openAccess:boolean;role:string|null}>({
    queryKey:["test-mode"],
    queryFn:async()=>{const r=await fetch("/api/test-mode",{credentials:"include"});if(!r.ok)throw new Error("Could not check access mode");return r.json();},
    staleTime:0,retry:1,
  });
}
export function TestBanner(){
  const mode=useTestMode();
  return mode.data?.openAccess ? <div role="status" className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-950">Test mode: open access, do not enter real or confidential data.</div>:null;
}
export function RoleSwitcher(){
  const mode=useTestMode();
  if(!mode.data?.openAccess)return null;
  return <label className="flex items-center gap-2 text-xs">View as
    <select aria-label="View as" className="rounded border bg-white px-2 py-1 text-slate-900" value={mode.data.role??"admin"} onChange={async e=>{
      const r=await fetch("/api/test-mode/role",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e.target.value})});
      if(!r.ok){alert("Could not change role.");return;}
      window.location.assign(import.meta.env.BASE_URL);
    }}>
      <option value="admin">Admin</option><option value="ttl">TTL</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
    </select>
  </label>;
}
