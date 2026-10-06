/** Where a visitor's choice of theme is kept between visits. */
export const THEME_KEY = 'deckle-theme';

/**
 * Runs from the document's head, before the first paint: a theme chosen on
 * an earlier visit applies before anything is drawn, so a dark page never
 * flashes light. Without a choice, the tokens follow the system's.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

/** Switches to the other theme from the one showing, and remembers it. */
export function toggleTheme(): void {
  const root = document.documentElement;
  const showing =
    root.dataset['theme'] ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = showing === 'dark' ? 'light' : 'dark';
  root.dataset['theme'] = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage can be off; the choice then lasts as long as the page.
  }
}
