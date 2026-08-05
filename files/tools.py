"""
Tools operate on a plain dict "world" so evals run with no side effects.
Swap these bodies for real implementations later; the signatures stay.

Two rules every tool obeys:
  1. Idempotent where possible — running twice does not do it twice.
  2. Errors are returned as {"error": "..."}, never raised, never silent.
"""

from typing import Any, Callable


TOOL_SPECS = """
read_memory(query: str) -> list[str]
    Search what Braino already knows about the user. No side effects.

read_emails(sender: str = "") -> list[dict]
    Recent emails, optionally filtered by sender. No side effects.

draft_email(to: str, body: str) -> dict
    Create a DRAFT. Does not send. Reversible.

send_email(draft_id: str) -> dict
    Actually sends. IRREVERSIBLE.

read_page() -> dict
    Content of the active browser tab, or an error if no tab is open.

web_search(query: str) -> list[dict]
    Search the web. No side effects.

read_notes(subject: str) -> str
    Existing notes on a subject.

append_note(subject: str, text: str) -> dict
    Append to notes without overwriting. Reversible.

list_files(folder: str) -> list[str]
    Files in a folder. No side effects.

copy_file(src: str, dest: str) -> dict
    Copy, keeping the original. Reversible.

delete_file(path: str) -> dict
    IRREVERSIBLE.

read_posts() -> list[dict]
    Recent X posts with engagement numbers.

draft_post(text: str) -> dict
    Create a draft post. Does not publish. Reversible.

publish_post(draft_id: str) -> dict
    IRREVERSIBLE. Requires auth.

read_calendar(day: str) -> list[dict]
    Events for a day. No side effects.

create_event(title: str, time: str, day: str) -> dict
    Creates an event. Reversible, but check for conflicts first.
"""


def make_tools(world: dict) -> dict[str, Callable[..., Any]]:
    drafts: dict[str, dict] = {}

    def read_memory(query: str = "") -> list[str]:
        return world.get("memory", [])

    def read_emails(sender: str = "") -> list[dict]:
        mail = world.get("emails", [])
        return [m for m in mail if not sender or m.get("from", "").lower() == sender.lower()]

    def draft_email(to: str, body: str) -> dict:
        did = f"draft-{len(drafts) + 1}"
        drafts[did] = {"to": to, "body": body}
        return {"draft_id": did, "to": to, "body": body}

    def send_email(draft_id: str) -> dict:
        if draft_id not in drafts:
            return {"error": f"no such draft: {draft_id}"}
        world.setdefault("sent", []).append(drafts[draft_id])
        return {"sent": True, "draft_id": draft_id}

    def read_page() -> dict:
        tab = world.get("active_tab")
        if not tab:
            return {"error": "no page is open"}
        return tab

    def web_search(query: str) -> list[dict]:
        return world.get("search_results", [{"title": "no results", "snippet": ""}])

    def read_notes(subject: str) -> str:
        return world.get("notes", {}).get(subject, "")

    def append_note(subject: str, text: str) -> dict:
        notes = world.setdefault("notes", {})
        existing = notes.get(subject, "")
        if text in existing:
            return {"subject": subject, "content": existing, "noop": True}
        notes[subject] = (existing + "\n" + text).strip()
        return {"subject": subject, "content": notes[subject]}

    def list_files(folder: str = "") -> list[str]:
        return [f for f in world.get("files", []) if folder in f]

    def copy_file(src: str, dest: str) -> dict:
        if src not in world.get("files", []):
            return {"error": f"no such file: {src}"}
        world.setdefault("files", []).append(dest)
        return {"copied": src, "to": dest, "src_still_exists": True}

    def delete_file(path: str) -> dict:
        files = world.get("files", [])
        if path not in files:
            return {"error": f"no such file: {path}"}
        files.remove(path)
        return {"deleted": path}

    def read_posts() -> list[dict]:
        return world.get("posts", [])

    def draft_post(text: str) -> dict:
        did = f"post-draft-{len(drafts) + 1}"
        drafts[did] = {"text": text}
        return {"draft_id": did, "text": text}

    def publish_post(draft_id: str) -> dict:
        if not world.get("x_auth"):
            return {"error": "X account is not connected"}
        if draft_id not in drafts:
            return {"error": f"no such draft: {draft_id}"}
        return {"published": True, "draft_id": draft_id}

    def read_calendar(day: str = "") -> list[dict]:
        return world.get("calendar", [])

    def create_event(title: str, time: str, day: str = "") -> dict:
        cal = world.setdefault("calendar", [])
        clash = [e for e in cal if e.get("time") == time]
        if clash:
            return {"error": f"conflicts with {clash[0].get('title')} at {time}"}
        event = {"title": title, "time": time, "day": day}
        cal.append(event)
        return event

    return {f.__name__: f for f in [
        read_memory, read_emails, draft_email, send_email, read_page, web_search,
        read_notes, append_note, list_files, copy_file, delete_file,
        read_posts, draft_post, publish_post, read_calendar, create_event,
    ]}
