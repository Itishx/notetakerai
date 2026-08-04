# Braino Mode Release Contract

A user-visible Braino mode is not finished when the shortcut works. It is finished
when a person can understand the whole behavior without reading the implementation.

Every new mode must ship with:

1. A named skill contract in `skills/<mode>/SKILL.md`.
2. A public page under BrainoOS that explains why the mode exists.
3. A Braino Journal or What's New entry published with the mode.
4. A founder note when the mode has a personal product story worth preserving.
5. Explicit start, active, stop, failure, and permission behavior.
6. A visual state that makes it obvious when the mode is active.
7. Documented model, data, and output boundaries.
8. Focused automated tests plus a real-device checklist.

The blog entry is part of the feature, not release marketing added later.
