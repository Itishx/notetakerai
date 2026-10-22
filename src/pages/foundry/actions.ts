import { copy } from "./lib";
import { refreshRun } from "./engines";
import { log, type Person, type Post, type Project, type Stage, type Topic, STAGE_LABEL } from "./store";
import { composeUrl, fullText, PLATFORM_LABEL } from "./components/previews";

type Up = (fn: (p: Project) => Project) => void;

/* Approve = copy the text and open the place it goes. Posting for you comes
   later through n8n. */
export function approvePost(up: Up, post: Post) {
  void copy(fullText(post));
  window.open(composeUrl(post), "_blank", "noopener");
  up((p) => refreshRun(log({ ...p, posts: p.posts.map((x) => (x.id === post.id ? { ...x, status: "approved", opened: true } : x)) }, "you", `Approved a ${PLATFORM_LABEL[post.platform]} post`)));
}
export function setPost(up: Up, id: string, patch: Partial<Post>) {
  up((p) => refreshRun({ ...p, posts: p.posts.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}
export function approvePerson(up: Up, person: Person) {
  void copy(person.message);
  window.open(person.url, "_blank", "noopener");
  up((p) => refreshRun(log({ ...p, people: p.people.map((x) => (x.id === person.id ? { ...x, status: "approved", stage: x.stage === "found" ? "messaged" : x.stage, stageAt: Date.now() } : x)) }, "outreach", `Messaged a person on r/${person.community}. Now in Messaged`)));
}
export function setPerson(up: Up, id: string, patch: Partial<Person>) {
  up((p) => refreshRun({ ...p, people: p.people.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}
export function moveStage(up: Up, person: Person, stage: Stage) {
  up((p) => log({ ...p, people: p.people.map((x) => (x.id === person.id ? { ...x, stage, stageAt: Date.now() } : x)) }, stage === "paid" ? "you" : "outreach", stage === "paid" ? `A person from r/${person.community} paid` : `Moved r/${person.community} to ${STAGE_LABEL[stage]}`));
}
/* An article is approved by copying it; where it goes (blog, Medium,
   LinkedIn) is the founder's choice, so nothing opens. */
export function approveArticle(up: Up, topic: Topic) {
  void copy(topic.article || "");
  up((p) => log({ ...p, memory: { ...p.memory, topics: p.memory.topics.map((t) => (t.id === topic.id ? { ...t, articleStatus: "approved" } : t)) } }, "you", `Approved the article "${topic.title}"`));
}
export function setTopic(up: Up, id: string, patch: Partial<Topic>) {
  up((p) => ({ ...p, memory: { ...p.memory, topics: p.memory.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)) } }));
}
