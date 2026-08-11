// Static metadata describing the ESAT (Engineering & Science Admissions Test).
//
// The ESAT is administered by UAT-UK (University Admissions Tests) and used by
// universities such as Cambridge and Imperial for engineering and science
// undergraduate admissions. It replaced the NSAA/ENGAA from 2024 entry.
//
// Format (per the official UAT-UK content specification):
//   - Five modules exist: Mathematics 1, Biology, Chemistry, Physics,
//     Mathematics 2. Most courses require Mathematics 1 + two further modules.
//   - Each module: 27 multiple-choice questions, 40 minutes, separately timed.
//   - Computer-based. Calculators are NOT permitted.
//   - 1 mark per correct answer; no negative marking. Modules scored separately.
//
// This platform focuses on the three modules required for engineering
// (Mathematics 1, Mathematics 2, Physics). The section `topics` below mirror
// the top-level headings of the official specification (Appendix 1). All
// modules assume the Mathematics 1 content.

export const SECTIONS = [
  {
    id: "mathematics1",
    name: "Mathematics 1",
    short: "Maths 1",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Core mathematics assumed by every module: number, algebra, ratio, geometry, statistics and probability. No calculator.",
    topics: [
      "Units",
      "Number",
      "Ratio and proportion",
      "Algebra",
      "Geometry",
      "Statistics",
      "Probability",
    ],
  },
  {
    id: "physics",
    name: "Physics",
    short: "Physics",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Electricity, magnetism, mechanics, thermal physics, matter, waves and radioactivity. Assumes Mathematics 1.",
    topics: [
      "Electricity",
      "Magnetism",
      "Mechanics",
      "Thermal physics",
      "Matter",
      "Waves",
      "Radioactivity",
    ],
  },
  {
    id: "mathematics2",
    name: "Mathematics 2",
    short: "Maths 2",
    color: "bg-rose-100 text-rose-800 border-rose-200",
    description:
      "Advanced mathematics: further algebra, sequences and series, coordinate geometry, trigonometry, logarithms and calculus. Assumes Mathematics 1.",
    topics: [
      "Algebra and functions",
      "Sequences and series",
      "Coordinate geometry",
      "Trigonometry",
      "Exponentials and logarithms",
      "Differentiation",
      "Integration",
      "Graphs of functions",
    ],
  },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function getSection(id: string) {
  return SECTIONS.find((s) => s.id === id);
}

export function sectionName(id: string) {
  return getSection(id)?.name ?? id;
}
