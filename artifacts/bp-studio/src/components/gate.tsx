import type { ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { useGetProfile, getGetProfileQueryKey, useBootstrapAdmin, useGetMetadata } from "@workspace/api-client-react";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, UserRoundX } from "lucide-react";
import { Glyph, Wave, Btn, Card } from "@/components/kit";
import { ProfileContext, errMsg, phaseColor } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";

function Endorsement({ light }: { light?: boolean }) {
  return (
    <div className={light ? "text-[11px] tracking-wide text-white/60" : "text-[11px] tracking-wide text-muted-foreground"}>
      Water Global Practice · Utility of the Future
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Glyph className="h-10 w-10 animate-pulse" />
        <Wave className="w-40" />
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <Glyph />
          <div>
            <div className="text-[15px] font-semibold text-[#002244]">UoF Business Plan Studio</div>
            <Endorsement />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function SignIn({ login }: { login: () => void }) {
  const meta = useGetMetadata();
  const phases = meta.data?.phases ?? [];
  return (
    <Frame>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-16 md:grid-cols-[1.15fr_1fr] md:px-12">
        <section className="rise">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#009FDA]">Secure workspace for task teams</div>
          <h1 className="text-[40px] font-semibold leading-[1.08] tracking-tight text-[#002244] md:text-[52px]">
            One registry for every utility business plan.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Register water and sanitation utilities, assign task teams, and follow each plan through the four phases of the
            Utility of the Future approach — with a full audit trail behind every change.
          </p>
          <Wave className="mt-8 max-w-sm" />
          <div className="mt-8 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            {(phases.length ? phases : [null, null, null, null]).map((p, i) => (
              <div key={p?.code ?? i} className="rounded-lg border bg-card p-3" style={{ borderTop: `3px solid ${phaseColor(p?.code ?? String(i + 1), i)}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase {i + 1}</div>
                <div className="mt-1 text-[13px] font-medium leading-snug text-[#002244]">{p ? p.name : <span className="inline-block h-3 w-16 animate-pulse rounded bg-muted" />}</div>
              </div>
            ))}
          </div>
        </section>
        <Card className="rise p-8 md:p-10" style={{ animationDelay: "120ms" }}>
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#002244] text-white"><LockKeyhole className="h-5 w-5" /></div>
          <h2 className="text-xl font-semibold text-[#002244]">Sign in to continue</h2>
          <p className="mt-2 text-sm text-muted-foreground">Access is provisioned by a Studio administrator. Use the account your invitation was issued to.</p>
          <Btn onClick={login} className="mt-7 h-11 w-full text-[15px]" data-testid="button-login">
            Log in <ArrowRight className="h-4 w-4" />
          </Btn>
          <ul className="mt-7 space-y-2.5 border-t pt-6 text-[13px] text-muted-foreground">
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-[#0E7C86]" /> Role-based access for administrators, TTLs, editors and viewers</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-[#0E7C86]" /> No portfolio data is shown until you are signed in</li>
          </ul>
        </Card>
      </main>
    </Frame>
  );
}

function Notice({ icon, title, body, children, logout }: { icon: ReactNode; title: string; body: ReactNode; children?: ReactNode; logout: () => void }) {
  return (
    <Frame>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="rise w-full max-w-md p-9 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#009FDA]/10 text-[#009FDA]">{icon}</div>
          <h2 className="text-lg font-semibold text-[#002244]">{title}</h2>
          <div className="mt-2 text-sm text-muted-foreground">{body}</div>
          {children}
          <Wave className="mx-auto mt-7 max-w-[140px]" />
          <button onClick={logout} className="mt-5 text-sm font-medium text-[#002244] underline-offset-4 hover:underline" data-testid="button-logout">Log out</button>
        </Card>
      </main>
    </Frame>
  );
}

export function Gate({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const profile = useGetProfile({ query: { enabled: isAuthenticated, queryKey: getGetProfileQueryKey(), retry: false } });
  const boot = useBootstrapAdmin({
    mutation: {
      onSuccess: (p) => { qc.setQueryData(getGetProfileQueryKey(), p); qc.invalidateQueries(); toast({ title: "Administrator access granted" }); },
      onError: (e) => toast({ title: "Setup failed", description: errMsg(e), variant: "destructive" }),
    },
  });

  if (isLoading) return <Splash />;
  if (!isAuthenticated) return <SignIn login={login} />;
  if (profile.isLoading) return <Splash />;
  const p = profile.data;
  if (!p) {
    return (
      <Notice logout={logout} icon={<KeyRound className="h-5 w-5" />} title="Awaiting an invitation"
        body={<>You are signed in, but your account has not been given access to the Studio yet. Ask a Studio administrator to invite you using this sign-in email.<div className="mt-3 text-xs opacity-80">{errMsg(profile.error, "")}</div></>}>
        <Btn variant="outline" className="mt-5" onClick={() => profile.refetch()} data-testid="button-recheck">Check again</Btn>
      </Notice>
    );
  }
  if (p.setupRequired) {
    return p.canBootstrap ? (
      <Notice logout={logout} icon={<ShieldCheck className="h-5 w-5" />} title="Finish workspace setup"
        body="No administrator exists yet. You are the designated initial administrator. This setup happens once and is recorded in the audit log.">
        <Btn className="mt-6 w-full" disabled={boot.isPending} onClick={() => boot.mutate()} data-testid="button-bootstrap">
          {boot.isPending ? "Setting up…" : "Become the first administrator"}
        </Btn>
      </Notice>
    ) : (
      <Notice logout={logout} icon={<KeyRound className="h-5 w-5" />} title="Workspace not yet set up"
        body={<>Administrator access must be assigned by the project owner before the registry opens. Your signed-in account ID is <strong className="break-all">{user?.id}</strong>. Ask the project owner to designate this account, then check again.</>}>
        <Btn variant="outline" className="mt-5" onClick={() => profile.refetch()}>Check again</Btn>
      </Notice>
    );
  }
  if (!p.person.isActive) {
    return <Notice logout={logout} icon={<UserRoundX className="h-5 w-5" />} title="Access deactivated" body="Your Studio access is currently inactive. Contact a Studio administrator if you believe this is a mistake." />;
  }
  return <ProfileContext.Provider value={p}>{children}</ProfileContext.Provider>;
}
