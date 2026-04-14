import { caseStudies } from "@kynfowk/data";

describe("case studies data", () => {
  it("has exactly 5 case studies", () => {
    expect(caseStudies).toHaveLength(5);
  });

  it("each study has required fields", () => {
    for (const study of caseStudies) {
      expect(study.id).toBeTruthy();
      expect(study.slug).toBeTruthy();
      expect(study.title).toBeTruthy();
      expect(study.familyType).toBeTruthy();
      expect(study.problem).toBeTruthy();
      expect(study.howTheyUsed).toBeTruthy();
      expect(study.measuredOutcome).toBeTruthy();
      expect(study.emotionalOutcome).toBeTruthy();
      expect(study.quote).toBeTruthy();
      expect(study.quoteName).toBeTruthy();
      expect(study.quoteRelation).toBeTruthy();
      expect(Array.isArray(study.tags)).toBe(true);
    }
  });

  it("slugs are unique", () => {
    const slugs = caseStudies.map((s) => s.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("covers the required story types", () => {
    const types = caseStudies.map((s) => s.familyType);
    expect(types).toEqual(
      expect.arrayContaining([
        "Grandparent Inclusion",
        "Long-Distance Siblings",
        "Busy Adult Children",
        "Blended Family Scheduling",
        "Military / Travel-Heavy Family",
      ])
    );
  });
});
