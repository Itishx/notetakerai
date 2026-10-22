/* Writing from Labs. Add a new article by appending an entry here; the Labs
   page lists it and /labs/:slug renders it (src/pages/LabsPost.tsx).
   Newest first. `body` is the key into LabsPost's article components. */
export type LabsPostMeta = {
  slug: string;
  title: string;
  line: string;
  date: string; // ISO
  dateLabel: string;
  readTime: string;
  author: string;
};

export const LABS_POSTS: LabsPostMeta[] = [
  {
    slug: "introducing-braino-foundry",
    title: "Introducing Braino Foundry",
    line: "A distribution co-founder for founders. Building got easy. Getting seen did not.",
    date: "2026-10-22",
    dateLabel: "22 October 2026",
    readTime: "6 min read",
    author: "Itish Pande",
  },
];

export const findLabsPost = (slug?: string) => LABS_POSTS.find((p) => p.slug === slug);
