import {
  BookOpenCheck,
  CalendarDays,
  Flame,
  Languages,
  Mail,
  UserCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/70 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 truncate font-bold text-ink">{value || "Not set"}</p>
    </div>
  </div>
);

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink text-2xl font-extrabold text-white">
              {(user?.name || "L").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="subtle-label">Profile</p>
              <h1 className="mt-1 text-3xl font-extrabold text-ink sm:text-4xl">
                {user?.name}
              </h1>
              <p className="mt-2 text-sm text-muted">{user?.email}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
            {user?.role || "student"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailRow icon={Mail} label="Email" value={user?.email} />
        <DetailRow icon={BookOpenCheck} label="Field" value={user?.course} />
        <DetailRow icon={CalendarDays} label="Year" value={`Year ${user?.year}`} />
        <DetailRow
          icon={Languages}
          label="Video language"
          value={user?.preferences?.videoLanguage || "English"}
        />
        <DetailRow
          icon={Flame}
          label="Current streak"
          value={`${user?.currentStreak || 0} days`}
        />
        <DetailRow
          icon={UserCircle}
          label="Channels"
          value={
            user?.preferences?.preferredChannels?.length
              ? user.preferences.preferredChannels.join(", ")
              : "Not selected"
          }
        />
      </section>
    </div>
  );
};

export default ProfilePage;
