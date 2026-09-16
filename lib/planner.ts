export const PLAN_SLOTS = { menu: "Day’s menu", breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', dessert: 'Dessert', smoothie: 'Smoothie / shake' };
export type PlanSlot = keyof typeof PLAN_SLOTS;
export interface PlanEntry { id: string; user_id?: string; household_id?:string; created_by?:string|null; plan_date: string; meal_slot: PlanSlot; recipe_id: string; recipe_title: string; created_at: string }
// Local calendar dates, never UTC timestamps: adding a recipe must not shift its day.
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseDay(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Choose a valid day.');
  const [y,m,d] = key.split('-').map(Number);
  const value = new Date(y,m-1,d,12);
  if (dateKey(value) !== key) throw new Error('Choose a valid day.');
  return value;
}
export function shiftDay(key: string, days: number) { const date=parseDay(key); date.setDate(date.getDate()+days); return dateKey(date); }
export function weekDays(key: string): string[] { const day=parseDay(key); const start=shiftDay(key,-((day.getDay()+6)%7)); return Array.from({length:7},(_,i)=>shiftDay(start,i)); }
export function dayLabel(key: string) { return parseDay(key).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); }
