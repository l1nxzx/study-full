import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Navigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import * as adminApi from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, InlineError } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

// Superadmin only. The page is hidden from everyone else, and the server refuses every admin
// request that isn't from a superadmin's current account, so this check is for the interface only.

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generatePassword(length = 14): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

const statusLabel: Record<adminApi.ReferralCode["status"], string> = {
  active: "Active",
  used_up: "Used up",
  revoked: "Revoked",
  expired: "Expired",
};

function CodesSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: codes, isPending, isError } = useQuery({ queryKey: ["admin", "codes"], queryFn: adminApi.listCodes, staleTime: 0 });
  const [maxUses, setMaxUses] = useState("1");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<adminApi.ReferralCode | null>(null);
  const [toRevoke, setToRevoke] = useState<adminApi.ReferralCode | null>(null);

  const create = useMutation({
    mutationFn: () =>
      adminApi.createCode({
        maxUses: Number(maxUses),
        ...(expires ? { expiresAt: new Date(`${expires}T23:59:59`).toISOString() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: (code) => {
      setCreated(code);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const revoke = useMutation({
    mutationFn: (code: string) => adminApi.revokeCode(code),
    onSuccess: () => {
      setToRevoke(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "codes"] });
    },
    onError: (err) => toast({ title: "Couldn't revoke the code", description: getErrorMessage(err), variant: "destructive" }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setCreated(null);
    create.mutate();
  }

  return (
    <Section title="Referral codes" description="Each code lets a new person sign up, up to the number of uses you choose.">
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[7rem_10rem_minmax(0,1fr)_auto] sm:items-end">
        <Field label="Uses" htmlFor="code-uses">
          <Input id="code-uses" type="number" min={1} max={100} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} required />
        </Field>
        <Field label="Expires (optional)" htmlFor="code-expires">
          <Input id="code-expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
        <Field label="Note (optional)" htmlFor="code-note" hint="Who it's for. Only you see this.">
          <Input id="code-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="e.g. for Anna" />
        </Field>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating..." : "Create code"}
        </Button>
      </form>
      <InlineError className="mt-3">{create.error ? getErrorMessage(create.error, "Couldn't create the code") : null}</InlineError>
      {created && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-accent/40 px-4 py-3">
          <span className="text-sm text-fg-muted">New code</span>
          <code className="font-mono text-base tracking-wider text-fg tabular">{created.display}</code>
          <Button variant="ghost" size="sm" onClick={() => void navigator.clipboard?.writeText(created.display)}>
            Copy
          </Button>
        </div>
      )}

      <div className="mt-8">
        {isPending && <Skeleton className="h-16 w-full" />}
        {isError && <InlineError>Couldn't load the codes.</InlineError>}
        {codes && codes.length === 0 && <EmptyState title="No codes yet" description="Create one above and give it to the person you're inviting." />}
        {codes && codes.length > 0 && (
          <ul className="divide-y divide-rule border-y border-rule">
            {codes.map((c) => (
              <li key={c.code} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-sm tracking-wider text-fg">{c.display}</p>
                  <p className="mt-0.5 text-meta text-fg-muted">
                    {statusLabel[c.status]} · {c.uses} of {c.maxUses} used
                    {c.expiresAt && ` · expires ${format(parseISO(c.expiresAt), "d MMM yyyy")}`}
                    {c.note && ` · ${c.note}`}
                  </p>
                  {c.redemptions.length > 0 && (
                    <p className="mt-1 text-meta text-fg-faint">
                      Used by {c.redemptions.map((r) => `${r.email} (${format(parseISO(r.at), "d MMM")})`).join(", ")}
                    </p>
                  )}
                </div>
                {c.status === "active" && (
                  <Button variant="ghost" size="sm" onClick={() => setToRevoke(c)} className="self-start">
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toRevoke !== null}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title={`Revoke ${toRevoke?.display ?? "this code"}?`}
        description="Nobody can sign up with it after this. People who already signed up keep their accounts."
        confirmLabel="Revoke code"
        onConfirm={() => toRevoke && revoke.mutate(toRevoke.code)}
        isLoading={revoke.isPending}
      />
    </Section>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: adminApi.AdminUser | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const reset = useMutation({
    mutationFn: () => adminApi.resetPassword(user!.id, password),
    onSuccess: () => {
      toast({ title: `Password changed for ${user!.email}`, description: "Their current sessions have ended." });
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      onClose();
    },
  });

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && !reset.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <DialogDescription>
            For {user?.email}. Their current sessions end, so they sign in again with this password. Send it to them yourself.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reset.mutate();
          }}
          className="space-y-4"
        >
          <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
            <div className="flex gap-2">
              <Input id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="off" required />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Generate
              </Button>
            </div>
          </Field>
          <InlineError>{reset.error ? getErrorMessage(reset.error, "Couldn't change the password") : null}</InlineError>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={reset.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={reset.isPending || password.length < 8}>
              {reset.isPending ? "Saving..." : "Set password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountsSection() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: users, isPending, isError } = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.listUsers, staleTime: 0 });
  const [resetFor, setResetFor] = useState<adminApi.AdminUser | null>(null);
  const [toToggle, setToToggle] = useState<adminApi.AdminUser | null>(null);

  const toggle = useMutation({
    mutationFn: (u: adminApi.AdminUser) => adminApi.setDisabled(u.id, !u.disabled),
    onSuccess: (_d, u) => {
      setToToggle(null);
      toast({ title: u.disabled ? `${u.email} can sign in again` : `${u.email} is disabled` });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast({ title: "Couldn't change the account", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Section title="Accounts" description="Everyone who has an account. Your own account can't be changed here.">
      <div className="mt-6">
        {isPending && <Skeleton className="h-24 w-full" />}
        {isError && <InlineError>Couldn't load the accounts.</InlineError>}
        {users && (
          <ul className="divide-y divide-rule border-y border-rule">
            {users.map((u) => {
              const isMe = u.id === me?.id;
              const locked = isMe || u.role === "superadmin";
              return (
                <li key={u.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">
                      {u.email}
                      {u.name && <span className="text-fg-muted"> · {u.name}</span>}
                    </p>
                    <p className="mt-0.5 text-meta text-fg-faint">
                      {isMe ? "You" : u.role === "superadmin" ? "Superadmin" : "Member"}
                      {" · "}
                      <span className={cn(u.disabled && "text-bad")}>{u.disabled ? "Disabled" : "Active"}</span>
                      {u.createdAt && ` · joined ${format(new Date(u.createdAt), "d MMM yyyy")}`}
                      {u.referralCodeId && ` · code ${u.referralCodeId.slice(0, 4)}-…`}
                    </p>
                  </div>
                  {!locked && (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setResetFor(u)}>
                        Reset password
                      </Button>
                      <Button variant="ghost" size="sm" className={cn(!u.disabled && "text-bad hover:text-bad")} onClick={() => setToToggle(u)}>
                        {u.disabled ? "Enable" : "Disable"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />
      <ConfirmDialog
        open={toToggle !== null}
        onOpenChange={(open) => !open && setToToggle(null)}
        title={toToggle?.disabled ? `Enable ${toToggle.email}?` : `Disable ${toToggle?.email ?? "this account"}?`}
        description={
          toToggle?.disabled
            ? "They can sign in again with their password."
            : "They are signed out everywhere and can't sign in until you enable the account again. Their data is kept."
        }
        confirmLabel={toToggle?.disabled ? "Enable" : "Disable"}
        destructive={!toToggle?.disabled}
        onConfirm={() => toToggle && toggle.mutate(toToggle)}
        isLoading={toggle.isPending}
      />
    </Section>
  );
}

function AuditSection() {
  const { data, isPending } = useQuery({ queryKey: ["admin", "audit"], queryFn: adminApi.listAudit, staleTime: 0 });
  const label = (a: string) =>
    ({ "referral_code.create": "Created a code", "referral_code.revoke": "Revoked a code", "user.disable": "Disabled an account", "user.enable": "Enabled an account", "user.password_reset": "Reset a password" })[a] ?? a;
  return (
    <Section title="Recent admin actions">
      <div className="mt-4">
        {isPending && <Skeleton className="h-10 w-full" />}
        {data && data.length === 0 && <p className="py-2 text-sm text-fg-faint">Nothing yet.</p>}
        {data && data.length > 0 && (
          <ul className="divide-y divide-rule">
            {data.slice(0, 30).map((a) => (
              <li key={a.id} className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-fg">{label(a.action)}</span>
                <span className="shrink-0 text-meta text-fg-faint tabular">{format(parseISO(a.at), "d MMM, HH:mm")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

export function AdminPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== "superadmin") return <Navigate to="/settings" replace />;
  return (
    <Page>
      <PageHeader back={{ to: "/settings", label: "Settings" }} title="Admin" description="Referral codes and accounts." />
      <div className="space-y-12">
        <CodesSection />
        <AccountsSection />
        <AuditSection />
      </div>
    </Page>
  );
}
