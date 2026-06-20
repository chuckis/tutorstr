import { create } from "zustand";
import type { BlogPost, BlogDraft, BlogPostStatus } from "../domain/blog";

interface BlogState {
  posts: BlogPost[];
  drafts: BlogDraft[];
  setPosts: (posts: BlogPost[]) => void;
  setDrafts: (drafts: BlogDraft[]) => void;
  optimisticAddPost: (post: BlogPost) => void;
  optimisticRemovePost: (postId: string) => void;
  optimisticUpdatePostStatus: (postId: string, status: BlogPostStatus) => void;
  hydrate: (posts: BlogPost[], drafts: BlogDraft[]) => void;
  snapshotPosts: () => BlogPost[];
  restorePosts: (snapshot: BlogPost[]) => void;
}

export const useBlogStore = create<BlogState>((set, get) => ({
  posts: [],
  drafts: [],

  setPosts(posts) {
    set({ posts });
  },

  setDrafts(drafts) {
    set({ drafts });
  },

  optimisticAddPost(post) {
    set((s) => ({
      posts: [...s.posts, post],
    }));
  },

  optimisticRemovePost(postId) {
    set((s) => ({
      posts: s.posts.filter((p) => p.id !== postId),
    }));
  },

  optimisticUpdatePostStatus(postId, status) {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, status } : p,
      ),
    }));
  },

  hydrate(posts, drafts) {
    set({ posts, drafts });
  },

  snapshotPosts() {
    return [...get().posts];
  },

  restorePosts(snapshot) {
    set({ posts: snapshot });
  },
}));
