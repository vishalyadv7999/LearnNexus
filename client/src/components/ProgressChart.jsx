import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const clamp = (value = 0) => Math.min(100, Math.max(0, Number(value) || 0));

export const WeeklyStudyTimeGraph = ({ data = [] }) => {
  const safeData = data;
  const maxValue = Math.max(...safeData.map((item) => item.value), 1);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/58">
            Weekly study time
          </p>
          <h3 className="mt-2 text-xl font-black text-white">Focus rhythm</h3>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
          Live
        </span>
      </div>
      <div className="mt-5 h-44">
        {safeData.length ? (
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={safeData} margin={{ bottom: 0, left: -28, right: 8, top: 12 }}>
            <defs>
              <linearGradient id="studyLine" x1="0" x2="1" y1="0" y2="0">
                <stop stopColor="#f0abfc" />
                <stop offset="0.52" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700 }}
              tickLine={false}
            />
            <YAxis axisLine={false} domain={[0, maxValue]} tick={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(2,6,23,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "16px",
                color: "#fff",
              }}
              cursor={{ stroke: "rgba(34,211,238,0.22)", strokeWidth: 2 }}
            />
            <Line
              activeDot={{ fill: "#020617", r: 7, stroke: "#67e8f9", strokeWidth: 3 }}
              dataKey="value"
              dot={{ fill: "#020617", r: 5, stroke: "#67e8f9", strokeWidth: 2 }}
              stroke="url(#studyLine)"
              strokeLinecap="round"
              strokeWidth={5}
              type="monotone"
            />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-sm leading-6 text-white/52">
            Complete a lesson to populate this week&apos;s activity graph.
          </div>
        )}
      </div>
    </div>
  );
};

export const SkillRadarChart = ({ skills = [] }) => {
  const safeSkills = skills;

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-100/58">
          Skill radar
        </p>
        <h3 className="mt-2 text-xl font-black text-white">Capability map</h3>
      </div>
      <div className="mt-4 h-64">
        {safeSkills.length ? (
          <ResponsiveContainer height="100%" width="100%">
            <RadarChart data={safeSkills} outerRadius="72%">
            <defs>
              <linearGradient id="radarFill" x1="0" x2="1" y1="0" y2="1">
                <stop stopColor="rgba(217,70,239,0.72)" />
                <stop offset="1" stopColor="rgba(34,211,238,0.38)" />
              </linearGradient>
            </defs>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 800 }}
            />
            <Radar
              dataKey="value"
              fill="url(#radarFill)"
              fillOpacity={0.82}
              stroke="#c084fc"
              strokeWidth={3}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(2,6,23,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "16px",
                color: "#fff",
              }}
            />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-sm leading-6 text-white/52">
            Subject progress appears after you complete study tasks.
          </div>
        )}
      </div>
    </div>
  );
};

const ProgressChart = ({ value = 0, label = "Progress", detail = "Course completion" }) => {
  const safeValue = clamp(value);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="relative flex items-center gap-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke="url(#ringStroke)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="10"
        />
        <defs>
          <linearGradient id="ringStroke" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#e879f9" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute left-4 top-4 flex h-24 w-24 items-center justify-center text-xl font-black text-white">
        {safeValue}%
      </div>
      <div>
        <p className="text-sm font-black text-white">{label}</p>
        <p className="mt-1 text-xs font-semibold text-white/46">{detail}</p>
      </div>
    </div>
  );
};

export default ProgressChart;
