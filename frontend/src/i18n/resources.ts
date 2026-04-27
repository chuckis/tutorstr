import authEn from "../locales/en/auth.json";
import commonEn from "../locales/en/common.json";
import discoverEn from "../locales/en/discover.json";
import lessonsEn from "../locales/en/lessons.json";
import profileEn from "../locales/en/profile.json";
import requestsEn from "../locales/en/requests.json";
import scheduleEn from "../locales/en/schedule.json";
import authUk from "../locales/uk/auth.json";
import commonUk from "../locales/uk/common.json";
import discoverUk from "../locales/uk/discover.json";
import lessonsUk from "../locales/uk/lessons.json";
import profileUk from "../locales/uk/profile.json";
import requestsUk from "../locales/uk/requests.json";
import scheduleUk from "../locales/uk/schedule.json";
import { AppLocale } from "../domain/locale";

export const resources: Record<AppLocale, Record<string, unknown>> = {
  en: {
    auth: authEn,
    common: commonEn,
    discover: discoverEn,
    profile: profileEn,
    schedule: scheduleEn,
    requests: requestsEn,
    lessons: lessonsEn
  },
  uk: {
    auth: authUk,
    common: commonUk,
    discover: discoverUk,
    profile: profileUk,
    schedule: scheduleUk,
    requests: requestsUk,
    lessons: lessonsUk
  }
};
