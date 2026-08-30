/* Whether the xAuto block shows on /x.
 *
 * It is hidden by default. xAuto is the hardest part of the product to explain
 * cold: a stranger reading "he judges your timeline and drafts replies" has to
 * be walked through what that means before the rest of the page makes sense,
 * and the rest of the page explains itself. So it is off until someone turns
 * it on from /x/advanced.
 *
 * A browser preference rather than a column on x_settings, deliberately. This
 * is a presentation choice, not something about the account, and it needed to
 * work today without a migration. The cost is that it does not follow you to
 * another browser, which for a switch that lives in Advanced Controls is fine.
 */

const KEY = "braino.x.showXAuto";

export function xAutoVisible(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false; // private mode, or storage blocked: stay hidden
  }
}

export function setXAutoVisible(next: boolean): void {
  try {
    if (next) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* Nothing to do. The getter already fails closed. */
  }
}
