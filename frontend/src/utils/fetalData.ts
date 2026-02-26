export const FETAL_MILESTONES = [
  { week: 4, size: 'Poppy Seed', length: 0.1, weight: 0, developments: ['Heart begins to form', 'Neural tube developing'], tips: ['Start taking prenatal vitamins with folic acid'] },
  { week: 5, size: 'Sesame Seed', length: 0.2, weight: 0, developments: ['Heart starts beating', 'Brain development accelerates'], tips: ['Avoid alcohol and smoking'] },
  { week: 6, size: 'Lentil', length: 0.6, weight: 0, developments: ['Nose and mouth forming', 'Arm and leg buds appear'], tips: ['Stay hydrated, manage morning sickness'] },
  { week: 7, size: 'Blueberry', length: 1.0, weight: 0, developments: ['Fingers begin forming', 'Brain growing rapidly'], tips: ['Get 7-9 hours of sleep'] },
  { week: 8, size: 'Raspberry', length: 1.6, weight: 1, developments: ['All major organs forming', 'Baby starts moving'], tips: ['Schedule your first prenatal visit'] },
  { week: 9, size: 'Cherry', length: 2.3, weight: 2, developments: ['Toes forming', 'Muscles developing'], tips: ['Eat iron-rich foods'] },
  { week: 10, size: 'Strawberry', length: 3.1, weight: 4, developments: ['Vital organs functional', 'Tiny fingernails forming'], tips: ['Consider genetic testing options'] },
  { week: 11, size: 'Fig', length: 4.1, weight: 7, developments: ['Tooth buds forming', 'Baby can swallow'], tips: ['Maintain balanced nutrition'] },
  { week: 12, size: 'Lime', length: 5.4, weight: 14, developments: ['Reflexes developing', 'Vocal cords forming'], tips: ['First trimester almost complete!'] },
  { week: 13, size: 'Peach', length: 7.4, weight: 23, developments: ['Fingerprints forming', 'Bones hardening'], tips: ['Welcome to second trimester'] },
  { week: 16, size: 'Avocado', length: 11.6, weight: 100, developments: ['Can make facial expressions', 'Hearing developing'], tips: ['Start talking to your baby!'] },
  { week: 20, size: 'Banana', length: 16.4, weight: 300, developments: ['Halfway point!', 'Can hear sounds', 'Anatomy scan due'], tips: ['Schedule your mid-pregnancy ultrasound'] },
  { week: 24, size: 'Corn on the Cob', length: 21, weight: 600, developments: ['Lungs developing', 'Sleep-wake cycle forming'], tips: ['Watch for signs of gestational diabetes'] },
  { week: 28, size: 'Eggplant', length: 25, weight: 1000, developments: ['Eyes can open', 'Brain developing rapidly', 'Can dream'], tips: ['Start counting kicks daily'] },
  { week: 32, size: 'Squash', length: 28, weight: 1700, developments: ['Practicing breathing', 'Bones fully formed', 'Gaining weight rapidly'], tips: ['Prepare your hospital bag'] },
  { week: 36, size: 'Honeydew Melon', length: 33, weight: 2600, developments: ['Lungs nearly mature', 'Head may engage in pelvis'], tips: ['Know the signs of labor'] },
  { week: 37, size: 'Winter Melon', length: 35, weight: 2900, developments: ['Full term!', 'All organs mature'], tips: ['Rest and prepare for delivery'] },
  { week: 40, size: 'Watermelon', length: 38, weight: 3400, developments: ['Ready for birth!', 'Due date'], tips: ['Stay calm, baby will come when ready'] },
];

export function getMilestoneForWeek(week: number) {
  const sorted = [...FETAL_MILESTONES].sort((a, b) => b.week - a.week);
  return sorted.find(m => m.week <= week) || FETAL_MILESTONES[0];
}
