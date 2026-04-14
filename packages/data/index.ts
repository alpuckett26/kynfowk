import type { CaseStudy } from "@kynfowk/types";

export const caseStudies: CaseStudy[] = [
  {
    id: "cs-001",
    slug: "grandparent-inclusion",
    title: "Staying in Gran's World",
    familyType: "Grandparent Inclusion",
    familyLabel: "Multi-generational",
    problem:
      "Margaret, 78, rarely saw her grandchildren after they left for college. Video calls were unscheduled, forgotten, or cancelled at the last minute. She often waited by her tablet for calls that never came, leading to feelings of isolation.",
    howTheyUsed:
      "Her daughter set up Kynfowk on Margaret's tablet in a single visit. The app now prompts each grandchild for their weekly availability window, finds an overlap, and sends calendar holds to everyone. Margaret gets a simple reminder with their photos an hour before each call.",
    measuredOutcome:
      "Margaret went from roughly one call per month to weekly calls within the first 6 weeks. Her family's Connection Streak reached 8 consecutive weeks — the longest in their household.",
    emotionalOutcome:
      "Her grandchildren started calling her \"the most informed person in the family.\" She watched a graduation recital via Kynfowk and was the first person her grandson told about a new job.",
    quote:
      "I used to wonder if they'd forgotten me. Now I'm the first one they call with good news. That means everything.",
    quoteName: "Margaret T.",
    quoteRelation: "Grandmother, age 78",
    tags: ["elders", "grandparents", "loneliness", "weekly calls"],
    accentColor: "from-amber-400 to-orange-400",
    iconEmoji: "🌻",
  },
  {
    id: "cs-002",
    slug: "long-distance-siblings",
    title: "Coast to Coast, Still Close",
    familyType: "Long-Distance Siblings",
    familyLabel: "Adult siblings, 3 time zones",
    problem:
      "Three siblings — in Boston, Denver, and Portland — hadn't spoken as a trio in over a year. Individual texts substituted for real conversation. The 3-hour time difference made spontaneous calls feel like a logistical puzzle nobody wanted to solve.",
    howTheyUsed:
      "They used Kynfowk's availability syncing across time zones. The app suggested a rotating Thursday evening window that worked for all three, and tracked who had missed the last call to gently rotate hosting responsibilities.",
    measuredOutcome:
      "They averaged 3.2 group calls per month in their first quarter — compared to near zero previously. Their shared Time Together counter hit 400 minutes by month two.",
    emotionalOutcome:
      "The siblings revived a tradition of sharing a \"moment of the week\" on each call. One sibling said they now feel more connected to their brother and sister than they did when they all lived in the same city.",
    quote:
      "We stopped blaming time zones and started making time. Kynfowk did the hard part of finding when.",
    quoteName: "Daniela R.",
    quoteRelation: "Middle sibling, Boston",
    tags: ["siblings", "long-distance", "time zones", "scheduling"],
    accentColor: "from-sky-400 to-blue-500",
    iconEmoji: "✈️",
  },
  {
    id: "cs-003",
    slug: "aging-parent-check-in",
    title: "The Weekly Touchpoint That Changed Everything",
    familyType: "Busy Adult Children",
    familyLabel: "Adult children checking on aging parents",
    problem:
      "James and his sister both worked demanding jobs and lived 4 hours from their parents. They wanted to check in regularly but kept letting weeks slip by. Phone calls felt rushed; neither parent would say when something was wrong.",
    howTheyUsed:
      "They created a shared Kynfowk family that included both parents and both siblings. Kynfowk scheduled a 15-minute Sunday morning check-in. The app's post-call summary reminded them of topics discussed, making each call feel cumulative rather than repetitive.",
    measuredOutcome:
      "Missed calls dropped from 60% to under 10%. Their parents' connection score — tracking calls where all four joined — doubled in 8 weeks. James noticed his father mentioning health concerns he'd never raise by text.",
    emotionalOutcome:
      "James's mother told him it was the first time in years she felt like she had a standing date with her children, not just a hope of hearing from them.",
    quote:
      "Dad finally told me about his knee pain because we'd been talking regularly for two months. Before Kynfowk, he'd have hidden it for a year.",
    quoteName: "James W.",
    quoteRelation: "Son, age 38",
    tags: ["aging parents", "health", "caregiving", "consistency"],
    accentColor: "from-green-400 to-teal-500",
    iconEmoji: "🏡",
  },
  {
    id: "cs-004",
    slug: "blended-family-scheduling",
    title: "One Calendar, Two Households",
    familyType: "Blended Family Scheduling",
    familyLabel: "Blended family across two homes",
    problem:
      "After a divorce, coordinating calls between kids at two homes became a source of friction. School schedules, custody arrangements, and activities meant finding a shared window took more energy than the call itself — so calls often didn't happen.",
    howTheyUsed:
      "Both households set up Kynfowk separately, then linked under one shared family group. The app respected custody schedule blocks and surfaced the three best overlap windows each week, reducing negotiation to a single tap.",
    measuredOutcome:
      "Parent-to-child connection calls increased by 240% in the first month. The children's unique-members-connected stat climbed every week as they began joining calls with step-siblings they rarely saw.",
    emotionalOutcome:
      "Their 11-year-old daughter told her school counselor she \"felt like a whole family again\" after three months with Kynfowk. Both parents reported lower stress around scheduling.",
    quote:
      "We went from arguing about when the kids could call to just… calling. The app removed the negotiation.",
    quoteName: "Renée & Tom S.",
    quoteRelation: "Co-parents",
    tags: ["blended family", "divorce", "children", "co-parenting"],
    accentColor: "from-violet-400 to-purple-500",
    iconEmoji: "🤝",
  },
  {
    id: "cs-005",
    slug: "military-family",
    title: "Serving Abroad, Connected at Home",
    familyType: "Military / Travel-Heavy Family",
    familyLabel: "Active duty military family",
    problem:
      "Specialist Elena deployed for an 8-month rotation with unpredictable schedules and limited connectivity windows. Her husband and two young children struggled to predict when she'd be reachable; missed calls left the children upset and Elena anxious.",
    howTheyUsed:
      "Elena's husband set her call windows in Kynfowk by syncing the roughly predictable duty schedule. When connectivity was available, the app would surface the next open window to her family so they could gather quickly. Post-call notes let Elena leave audio messages for the kids after calls when they'd fallen asleep.",
    measuredOutcome:
      "Successful family calls rose from an average of 1.8 per month pre-deployment to 6.4 per month. Their Reconnection Streak was maintained for Elena's entire 8-month rotation despite the distance.",
    emotionalOutcome:
      "Elena's son, age 6, kept a drawing on the fridge that he'd \"show Mom on the next Kynfowk call.\" She says those calls were her anchor through the hardest stretches of deployment.",
    quote:
      "I was 6,000 miles away and I still felt like I put my kids to bed on Tuesday nights. That's not nothing — that's everything.",
    quoteName: "Specialist Elena V.",
    quoteRelation: "Active duty, U.S. Army",
    tags: ["military", "deployment", "children", "long-distance", "resilience"],
    accentColor: "from-red-400 to-rose-500",
    iconEmoji: "🎖️",
  },
];
