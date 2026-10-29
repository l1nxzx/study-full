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
import { useTheme } from "@/hooks/useTheme";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";

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
