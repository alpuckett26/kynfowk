export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" }
] satisfies { href: string; label: string }[];

export const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
];

export const TIME_BLOCKS = [
  { startHour: 7, endHour: 10, label: "Morning" },
  { startHour: 11, endHour: 14, label: "Midday" },
  { startHour: 17, endHour: 20, label: "Evening" },
  { startHour: 20, endHour: 22, label: "Late evening" }
];

export const CASE_STUDIES = [
  {
    title: "Sunday breakfast across three time zones",
    family: "The Alvarez Family Circle",
    challenge:
      "Three households wanted a dependable ritual, but weekend schedules kept changing and no one wanted another coordination spreadsheet.",
    approach:
      "They set shared Sunday availability once, let Kynfowk surface the best recurring overlap, and used the dashboard to keep the habit visible.",
    summary:
      "A daughter in Seattle, grandparents in Houston, and cousins in Atlanta use Kynfowk to protect one shared breakfast call every other Sunday.",
    result:
      "Their circle moved from scattered texts to a reliable Family Connections rhythm with 9 calls scheduled in the first month.",
    highlight: "Time Together felt planned, but never rigid.",
    metrics: ["9 calls in month one", "3 time zones coordinated", "2 missed-text chains avoided"],
    quote:
      "It stopped feeling like work to get everyone on the same call."
  },
  {
    title: "Rebuilding the habit after a hospital stay",
    family: "The Carter Family Circle",
    challenge:
      "The family needed softer, shorter touchpoints that could flex around recovery routines, pickup times, and caregiver fatigue.",
    approach:
      "They used availability windows to protect low-pressure check-ins and tracked progress through the Reconnection Streak card.",
    summary:
      "After a long recovery period, the family wanted short, lower-pressure check-ins that worked around care schedules and school pickups.",
    result:
      "They used availability windows and one-click suggestions to build a 6-week Reconnection Streak with shorter calls that actually stuck.",
    highlight: "Moments Shared became easier to sustain than long calls.",
    metrics: ["6-week streak", "4 active caregivers included", "Shorter 20-30 min calls"],
    quote:
      "The app made it easier to show up consistently without asking everyone for a big emotional lift."
  },
  {
    title: "Keeping college kids in the loop",
    family: "The Haddad Family Circle",
    challenge:
      "The family had energy to connect, but no shared system for navigating class schedules, work shifts, and spontaneous travel.",
    approach:
      "Parents invited everyone into one Family Circle and relied on overlap suggestions to land realistic midweek windows.",
    summary:
      "Two college students, a younger sibling, and busy parents needed something lighter than group chat chaos and more dependable than ad hoc FaceTimes.",
    result:
      "Kynfowk turned loose intent into a weekly family ritual and helped them reconnect with 5 unique family members in one week.",
    highlight: "Family-centered reminders replaced guilt with clarity.",
    metrics: ["5 members connected in one week", "1 weekly ritual created", "0 manual schedule polls"],
    quote:
      "Everyone knew when the best window was, so the conversation shifted from logistics to actually talking."
  },
  {
    title: "A calmer cadence for a blended family",
    family: "The Morgan Family Circle",
    challenge:
      "Alternating custody schedules made planning feel fragile, and the family needed a calmer way to see what weeks were realistic.",
    approach:
      "They shared repeatable windows, used the dashboard to spot good overlap, and relied on recent activity to keep everyone oriented.",
    summary:
      "With alternating custody schedules, the family needed a way to spot overlap without overplanning every week manually.",
    result:
      "Shared availability made windows obvious, and their dashboard gave them a steady overview of upcoming calls and recent family activity.",
    highlight: "The experience felt warm, simple, and low-friction.",
    metrics: ["2 households coordinated", "1 shared weekly view", "Fewer missed handoff weeks"],
    quote:
      "Seeing the whole circle in one place made planning feel calmer right away."
  },
  {
    title: "Grandparent connection without tech friction",
    family: "The Nguyen Family Circle",
    challenge:
      "The organizer wanted grandparents included without requiring everyone to learn a new complicated workflow all at once.",
    approach:
      "One organizer entered the initial windows, then used invite-based membership tracking and simple recap notes after each call.",
    summary:
      "The family organizer entered initial availability for everyone, then invite links helped less technical relatives join at their own pace.",
    result:
      "Call suggestions surfaced the best overlap fast, and the family tracked completed calls, total minutes, and a growing weekly streak.",
    highlight: "The app centered relationships instead of logistics.",
    metrics: ["142 minutes tracked", "3 generations connected", "Growing weekly streak"],
    quote:
      "We spent less time setting things up and more time hearing the stories we actually cared about."
  }
];
