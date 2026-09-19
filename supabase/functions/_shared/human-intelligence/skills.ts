// Handing Braino the skill he is about to use, and only that one.
//
// skills/<name>/SKILL.md is where a capability is written down: what it is for,
// what it must never do, what it promised the user. Ten exist, people read them,
// and he never could. So writing down how something should work and making it
// work that way have been two separate jobs, and the second one gets forgotten.
//
// The rule this module exists to obey is the one that makes it safe to add at
// all: IT MUST NARROW. The tool catalog is already around 2,400 tokens on every
// command. A skill library appended whole would be a second instruction manual
// riding on every turn, which costs latency on work that has nothing to do with
// it, and buries the rules it was supposed to surface. So at most two skills,
// only when the command actually looks like them, and never on the reflex path.

import { BRAINO_SKILLS, type BrainoSkill } from "./skill-registry.ts";
import { goalOverlap, goalWords } from "./procedures.ts";

// Two. A command is rarely two skills and never three, and the second slot is
// there for the genuine near-miss ("put on a film" is watch-play, and might be
// asset-fetch) rather than to be filled.
const MAX_SHOWN = 2;

const MATCH_AT = 0.4;

// And at least this many words in common, whatever the ratio says. A two word
// command sharing one word with a description scores 0.5 and means nothing:
// "play something" is not evidence of anything. Short commands are exactly where
// a ratio alone is noisiest, and they are also the most common kind.
const MIN_SHARED = 2;

/* A skill's own trigger line is the thing to match against.
 *
 * The frontmatter description is already written as "use this when...", with the
 * phrasings people actually say, by the person who built the skill. Nothing
 * derived from the body would be better, and it costs nothing to use it.
 *
 * The quotes have to come off FIRST, and this was a real bug before it was a
 * comment. goalWords strips quoted spans, which is right for a command — "play
 * 'Dark Side of the Moon'" quotes the one specific thing, and the specific thing
 * is never what makes two jobs the same. A description quotes the opposite: its
 * examples, which are the most useful words in it. Passing watch-play's
 * description through untouched deleted "play Shawshank on Netflix", "put on
 * Stranger Things season 2 episode 5" and "where can I watch Dune", so the skill
 * that exists to recognise those sentences could not recognise any of them, and
 * nothing matched anything at all. */
function skillWords(skill: BrainoSkill): string[] {
  const trigger = `${skill.name.replace(/-/g, " ")} ${skill.description}`.replace(/["'`]/g, " ");
  return goalWords(trigger);
}

export function matchSkills(command: string, registry: BrainoSkill[] = BRAINO_SKILLS): BrainoSkill[] {
  const asked = goalWords(command);
  if (!asked.length) return [];
  return registry
    .map((skill) => {
      const words = new Set(skillWords(skill));
      return {
        skill,
        score: goalOverlap(asked, [...words]),
        shared: asked.filter((w) => words.has(w)).length,
      };
    })
    .filter((m) => m.shared >= MIN_SHARED && m.score >= MATCH_AT)
    .sort((a, b) => b.score - a.score || b.shared - a.shared)
    .slice(0, MAX_SHOWN)
    .map((m) => m.skill);
}

/* The block, or nothing at all.
 *
 * Nothing at all is the common case and is the point: most commands are not one
 * of the ten written-down skills, and those turns should cost exactly what they
 * cost before this existed.
 */
export function renderSkills(command: string, registry: BrainoSkill[] = BRAINO_SKILLS): string {
  const matched = matchSkills(command, registry);
  if (!matched.length) return "";
  return [
    "=== HOW THIS ONE IS SUPPOSED TO WORK ===",
    "Braino has a written contract for this kind of work. It is not a route and it does not tell you which button to press: it is what this capability promised the person, and what it must never do.",
    "Where it contradicts what you were about to do, it wins, because somebody decided it deliberately. Where it is silent, decide for yourself as usual. It grants nothing: anything irreversible still waits for the human.",
    "",
    ...matched.map((skill) =>
      [
        `${skill.name}: ${skill.description}`,
        ...skill.rules.map((rule) => `    - ${rule}`),
      ].join("\n")
    ),
  ].join("\n");
}
