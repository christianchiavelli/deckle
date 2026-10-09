# 57. The receipt is Deckle's, in the order's language

- Status: accepted
- Date: 2026-10-09
- Versions: Vendure 3.7.4 (`@vendure/email-plugin` 3.7.4, MJML 5.4.1, Handlebars 4.7.9), NestJS 12.1.2
- Scope: `services/commerce` (an order custom field, a migration, the receipt and its template), `services/gateway` (checkout), `e2e`

## Context

The receipt every order sends was Vendure's stock order confirmation: its placeholders, "[company header]" and "[footer text]", printed as written, its teal, English for every order, and "Dear ," for a numbered copy, whose customer has no name. ADR 0054 left a Portuguese receipt for later. The owner approved a prototype that follows the order page: the seal, the thanks, the lines with their pictures, a summary sheet, the address, the test payment, and the footer band.

## Decision

- **Deckle's own template**, in `services/commerce/templates/email`: MJML inside Handlebars, rendered by the email plugin's own generator, so a mail app gets the table layout MJML writes for it. The seal is a partial, drawn in the masthead and the footer.
- **The receipt is written in code, the template only prints it.** `receiptOf` turns a placed order into every line the template shows: money, dates and country names formatted for the language as the store formats them, the parts of a date held together by no-break spaces, the thanks to the first name given. A numbered copy's line is named after its work, found through its drop, with its number; its shipping reads "Free".
- **The colours come from the tokens.** The template gets the hex of each token it names from `foundations.json`, in both themes: light inline, which every mail app reads, and dark in a `prefers-color-scheme` block for the apps that follow the reader's theme. The typeface falls back to Helvetica and Arial, since the brand's files are served on this machine alone.
- **The order keeps the language it was placed in.** A custom field, `receiptLanguage` (`en` or `pt-BR`), which the gateway sets when it places an order and when it pays for a copy, from the request's `Accept-Language`, which the store's browser client sets to the page's edition. An order from before it has none, and reads English.
- **The subject names the order**, "Your receipt for order J3JT…" or "Seu recibo do pedido J3JT…", and the pictures are thumbnails as JPEG, which every mail app shows.
- **A unit test renders the template** through the plugin's generator in both languages, and the e2e reads the Portuguese receipt from Mailpit.

## Consequences

- Some words are written twice, in the store's copy and in the receipt's: the receipt is commerce's document, and commerce does not import the store.
- The mail stays in Mailpit, and its pictures point at the store on this machine: a receipt relayed to a real mailbox would show them only on this computer.
- Gmail reads no dark styles, and may darken a receipt by itself.

## Rejected

- **Translating Vendure's stock template**: it would keep its layout, its colours and its placeholders.
- **Vendure's own `languageCode` on the Shop API request**: Portuguese would have to be a channel language, and the choice would end with the request; a field on the order outlives it and shows in the dashboard.
- **A template per language**: the same markup twice, for words that one template can take as values.
- **Pictures attached to the mail and referenced by `cid:`**: they would show in any mailbox, at the cost of the worker fetching every picture; the stack's mail stays on this machine.
