// Web-only: includes cn() which uses tailwind-merge
// Universal helpers re-exported from the shared package
export {
  formatMinutes,
  formatNumber,
  getWeekStart,
  pluralize,
} from "@kynfowk/utils";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
