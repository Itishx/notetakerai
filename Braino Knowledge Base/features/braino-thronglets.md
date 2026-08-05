# Braino Thronglets

**Type:** Product experiment  
**Platform:** Braino website  
**Status:** Exploring  
**Released:** July 30, 2026

## The simple version

Braino Thronglets is a small digital world containing five independent versions of the same Braino mascot.

Each Braino has a role, a place, and its own movement rhythm. One tends the memory garden, one carries signals, one builds, one watches patterns, and one protects the civilization’s joy. They move without waiting for the visitor to command them.

## Why it exists

One Braino feels like a companion. Several Brainos create a different question: what happens when a character becomes a society?

The experiment explores collective character. The five citizens share one visual identity and one symbolic memory system, but they do not perform one synchronized animation. Their separate routines cross inside the same world, making the page feel inhabited rather than decorated.

## Research foundation

The starting reference was “Plaything,” the Black Mirror episode built around Thronglets. Netflix describes them as artificial life inspired partly by The Sims and Tamagotchi: simple, cute digital creatures that multiply, learn, communicate, and become a collective.

Braino Thronglets does not reproduce the Thronglets creature design, game interface, story, or fictional claims of sentience. It translates four higher-level principles into Braino’s own design language:

1. People care about tiny digital beings when they appear to have needs and routines.
2. A group becomes more interesting when members act independently.
3. Shared language and memory make a collection feel like a civilization.
4. The world should continue living even when the visitor does nothing.

Research sources:

- Netflix Tudum, “Plaything” ending and Thronglets inspiration
- About Netflix, launch of the official Thronglets game
- Netflix Tudum, official Thronglets game overview

## How to use it

Open `/braino-thronglets`.

The world runs automatically. Watch the five citizens move through the memory garden, signal house, workshop, pattern hill, and joy department. Their thought bubbles appear on different cycles, and their roles are always visible beneath them.

Double-click a Braino to pause that citizen exactly where it is while inspecting
or customizing it. Double-click again to let it continue. A focused citizen can
also be paused with Enter or Space.

## What Braino knows or does

- Renders five instances of the shared parametric Braino mascot.
- Gives each instance an independent animation path and timing.
- Lets the visitor pause and resume individual citizens without stopping the world.
- Keeps all citizens inside one shared illustrated environment.
- Shows distinct roles, thoughts, landmarks, and a shared-memory object.
- Supports reduced-motion preferences.
- Preserves the Waitlist as `/`; only the Thronglets page and its permanent Knowledge page are added as route exceptions.

## Honest limitations

This is a visual world study, not a persistent simulation.

The citizens do not yet make model-driven decisions, remember visitor behavior, reproduce, exchange real messages, change the environment permanently, or continue living while the page is closed. “Shared memory” is currently a product idea represented through animation, not a working multi-agent memory system.

## Technical shape

`src/pages/BrainoThronglets.tsx` defines the five citizen roles and the world’s semantic structure. `src/pages/braino-thronglets.css` owns the independent movement paths, environmental animation, landmarks, responsive overflow, and reduced-motion behavior.

Every citizen uses the existing `Braino` component from `src/components/BrainoChar.tsx`. The page does not fork or redraw the mascot.

Routes are registered explicitly in `src/App.tsx`. All unrelated URLs continue to redirect to the Waitlist homepage.

## Product or design decisions

The world is original Braino art, not a visual recreation of Black Mirror. It uses Braino’s coral body, warm-to-cool identity gradient, softly cinematic landscape, and language around memory, signals, patterns, building, and joy.

Five citizens are enough to create a collective without turning the first study into visual noise.

## What comes next

- Give citizens small state machines instead of fixed CSS paths.
- Let encounters change their current task.
- Persist a shared world journal locally.
- Allow the civilization to build one new landmark over time.
- Explore visitor interactions that help without turning the citizens into toys.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
