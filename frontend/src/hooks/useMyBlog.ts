import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountRole } from "../domain/account";
import type { BlogDraft, BlogPost } from "../domain/blog";
import { PublishBlogPost } from "../application/usecases/publishBlogPost";
import { SaveDraft } from "../application/usecases/saveDraft";
import { DeleteBlogPost } from "../application/usecases/deleteBlogPost";
import { GetMyDrafts } from "../application/usecases/getMyDrafts";
import { GetTutorBlog } from "../application/usecases/getTutorBlog";
import { useRepo } from "./RepoContext";

export function useMyBlog(pubkey: string, viewerRole: AccountRole) {
  const { blogRepository, draftRepository } = useRepo();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publishBlogPost = useMemo(
    () => new PublishBlogPost(blogRepository, draftRepository),
    [blogRepository, draftRepository]
  );
  const saveDraft = useMemo(
    () => new SaveDraft(draftRepository),
    [draftRepository]
  );
  const deleteBlogPost = useMemo(
    () => new DeleteBlogPost(blogRepository),
    [blogRepository]
  );
  const getTutorBlog = useMemo(
    () => new GetTutorBlog(blogRepository),
    [blogRepository]
  );
  const getMyDrafts = useMemo(
    () => new GetMyDrafts(draftRepository),
    [draftRepository]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPosts, fetchedDrafts] = await Promise.all([
        getTutorBlog.execute(pubkey),
        getMyDrafts.execute(viewerRole),
      ]);
      setPosts(fetchedPosts);
      setDrafts(fetchedDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [pubkey, viewerRole, getTutorBlog, getMyDrafts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const publish = useCallback(
    async (draft: BlogDraft) => {
      await publishBlogPost.execute(draft, pubkey, viewerRole);
      await refresh();
    },
    [publishBlogPost, pubkey, viewerRole, refresh]
  );

  const saveDraftAction = useCallback(
    async (draft: BlogDraft) => {
      await saveDraft.execute(draft, viewerRole);
      await refresh();
    },
    [saveDraft, viewerRole, refresh]
  );

  const deleteDraft = useCallback(
    async (id: string) => {
      await draftRepository.delete(id);
      await refresh();
    },
    [draftRepository, refresh]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      await deleteBlogPost.execute(postId, pubkey, viewerRole);
      await refresh();
    },
    [deleteBlogPost, pubkey, viewerRole, refresh]
  );

  return {
    posts,
    drafts,
    loading,
    publish,
    saveDraft: saveDraftAction,
    deleteDraft,
    deletePost,
    error,
  };
}
