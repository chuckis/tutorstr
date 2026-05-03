import authEn from "../locales/en/auth.json";
import commonEn from "../locales/en/common.json";
import discoverEn from "../locales/en/discover.json";
import lessonsEn from "../locales/en/lessons.json";
import progressEn from "../locales/en/progress.json";
import profileEn from "../locales/en/profile.json";
import requestsEn from "../locales/en/requests.json";
import scheduleEn from "../locales/en/schedule.json";
import authUk from "../locales/uk/auth.json";
import commonUk from "../locales/uk/common.json";
import discoverUk from "../locales/uk/discover.json";
import lessonsUk from "../locales/uk/lessons.json";
import progressUk from "../locales/uk/progress.json";
import profileUk from "../locales/uk/profile.json";
import requestsUk from "../locales/uk/requests.json";
import scheduleUk from "../locales/uk/schedule.json";
import authRu from "../locales/ru/auth.json";
import commonRu from "../locales/ru/common.json";
import discoverRu from "../locales/ru/discover.json";
import lessonsRu from "../locales/ru/lessons.json";
import progressRu from "../locales/ru/progress.json";
import profileRu from "../locales/ru/profile.json";
import requestsRu from "../locales/ru/requests.json";
import scheduleRu from "../locales/ru/schedule.json";
import { AppLocale } from "../domain/locale";

export const resources: Record<AppLocale, Record<string, unknown>> = {
  en: {
    auth: authEn,
    common: commonEn,
    discover: discoverEn,
    profile: profileEn,
    schedule: scheduleEn,
    requests: requestsEn,
    lessons: lessonsEn,
    progress: progressEn
  },
  uk: {
    auth: authUk,
    common: commonUk,
    discover: discoverUk,
    profile: profileUk,
    schedule: scheduleUk,
    requests: requestsUk,
    lessons: lessonsUk,
    progress: progressUk
  },
  ru: {
    auth: authRu,
    common: commonRu,
    discover: discoverRu,
    profile: profileRu,
    schedule: scheduleRu,
    requests: requestsRu,
    lessons: lessonsRu,
    progress: progressRu
  }
};