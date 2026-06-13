import { useEffect, useState } from "react";
import type { BlogPost } from "../domain/blog";
import { GetTutorBlog } from "../application/usecases/getTutorBlog";
import { useRepo } from "./RepoContext";

export function useTutorBlog(tutorId: string) {
  const { blogRepository } = useRepo();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tutorId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const getTutorBlog = new GetTutorBlog(blogRepository);

    getTutorBlog.execute(tutorId).then((result) => {
      if (!cancelled) {
        setPosts(result);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tutorId, blogRepository]);

  return { posts, loading, error };
}
