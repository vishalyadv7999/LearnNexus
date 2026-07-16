import {
  BookOpenCheck,
  Bot,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isFeatureEnabled } from "../features/featureFlags";

const coreSidebarItems = [
  { label: "Setup", to: "/home", icon: Home },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Study Plan", to: "/study-plan", icon: BookOpenCheck },
  { label: "Profile", to: "/profile", icon: UserCircle },
  { label: "Settings", to: "/settings", icon: Settings },
];

export const sidebarItems = [
  ...coreSidebarItems.slice(0, 3),
  ...(isFeatureEnabled("internshipPrep")
    ? [{ label: "Internship Prep", to: "/internship-prep", icon: BriefcaseBusiness }]
    : []),
  ...(isFeatureEnabled("learningAssistant")
    ? [{ label: "Learning Assistant", to: "/learning-assistant", icon: Bot }]
    : []),
  ...coreSidebarItems.slice(3),
];

const Sidebar = ({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    onCloseMobile();
  }, [location.pathname, onCloseMobile]);

  const handleLogout = async () => {
    await logout();
    onCloseMobile();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 lg:hidden ${
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-slate-950/82 text-white shadow-[24px_0_80px_rgba(2,6,23,0.55)] backdrop-blur-2xl transition-all duration-300 ease-out ${
          isCollapsed ? "lg:w-24" : "lg:w-72"
        } w-72 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_8%,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_80%_28%,rgba(34,211,238,0.1),transparent_24%)]" />
        <div className="relative flex h-full flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.35)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div
                className={`min-w-0 transition-all duration-300 ${
                  isCollapsed ? "lg:w-0 lg:opacity-0" : "opacity-100"
                }`}
              >
                <p className="truncate text-lg font-black">LearnNexus</p>
                <p className="truncate text-xs font-semibold text-white/46">
                  Learning workspace
                </p>
              </div>
            </div>

            <button
              aria-label="Close navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/64 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={onCloseMobile}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mt-6 hidden h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-bold text-white/58 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white lg:inline-flex"
            onClick={onToggleCollapsed}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>

          <nav className="mt-6 flex flex-1 flex-col gap-1.5">
            {sidebarItems.map(({ icon: Icon, label, to }) => (
              <NavLink
                className={({ isActive }) =>
                  `group relative flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-fuchsia-500/22 to-cyan-400/14 text-white shadow-[0_0_24px_rgba(34,211,238,0.12)] ring-1 ring-cyan-300/24"
                      : "text-white/56 hover:translate-x-1 hover:bg-white/[0.065] hover:text-white"
                  } ${isCollapsed ? "lg:justify-center" : ""}`
                }
                key={to}
                title={isCollapsed ? label : undefined}
                to={to}
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span className="absolute left-0 h-7 w-1 rounded-r-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
                    ) : null}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        isActive
                          ? "bg-white/12 text-cyan-100"
                          : "bg-white/[0.045] text-white/56 group-hover:bg-cyan-300/10 group-hover:text-cyan-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`truncate transition-all duration-300 ${
                        isCollapsed ? "lg:w-0 lg:opacity-0" : "opacity-100"
                      }`}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-3 border-t border-white/10 pt-4">
            <div
              className={`rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-3 transition-all duration-300 ${
                isCollapsed ? "lg:px-2" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black text-white">
                  {(user?.name || "L").charAt(0).toUpperCase()}
                </div>
                <div
                  className={`min-w-0 transition-all duration-300 ${
                    isCollapsed ? "lg:w-0 lg:opacity-0" : "opacity-100"
                  }`}
                >
                  <p className="truncate text-sm font-black">{user?.name || "Learner"}</p>
                  <p className="truncate text-xs font-semibold text-white/42">
                    {user?.course || "Learning track"}
                  </p>
                </div>
              </div>
            </div>

            <button
              className={`group flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-white/56 transition-all duration-200 hover:bg-red-500/15 hover:text-white ${
                isCollapsed ? "lg:justify-center" : ""
              }`}
              onClick={handleLogout}
              title={isCollapsed ? "Logout" : undefined}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-white/56 transition group-hover:bg-red-500/20 group-hover:text-white">
                <LogOut className="h-5 w-5" />
              </span>
              <span
                className={`transition-all duration-300 ${
                  isCollapsed ? "lg:w-0 lg:opacity-0" : "opacity-100"
                }`}
              >
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
