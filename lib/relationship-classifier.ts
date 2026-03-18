export type RelationshipTier = "immediate" | "secondary" | "extended" | "other";

export interface ClassifiedRelationship {
  tier: RelationshipTier;
  generation: number; // +3 (great-grandparents) … 0 (viewer's gen) … -3 (great-grandchildren)
  normalized: string;
}

export interface TreeMember {
  id: string;
  display_name: string;
  relationship_label: string | null;
  status: "active" | "invited" | "blocked";
  classification: ClassifiedRelationship;
  isViewer: boolean;
  is_placeholder: boolean;
  is_deceased: boolean;
  placeholder_notes: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  phone_number: string | null;
  invite_email: string | null;
}

export interface TreeRow {
  generation: number;
  label: string;
  members: TreeMember[];
}

export interface TreeLayout {
  rows: TreeRow[];
  unplaced: TreeMember[];
}

// ---------------------------------------------------------------------------
// Keyword map — evaluated top-to-bottom, first match wins
// Format: [keywords[], result]
// ---------------------------------------------------------------------------

const KEYWORD_MAP: [string[], ClassifiedRelationship][] = [
  // ── Great-grandparents ──────────────────────────────────────────
  [
    ["great-great-grandmother", "gg-grandma", "gg grandma", "great-great grandma"],
    { tier: "extended", generation: 4, normalized: "Great-great-grandmother" }
  ],
  [
    ["great-great-grandfather", "gg-grandpa", "gg grandpa", "great-great grandpa"],
    { tier: "extended", generation: 4, normalized: "Great-great-grandfather" }
  ],
  [
    ["great-great-grandparent", "great great grandparent"],
    { tier: "extended", generation: 4, normalized: "Great-great-grandparent" }
  ],
  [
    ["great-grandmother", "great grandmother", "great grandma", "great-grandma", "great granny", "great-granny"],
    { tier: "extended", generation: 3, normalized: "Great-grandmother" }
  ],
  [
    ["great-grandfather", "great grandfather", "great grandpa", "great-grandpa"],
    { tier: "extended", generation: 3, normalized: "Great-grandfather" }
  ],
  [
    ["great-grandparent", "great grandparent"],
    { tier: "extended", generation: 3, normalized: "Great-grandparent" }
  ],

  // ── Grandparents ────────────────────────────────────────────────
  [
    [
      "grandmother", "grandma", "gran", "granny", "nana", "nanna", "nan",
      "oma", "abuela", "bubbie", "bubbe", "babcia", "yaya", "mémère", "mamie",
      "lola", "halmeoni", "obaachan", "nonna"
    ],
    { tier: "secondary", generation: 2, normalized: "Grandmother" }
  ],
  [
    [
      "grandfather", "grandpa", "grandad", "granddad", "gramps",
      "opa", "abuelo", "dziadek", "pépère", "papi", "lolo", "harabeoji",
      "ojiichan", "nonno"
    ],
    { tier: "secondary", generation: 2, normalized: "Grandfather" }
  ],
  [
    ["grandparent", "grandparents"],
    { tier: "secondary", generation: 2, normalized: "Grandparent" }
  ],
  [
    ["great-aunt", "great aunt", "greataunt", "grand-aunt", "grandaunt"],
    { tier: "secondary", generation: 2, normalized: "Great-aunt" }
  ],
  [
    ["great-uncle", "great uncle", "greatuncle", "grand-uncle", "granduncle"],
    { tier: "secondary", generation: 2, normalized: "Great-uncle" }
  ],

  // ── Parents & parental generation ───────────────────────────────
  [
    ["stepmother", "step-mother", "step mom", "stepmom", "step mum", "stepmum"],
    { tier: "immediate", generation: 1, normalized: "Stepmother" }
  ],
  [
    ["stepfather", "step-father", "step dad", "stepdad"],
    { tier: "immediate", generation: 1, normalized: "Stepfather" }
  ],
  [
    ["stepparent", "step-parent", "step parent"],
    { tier: "immediate", generation: 1, normalized: "Stepparent" }
  ],
  [
    ["mother-in-law", "mother in law", "mom-in-law", "mum-in-law", "mil"],
    { tier: "secondary", generation: 1, normalized: "Mother-in-law" }
  ],
  [
    ["father-in-law", "father in law", "dad-in-law", "fil"],
    { tier: "secondary", generation: 1, normalized: "Father-in-law" }
  ],
  [
    [
      "mother", "mom", "mum", "mama", "mamma", "ma",
      "madre", "mère", "ima", "eema", "amma", "ibu", "mãe"
    ],
    { tier: "immediate", generation: 1, normalized: "Mother" }
  ],
  [
    [
      "father", "dad", "dada", "daddy",
      "padre", "père", "abba", "tatay", "baba", "bap", "pai"
    ],
    { tier: "immediate", generation: 1, normalized: "Father" }
  ],
  [
    ["papa", "pops", "pop"],
    { tier: "immediate", generation: 1, normalized: "Father" }
  ],
  [
    ["parent", "parents"],
    { tier: "immediate", generation: 1, normalized: "Parent" }
  ],
  [
    ["aunt", "auntie", "aunty", "tia", "tante", "zia", "khala", "mausi", "chachi"],
    { tier: "secondary", generation: 1, normalized: "Aunt" }
  ],
  [
    ["uncle", "tio", "onkel", "zio", "chacha", "mama", "kaka"],
    { tier: "secondary", generation: 1, normalized: "Uncle" }
  ],

  // ── Viewer's generation ─────────────────────────────────────────
  [
    ["wife", "husband", "spouse", "partner", "fiancée", "fiancee", "fiancé", "significant other"],
    { tier: "immediate", generation: 0, normalized: "Spouse/Partner" }
  ],
  [
    ["stepsister", "step-sister", "step sister"],
    { tier: "immediate", generation: 0, normalized: "Stepsister" }
  ],
  [
    ["stepbrother", "step-brother", "step brother"],
    { tier: "immediate", generation: 0, normalized: "Stepbrother" }
  ],
  [
    ["half-sister", "half sister"],
    { tier: "immediate", generation: 0, normalized: "Half-sister" }
  ],
  [
    ["half-brother", "half brother"],
    { tier: "immediate", generation: 0, normalized: "Half-brother" }
  ],
  [
    ["sister", "sis", "hermana", "sorella", "soeur"],
    { tier: "immediate", generation: 0, normalized: "Sister" }
  ],
  [
    ["brother", "bro", "hermano", "fratello", "frère"],
    { tier: "immediate", generation: 0, normalized: "Brother" }
  ],
  [
    ["sibling", "twin", "triplet"],
    { tier: "immediate", generation: 0, normalized: "Sibling" }
  ],
  [
    ["sister-in-law", "sister in law"],
    { tier: "secondary", generation: 0, normalized: "Sister-in-law" }
  ],
  [
    ["brother-in-law", "brother in law"],
    { tier: "secondary", generation: 0, normalized: "Brother-in-law" }
  ],
  [
    ["cousin", "first cousin", "second cousin", "cousin once removed", "cousin twice removed"],
    { tier: "extended", generation: 0, normalized: "Cousin" }
  ],

  // ── Children & children's generation ────────────────────────────
  [
    ["stepdaughter", "step-daughter", "step daughter"],
    { tier: "immediate", generation: -1, normalized: "Stepdaughter" }
  ],
  [
    ["stepson", "step-son", "step son"],
    { tier: "immediate", generation: -1, normalized: "Stepson" }
  ],
  [
    ["stepchild", "step-child", "step child"],
    { tier: "immediate", generation: -1, normalized: "Stepchild" }
  ],
  [
    ["daughter-in-law", "daughter in law"],
    { tier: "secondary", generation: -1, normalized: "Daughter-in-law" }
  ],
  [
    ["son-in-law", "son in law"],
    { tier: "secondary", generation: -1, normalized: "Son-in-law" }
  ],
  [
    ["daughter", "hija", "figlia", "filha"],
    { tier: "immediate", generation: -1, normalized: "Daughter" }
  ],
  [
    ["son", "hijo", "figlio", "filho"],
    { tier: "immediate", generation: -1, normalized: "Son" }
  ],
  [
    ["child", "kid"],
    { tier: "immediate", generation: -1, normalized: "Child" }
  ],
  [
    ["niece"],
    { tier: "secondary", generation: -1, normalized: "Niece" }
  ],
  [
    ["nephew"],
    { tier: "secondary", generation: -1, normalized: "Nephew" }
  ],

  // ── Grandchildren ────────────────────────────────────────────────
  [
    ["great-niece", "great niece", "grandniece"],
    { tier: "extended", generation: -2, normalized: "Great-niece" }
  ],
  [
    ["great-nephew", "great nephew", "grandnephew"],
    { tier: "extended", generation: -2, normalized: "Great-nephew" }
  ],
  [
    ["granddaughter", "grand-daughter"],
    { tier: "secondary", generation: -2, normalized: "Granddaughter" }
  ],
  [
    ["grandson", "grand-son"],
    { tier: "secondary", generation: -2, normalized: "Grandson" }
  ],
  [
    ["grandchild", "grandkid"],
    { tier: "secondary", generation: -2, normalized: "Grandchild" }
  ],

  // ── Great-grandchildren ──────────────────────────────────────────
  [
    ["great-granddaughter", "great granddaughter"],
    { tier: "extended", generation: -3, normalized: "Great-granddaughter" }
  ],
  [
    ["great-grandson", "great grandson"],
    { tier: "extended", generation: -3, normalized: "Great-grandson" }
  ],
  [
    ["great-grandchild", "great grandchild"],
    { tier: "extended", generation: -3, normalized: "Great-grandchild" }
  ]
];

// ---------------------------------------------------------------------------
// Selectable relationship options — used in dropdowns across the app
// ---------------------------------------------------------------------------

export interface RelationshipOption {
  value: string; // stored as relationship_label in the DB
  label: string;
}

export interface RelationshipGroup {
  group: string;
  options: RelationshipOption[];
}

export const RELATIONSHIP_OPTIONS: RelationshipGroup[] = [
  {
    group: "Great-great-grandparents",
    options: [
      { value: "Great-great-grandmother", label: "Great-great-grandmother" },
      { value: "Great-great-grandfather", label: "Great-great-grandfather" },
      { value: "Great-great-grandparent", label: "Great-great-grandparent" }
    ]
  },
  {
    group: "Great-grandparents",
    options: [
      { value: "Great-grandmother", label: "Great-grandmother" },
      { value: "Great-grandfather", label: "Great-grandfather" },
      { value: "Great-grandparent", label: "Great-grandparent" }
    ]
  },
  {
    group: "Grandparents",
    options: [
      { value: "Grandmother", label: "Grandmother" },
      { value: "Grandfather", label: "Grandfather" },
      { value: "Grandparent", label: "Grandparent" },
      { value: "Great-aunt", label: "Great-aunt" },
      { value: "Great-uncle", label: "Great-uncle" }
    ]
  },
  {
    group: "Parents",
    options: [
      { value: "Mother", label: "Mother" },
      { value: "Father", label: "Father" },
      { value: "Parent", label: "Parent" },
      { value: "Stepmother", label: "Stepmother" },
      { value: "Stepfather", label: "Stepfather" },
      { value: "Stepparent", label: "Stepparent" },
      { value: "Mother-in-law", label: "Mother-in-law" },
      { value: "Father-in-law", label: "Father-in-law" },
      { value: "Aunt", label: "Aunt" },
      { value: "Uncle", label: "Uncle" }
    ]
  },
  {
    group: "Spouse & partners",
    options: [
      { value: "Wife", label: "Wife" },
      { value: "Husband", label: "Husband" },
      { value: "Spouse/Partner", label: "Spouse / Partner" },
      { value: "Fiancée", label: "Fiancée" },
      { value: "Fiancé", label: "Fiancé" }
    ]
  },
  {
    group: "Siblings",
    options: [
      { value: "Sister", label: "Sister" },
      { value: "Brother", label: "Brother" },
      { value: "Sibling", label: "Sibling" },
      { value: "Half-sister", label: "Half-sister" },
      { value: "Half-brother", label: "Half-brother" },
      { value: "Stepsister", label: "Stepsister" },
      { value: "Stepbrother", label: "Stepbrother" },
      { value: "Twin", label: "Twin" }
    ]
  },
  {
    group: "Siblings-in-law & cousins",
    options: [
      { value: "Sister-in-law", label: "Sister-in-law" },
      { value: "Brother-in-law", label: "Brother-in-law" },
      { value: "Cousin", label: "Cousin" },
      { value: "First cousin", label: "First cousin" },
      { value: "Second cousin", label: "Second cousin" }
    ]
  },
  {
    group: "Children",
    options: [
      { value: "Daughter", label: "Daughter" },
      { value: "Son", label: "Son" },
      { value: "Child", label: "Child" },
      { value: "Stepdaughter", label: "Stepdaughter" },
      { value: "Stepson", label: "Stepson" },
      { value: "Stepchild", label: "Stepchild" },
      { value: "Daughter-in-law", label: "Daughter-in-law" },
      { value: "Son-in-law", label: "Son-in-law" },
      { value: "Niece", label: "Niece" },
      { value: "Nephew", label: "Nephew" }
    ]
  },
  {
    group: "Grandchildren",
    options: [
      { value: "Granddaughter", label: "Granddaughter" },
      { value: "Grandson", label: "Grandson" },
      { value: "Grandchild", label: "Grandchild" },
      { value: "Great-niece", label: "Great-niece" },
      { value: "Great-nephew", label: "Great-nephew" }
    ]
  },
  {
    group: "Great-grandchildren",
    options: [
      { value: "Great-granddaughter", label: "Great-granddaughter" },
      { value: "Great-grandson", label: "Great-grandson" },
      { value: "Great-grandchild", label: "Great-grandchild" }
    ]
  },
  {
    group: "Great-great-grandchildren",
    options: [
      { value: "Great-great-grandchild", label: "Great-great-grandchild" }
    ]
  }
];

// ---------------------------------------------------------------------------
// Core classifier
// ---------------------------------------------------------------------------

export function classifyRelationship(label: string | null): ClassifiedRelationship {
  if (!label || !label.trim()) {
    return { tier: "other", generation: 0, normalized: "" };
  }

  const normalized = label.toLowerCase().trim();

  for (const [keywords, result] of KEYWORD_MAP) {
    for (const keyword of keywords) {
      if (normalized === keyword || normalized.includes(keyword)) {
        return result;
      }
    }
  }

  return { tier: "other", generation: 0, normalized: label };
}

// ---------------------------------------------------------------------------
// Generation row labels
// ---------------------------------------------------------------------------

const GENERATION_LABELS: Record<number, string> = {
  4: "Great-great-grandparents",
  3: "Great-grandparents",
  2: "Grandparents",
  1: "Parents · Aunts & Uncles",
  0: "Your generation",
  "-1": "Children · Nieces & Nephews",
  "-2": "Grandchildren",
  "-3": "Great-grandchildren",
  "-4": "Great-great-grandchildren"
} as unknown as Record<number, string>;

function getGenerationLabel(gen: number): string {
  return GENERATION_LABELS[gen] ?? (gen > 0 ? "Ancestors" : "Descendants");
}

// ---------------------------------------------------------------------------
// Tree layout builder
// ---------------------------------------------------------------------------

export function buildTreeLayout(
  members: Array<{
    id: string;
    display_name: string;
    relationship_label: string | null;
    status: "active" | "invited" | "blocked";
    is_placeholder: boolean;
    is_deceased: boolean;
    placeholder_notes: string | null;
    avatar_url: string | null;
    last_seen_at: string | null;
    phone_number: string | null;
    invite_email: string | null;
  }>,
  viewerMembershipId: string
): TreeLayout {
  const generationMap = new Map<number, TreeMember[]>();
  const unplaced: TreeMember[] = [];

  // Inject the viewer's own node at generation 0
  generationMap.set(0, [
    {
      id: viewerMembershipId,
      display_name: "You",
      relationship_label: null,
      status: "active",
      classification: { tier: "immediate", generation: 0, normalized: "You" },
      isViewer: true,
      is_placeholder: false,
      is_deceased: false,
      placeholder_notes: null,
      avatar_url: null,
      last_seen_at: null,
      phone_number: null,
      invite_email: null
    }
  ]);

  for (const member of members) {
    if (member.id === viewerMembershipId) continue;
    if (member.status === "blocked") continue;

    const classification = classifyRelationship(member.relationship_label);
    const treeMember: TreeMember = {
      ...member,
      classification,
      isViewer: false
    };

    if (classification.tier === "other") {
      unplaced.push(treeMember);
    } else {
      const gen = classification.generation;
      const row = generationMap.get(gen) ?? [];
      row.push(treeMember);
      generationMap.set(gen, row);
    }
  }

  // Sort rows: highest generation (oldest ancestors) at the top
  const rows: TreeRow[] = Array.from(generationMap.entries())
    .sort(([a], [b]) => b - a)
    .filter(([, members]) => members.length > 0)
    .map(([generation, members]) => ({
      generation,
      label: getGenerationLabel(generation),
      // Within a row: viewer first, then by tier (immediate → secondary → extended)
      members: members.sort((a, b) => {
        if (a.isViewer) return -1;
        if (b.isViewer) return 1;
        const tierOrder = { immediate: 0, secondary: 1, extended: 2, other: 3 };
        return tierOrder[a.classification.tier] - tierOrder[b.classification.tier];
      })
    }));

  return { rows, unplaced };
}
