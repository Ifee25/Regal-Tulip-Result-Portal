export const STAFF_CLASS_ASSIGNMENTS: Readonly<Record<string, readonly string[]>> = {
  "mijane4real@gmail.com": ["Primary 3R"],
  "onuigbochidimmamaureen042@gmail.com": ["Nursery 3R"],
  "chinaemeremmirabel@gmail.com": ["Nursery 1S"],
  "faithgodwinbest@gmail.com": ["Nursery 3T"],
  "onyii4god91@gmail.com": ["Nursery 2R"],
  "chinecheremekweozor@gmail.com": ["Nursery 1T"],
  "osigweoluchukwu33@gmail.com": ["Nursery 1R"],
  "chidimma92@gmail.com": ["Primary 4R"],
  "divinevictory253@gmail.com": ["Nursery 2T"],
  "chyfavour13@gmail.com": ["Nursery 2T"],
  "fabian.i.nwangwu@gmail.com": ["Primary 4T"],
  "hopeanyina@gmail.com": ["Primary 2T"],
  "chidimmachukwu584@gmail.com": ["Nursery 1R"],
  "dreafou@gmail.com": ["Primary 6R"],
  "honestaewelum@gmail.com": ["Primary 5R"],
  "enibejennifer33@gmail.com": ["Primary 1T"],
  "giftchidimma0224@gmail.com": ["Primary 3T"],
  "kelechukwuchidimma32@gmail.com": ["Primary 4R"],
  "kinkymomee352@gmail.com": ["Primary 1R"],
  "ezeibeoluebube2@gmail.com": ["Primary 2R"],
  "sandrauzoigwe@gmail.com": ["Nursery 2R"],
};

export function getStaffClasses(email?: string | null): readonly string[] {
  return STAFF_CLASS_ASSIGNMENTS[email?.trim().toLowerCase() ?? ""] ?? [];
}

export function isListedStaffEmail(email?: string | null): boolean {
  return getStaffClasses(email).length > 0;
}
