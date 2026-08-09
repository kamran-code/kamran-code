// Static metadata describing the ESAT (Engineering & Science Admissions Test).
// The ESAT is used by universities such as Cambridge and Imperial for
// engineering and science undergraduate admissions. It is delivered as
// multiple-choice questions across several subject sections.

export const SECTIONS = [
  {
    id: "mathematics1",
    name: "Mathematics 1",
    short: "Maths 1",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Core mathematics: algebra, geometry, sequences, probability, and statistics.",
    topics: [
      "Algebra and functions",
      "Sequences and series",
      "Coordinate geometry",
      "Trigonometry",
      "Exponentials and logarithms",
      "Probability",
      "Statistics",
    ],
  },
  {
    id: "physics",
    name: "Physics",
    short: "Physics",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Mechanics, electricity, waves, energy, and modern physics fundamentals.",
    topics: [
      "Mechanics and motion",
      "Electricity and circuits",
      "Waves and optics",
      "Energy and work",
      "Thermal physics",
      "Fields and forces",
      "Modern physics",
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    short: "Chemistry",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description:
      "Atomic structure, bonding, reactions, energetics, and organic chemistry.",
    topics: [
      "Atomic structure",
      "Bonding and structure",
      "Stoichiometry",
      "Energetics",
      "Rates and equilibria",
      "Redox and electrochemistry",
      "Organic chemistry",
    ],
  },
  {
    id: "biology",
    name: "Biology",
    short: "Biology",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    description:
      "Cells, genetics, physiology, ecology, and the fundamentals of living systems.",
    topics: [
      "Cell biology",
      "Genetics and inheritance",
      "Physiology",
      "Ecology",
      "Enzymes and biochemistry",
      "Homeostasis",
      "Evolution",
    ],
  },
  {
    id: "mathematics2",
    name: "Mathematics 2",
    short: "Maths 2",
    color: "bg-rose-100 text-rose-800 border-rose-200",
    description:
      "Advanced mathematics: calculus, further algebra, and mechanics-oriented problems.",
    topics: [
      "Differentiation",
      "Integration",
      "Further algebra",
      "Graphs and transformations",
      "Vectors",
      "Kinematics",
      "Proof and reasoning",
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
