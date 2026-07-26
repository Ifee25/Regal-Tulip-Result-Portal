export type AssessmentCategory = {
  name: string;
  items: AssessmentItem[];
};

export type AssessmentItem = {
  id: string;
  label: string;
  score?: number;
  not_applicable?: boolean;
};

export type AssessmentResult = {
  student_name: string;
  term: string;
  class_name: string;
  section: "Nursery" | "Primary";
  nursery_class?: string;
  assessments: AssessmentCategory[];
  session?: string;
  height?: string;
  age?: string;
  weight_start?: string;
  weight_end?: string;
  days_school_opened?: number;
  days_absent?: number;
  next_term_begins?: string;
  class_teacher?: string;
  class_teacher_remarks?: string;
  class_teacher_signature?: string;
  head_teacher_remarks?: string;
  head_teacher_signature?: string;
  report_date?: string;
  average_age?: string;
  number_in_class?: string;
  position?: string;
  height_start?: string;
  height_end?: string;
  primary_subjects?: PrimarySubjectResult[];
  affective_traits?: PrimaryRating[];
  psychomotor_skills?: PrimaryRating[];
};

export type PrimarySubjectResult = {
  subject: string;
  not_offered?: boolean;
  cat?: number;
  exam?: number;
  total?: number;
  class_highest_score?: number;
  class_lowest_score?: number;
  remark?: string;
  first_term_score?: number;
  second_term_score?: number;
  third_term_score?: number;
  annual_total?: number;
  annual_average?: number;
};

export type PrimaryRating = {
  label: string;
  rating?: "A" | "B" | "C" | "D";
};

export const PRIMARY_THIRD_TERM_SUBJECTS = [
  "COMPREHENSION", "CREATIVE WRITING", "GRAMMAR", "POETRY",
  "VOCABULARY AND SPELLING", "VERBAL REASONING", "NUMERACY",
  "QUANTITATIVE REASONING", "AGRICULTURAL SCIENCE",
  "CULTURAL AND CREATIVE ARTS", "HOME ECONOMICS", "VOCATIONAL APTITUDE",
  "CIVIC EDUCATION", "SOCIAL STUDIES", "CHRISTIAN RELIGIOUS STUDIES",
  "HEALTH & PHYSICAL EDUCATION", "FRENCH", "IGBO LANGUAGE",
  "COMPUTER STUDIES", "BASIC SCIENCE & TECHNOLOGY",
] as const;

export const PRIMARY_SUBJECTS = [
  "COMPREHENSION",
  "CREATIVE WRITING",
  "GRAMMAR",
  "POETRY",
  "SPELLING AND VOCABULARY",
  "VERBAL REASONING",
  "NUMERACY",
  "QUANTITATIVE REASONING",
  "AGRICULTURAL SCIENCE",
  "CULTURAL AND CREATIVE ARTS",
  "HOME ECONOMICS",
  "VOCATIONAL APTITUDE",
  "CIVIC EDUCATION",
  "SOCIAL STUDIES",
  "CHRISTIAN RELIGIOUS STUDIES",
  "HEALTH AND PHYSICAL EDUCATION",
  "FRENCH",
  "IGBO",
  "COMPUTER STUDIES",
  "BASIC SCIENCE AND TECHNOLOGY",
] as const;

export const PRIMARY_AFFECTIVE_TRAITS = [
  "Attentiveness",
  "Attitude to School Work",
  "Completes School Work Promptly",
  "Honesty",
  "Mental Alertness",
  "Neatness",
  "Politeness",
  "Punctuality",
  "Relationship with Peers",
  "Respect",
  "Spirit of Team Work",
] as const;

export const PRIMARY_PSYCHOMOTOR_SKILLS = [
  "Creative Arts",
  "General Reasoning",
  "Handwriting",
  "Musical Skills",
  "Physical Activities",
  "Reading",
] as const;

export const NURSERY_ASSESSMENTS: AssessmentCategory[] = [
  {
    name: "NUMERACY",
    items: [
      { id: "num-1", label: "RECOGNISES NUMBERS" },
      { id: "num-2", label: "RECOGNISES AND DIFFERENTIATES BETWEEN NUMBERS AND LETTERS" },
      { id: "num-3", label: "COUNTS FROM" },
      { id: "num-4", label: "RECOGNISES FROM" },
      { id: "num-5", label: "FORMS THE NUMBERS WELL" },
      { id: "num-6", label: "WRITES NUMBERS IN CORRECT ORDER" },
      { id: "num-7", label: "DOES SIMPLE ADDITION" },
      { id: "num-8", label: "DOES SIMPLE SUBTRACTION" },
      { id: "num-9", label: "DOES SIMPLE MULTIPLICATION" },
      { id: "num-10", label: "LEARNT THE EVEN AND ODD NUMBERS" },
    ],
  },
  {
    name: "VERBAL DEVELOPMENT",
    items: [
      { id: "vb-1", label: "SPEAKS CLEARLY" },
      { id: "vb-2", label: "KNOWS OWN NAME/AGE" },
      { id: "vb-3", label: "KNOWS OWN SCHOOL" },
      { id: "vb-4", label: "CHANTS FROM" },
      { id: "vb-5", label: "RECOGNISES LETTERS/SOUNDS" },
      { id: "vb-6", label: "BLENDS SOUNDS" },
      { id: "vb-7", label: "READS SIMPLE WORDS" },
      { id: "vb-8", label: "READS SIMPLE SENTENCES" },
      { id: "vb-9", label: "TELLS SIMPLE STORIES" },
      { id: "vb-10", label: "LEARNT TO RECITE THE NATIONAL PLEDGE/ANTHEM AND ANAMBRA STATE ANTHEM" },
    ],
  },
  {
    name: "WRITING",
    items: [
      { id: "wr-1", label: "HAS LEARNT THE CURVES, STROKES AND CIRCLES" },
      { id: "wr-2", label: "FORMS LETTERS/ SOUNDS" },
      { id: "wr-3", label: "WRITES SOUNDS IN CORRECT ORDER" },
      { id: "wr-4", label: "COPIES/ WRITES SIMPLE WORDS" },
      { id: "wr-5", label: "COPIES/ WRITES SIMPLE SENTENCES" },
      { id: "wr-6", label: "DOES NEAT AND TIDY WORK" },
      { id: "wr-7", label: "COPIES/ WRITES OWN NAME" },
    ],
  },
  {
    name: "CREATIVE ARTS",
    items: [
      { id: "ca-1", label: "RECOGNISES SHAPES" },
      { id: "ca-2", label: "DRAWS SOME OF THEM" },
      { id: "ca-3", label: "LEARNT THE BASIC COLOURS" },
      { id: "ca-4", label: "LEARNT TO COLOUR OBJECTS" },
      { id: "ca-5", label: "ABILITY TO DRAW" },
    ],
  },
  {
    name: "SCRIPTURE AND PRAYER",
    items: [
      { id: "sp-1", label: "LEARNT TO SAY SIMPLE PRAYERS" },
      { id: "sp-2", label: "RECOGNISES GOD AS THE FATHER" },
      { id: "sp-3", label: "KNOWS SOME SIMPLE BIBLE STORIES" },
    ],
  },
  {
    name: "RHYMES",
    items: [
      { id: "rh-1", label: "HAS LEARNT/ SINGS ___ RHYMES" },
      { id: "rh-2", label: "ENJOYS RHYME TIMES: a. DEMONSTRATES" },
      { id: "rh-3", label: "ENJOYS RHYME TIMES: b. SINGS" },
    ],
  },
  {
    name: "SOCIAL WORKS",
    items: [
      { id: "sw-1", label: "HAS LEARNT TO USE THE MAGIC WORDS (THANK YOU, I AM SORRY, PLEASE, EXCUSE ME)" },
      { id: "sw-2", label: "LEARNT THE BASIC GREETINGS" },
    ],
  },
  {
    name: "TAKE HOME WORK",
    items: [
      { id: "th-1", label: "DOES HOMEWORK" },
      { id: "th-2", label: "REMEMBERS TO BRING IT TO SCHOOL" },
      { id: "th-3", label: "KEEPS BOOKS TIDY" },
    ],
  },
  {
    name: "HEALTH HABITS",
    items: [
      { id: "hh-1", label: "LEARNT WHEN TO WASH HANDS" },
      { id: "hh-2", label: "KEEPS SURROUNDINGS CLEAN" },
      { id: "hh-3", label: "KNOWS SOME FRUITS" },
    ],
  },
];
