import { type FormEvent, useState } from "react";
import * as authApi from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { ScheduleIntegrationCard } from "@/components/settings/ScheduleIntegrationCard";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { InlineError } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/hooks/usePreferences";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { READING_FONTS, UI_FONTS } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import type { ReadingFont, UiFont } from "@/types";

function ProfileNameForm({ initialName }: { initialName: string | null }) {
  const [name, setName] = useState(initialName ?? "");
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateProfile();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateProfile.mutateAsync(name.trim() || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Field label="Display name" htmlFor="display-name" className="flex-1">
        <Input id="display-name" placeholder="e.g. Alex" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <Button type="submit" variant="outline" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving..." : saved ? "Saved" : "Save"}
      </Button>
    </form>
  );
}

function FontSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const reading = preferences.readingFont ?? "literata";
  const ui = preferences.uiFont ?? "instrument";

  return (
    <SettingsSection
      title="Fonts"
      description="The reading font is used for notes, assistant answers, quizzes and tests. Saved to your account, so it follows you to every device."
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-[0.8125rem] font-medium text-fg-muted">Reading font</legend>
          <div role="radiogroup" aria-label="Reading font" className="divide-y divide-rule border-y border-rule">
            {(Object.keys(READING_FONTS) as ReadingFont[]).map((key) => {
              const font = READING_FONTS[key];
              const selected = reading === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updatePreferences({ readingFont: key })}
                  className={cn("flex w-full items-start gap-3 px-2 py-3 text-left transition-colors", selected ? "bg-accent/[0.08]" : "hover:bg-tint/60")}
                >
                  <span
                    aria-hidden
                    className={cn("mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-accent-fill" : "border-rule-strong")}
                  >
                    {selected && <span className="size-2 rounded-full bg-accent-fill" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[1.0625rem] leading-snug text-fg" style={{ fontFamily: font.stack }}>
                      {font.label} - the discriminant decides how many roots there are.
                    </span>
                    <span className="mt-0.5 block text-meta text-fg-faint">{font.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <p className="mb-2 text-[0.8125rem] font-medium text-fg-muted">Interface font</p>
          <Segmented
            label="Interface font"
            value={ui}
            onChange={(v) => updatePreferences({ uiFont: v as UiFont })}
            options={(Object.keys(UI_FONTS) as UiFont[]).map((k) => ({ value: k, label: UI_FONTS[k].label }))}
          />
        </div>
      </div>
    </SettingsSection>
  );
}

function SidebarSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const count = String(preferences.sidebarSubjectCount ?? 6);
  return (
    <SettingsSection
      title="Sidebar"
      description="How many subjects the sidebar lists before Show more. Right-click or long-press a subject there to pin it to the top or change the order."
    >
      <Segmented
        label="Subjects shown"
        value={count}
        onChange={(v) => updatePreferences({ sidebarSubjectCount: Number(v) })}
        options={[
          { value: "4", label: "4" },
          { value: "6", label: "6" },
          { value: "8", label: "8" },
          { value: "12", label: "12" },
          { value: "0", label: "All" },
        ]}
      />
    </SettingsSection>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setStatus({ type: "success", message: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setStatus({ type: "error", message: getErrorMessage(err, "Could not update password") });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Page>
      <PageHeader title="Settings" className="mb-2 lg:mb-4" />

      <SettingsSection title="Account" description={`Signed in as ${user?.email ?? ""}. Your name is used in the greeting on the overview.`}>
        {user && <ProfileNameForm initialName={user.name} />}
      </SettingsSection>

      {user?.role === "superadmin" && (
        <SettingsSection title="Admin" description="Referral codes for new people, and the accounts.">
          <Button variant="outline" asChild>
            <Link to="/admin">Open the admin panel</Link>
          </Button>
        </SettingsSection>
      )}

      <SettingsSection title="Appearance" description="How Study looks on this device.">
        <Segmented
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "Match system" },
          ]}
        />
      </SettingsSection>

      <FontSettings />

      <SidebarSettings />

      <ScheduleIntegrationCard />

      <SettingsSection title="Password" description="At least 8 characters.">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Current password" htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="New password" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Field>
          {status?.type === "error" && <InlineError>{status.message}</InlineError>}
          {status?.type === "success" && <p className="text-sm text-ok">{status.message}</p>}
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </SettingsSection>
    </Page>
  );
}
