export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" }
] satisfies { href: string; label: string }[];

export const DAYS = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" }
];

export const TIME_BLOCKS = [
  { startHour: 7, endHour: 10, label: "Morning" },
  { startHour: 11, endHour: 14, label: "Midday" },
  { startHour: 17, endHour: 20, label: "Evening" },
  { startHour: 20, endHour: 22, label: "Late evening" }
];

export const CASE_STUDIES = [
  {
    title: "Grandma stopped waiting by the phone",
    family: "The Chen Family Circle · 3 generations, 4 time zones",
    summary:
      "After years of Sunday calls that fell through at the last minute, one family used Kynfowk to give their grandparents a reliable rhythm they could finally count on.",
    challenge:
      "Margaret and Bill had retired to Florida while their three adult children spread across Seattle, Chicago, and Boston. Timezone math, back-to-back work meetings, and kids' soccer schedules meant calls either got pushed or forgotten entirely. Months would pass. Bill called it the \"we should do this more often\" family.",
    approach:
      "Their daughter set up a Family Circle in under five minutes, invited everyone, and asked each person to mark a few open windows. Kynfowk surfaced Sunday evenings at 7 PM Eastern as the strongest overlap — a time that had always felt intuitively right but never quite happened. The call was booked and the built-in video room was ready.",
    result:
      "Three months later the family had logged nine completed calls averaging 34 minutes each. Their Reconnection Streak reached 11 weeks. Margaret stopped beginning every conversation with \"it has been so long.\"",
    highlight: "Connection Score reached 47 pts in 90 days.",
    metrics: ["9 calls in 3 months", "34 min avg. call length", "11-week streak", "6 members connected"],
    quote: "She talks about her streak the way she talks about her garden — something she tends to."
  },
  {
    title: "Three siblings, three continents, one shared calendar",
    family: "The Asante Family Circle · London · Lagos · Los Angeles",
    summary:
      "A sibling group scattered across three continents turned an 8-to-11 hour time difference into a monthly ritual that everyone now protects.",
    challenge:
      "Amara, Kofi, and Serena grew up together in Accra and ended up on three different continents by their mid-thirties. The time differences felt insurmountable. WhatsApp voice notes filled the gap for a while, but asynchronous updates are not the same as sitting together — even over a screen.",
    approach:
      "Each sibling marked a handful of windows that usually stayed clear. The overlap was narrow — Saturday mornings in Los Angeles were Saturday evenings in London and Sunday mornings in Lagos — but it existed. Kynfowk found it immediately and suggested a recurring window.",
    result:
      "Their first call ran 55 minutes. They talked about their father's health, a promotion, and the nephew none of them had met in person yet. Seven completed calls in a quarter. Connection Score climbed to 38 points.",
    highlight: "The app never made it feel complicated — it just told them when to show up.",
    metrics: ["3 continents bridged", "55 min first call", "7 calls this quarter", "38 Connection Score pts"],
    quote: "The thing that surprised me most was that it never felt hard. It just told us when to show up."
  },
  {
    title: "Automating the intention, not just the calendar",
    family: "The Reyes Family Circle · Working parent · aging father",
    summary:
      "A working parent carrying daily guilt about missed calls used Kynfowk to turn good intentions into a dependable weekly check-in that actually stuck.",
    challenge:
      "Laura runs a product team, co-parents two daughters, and worries constantly about her father in Phoenix. She wanted to call more. She had good intentions every Sunday evening and persistent, low-grade guilt every Monday morning when it had not happened.",
    approach:
      "She signed up in under five minutes, invited her dad and sister, and blocked Thursday evenings — the one night her ex-husband had the kids. Her dad marked Tuesday and Thursday mornings as his open windows. The Thursday overlap emerged instantly.",
    result:
      "22 completed calls over seven months. Her father now knows Thursday at 7 PM is their time. He prepares things to tell her. She stopped feeling like a bad daughter. Her Connection Score is 71.",
    highlight: "\"I stopped feeling like a bad daughter.\"",
    metrics: ["22 calls in 7 months", "Thu 7 PM consistent slot", "71 Connection Score pts", "3 members in circle"],
    quote: "I used to feel guilty every week. Now I just show up. The app does the remembering."
  },
  {
    title: "Two households, one circle, zero scheduling wars",
    family: "The Okafor-Webb Family Circle · Blended family, split-custody",
    summary:
      "After a remarriage created a blended family across two homes and two custody calendars, Kynfowk became the neutral ground that made inclusion feel natural.",
    challenge:
      "David and Priya had four children across two households navigating alternating custody weeks, school, sports, and after-school activities. Planning a single call that could include all six of them felt logistically impossible. Everyone wanted it — no one could figure out when.",
    approach:
      "Priya set up a Family Circle and asked everyone to contribute a few windows. The app found the only reliable overlap: Saturday mornings between 9 and 10:30 AM, when all four kids were typically at whichever home and no one had a game.",
    result:
      "15 calls kept in four months. The kids treat it like a standing event. Marcus, who had been the most reluctant, won a round of the family trivia game they play at the end and has not missed a call since.",
    highlight: "The impact on sibling bonds across both households exceeded every expectation.",
    metrics: ["15 calls in 4 months", "4 kids included every call", "48 min avg. length", "2 households coordinated"],
    quote: "Seeing the whole circle in one place made planning feel calmer right away. Even for the kids."
  },
  {
    title: "Deployed to Bahrain. Never missed a family call.",
    family: "The Chen Family Circle · Navy deployment, 9 months",
    summary:
      "A naval officer on a nine-month deployment used Kynfowk to protect a standing call with her family — navigating shifting port schedules and an 8-hour time difference.",
    challenge:
      "Lieutenant Commander Yolanda Chen deployed knowing communication would be difficult. Port schedules shifted on 48-hour notice. Her family struggled to know when she was reachable. Her parents started worrying every time a call got canceled that something serious had happened.",
    approach:
      "Before deployment, Yolanda set up a Family Circle and marked likely open windows based on typical duty schedules. She updated availability from ship when she had a chance. The app always surfaced her latest overlap and let her book calls one at a time rather than locking into a recurring slot she could not guarantee.",
    result:
      "31 completed calls over nine months. Her mother says having the scheduled call on the calendar — even when it moved — was the difference between dread and anticipation. Yolanda came home to a 37-week Reconnection Streak and a Connection Score of 148.",
    highlight: "148 Connection Score pts earned across a nine-month deployment.",
    metrics: ["31 calls across 9 months", "37-week streak", "148 Connection Score pts", "8-hour time difference bridged"],
    quote: "Having a call on the calendar — even when it moved — was the difference between dread and anticipation."
  }
];
