import { Lesson } from "../domain/lesson";

export interface LessonRepository {
  getForUser(userId: string): Promise<Lesson[]>;
  getById(id: string): Promise<Lesson | null>;
  save(lesson: Lesson): Promise<void>;
  updateStatus(id: string, status: Lesson["status"]): Promise<void>;
}
