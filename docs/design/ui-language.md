# UI language

The visual rules every screen follows. They are tokens in `packages/ui/src/styles/product.css`, so a tenant's brand colour changes accents without touching layout, and a rule changes in one place.

## Surface

- **Canvas and working surface.** The app is an inset panel on a grey frame (`--sidebar`), the pattern Shopify uses. The panel (`--background`) has a 14 px radius (`--radius-inset`) and one layered shadow (`--shadow-inset`). On a phone it is edge to edge with no shadow.
- **Dark theme.** The frame is darker than the panel, so the panel still reads as raised (frame 10, panel 21 in OKLCH-derived sRGB; checked from screenshot pixels).
- **Cards and tables** share `--radius-card` (12 px) and a 1 px border; there is no shadow on content, only on the panel.
- **Radius scale.** Controls `--radius` 8 px, cards 12 px, panel 14 px. Nothing else.

## Page structure

1. Breadcrumb in the header: the nav group first, then the page ("Sales › Leads").
2. Title row: title, count, description on the left; the one primary action and secondary actions on the right.
3. **Tabs row** (`PageHeader tabs`): one underline tab strip for the representations of a list (table, board, calendar). It never wraps and scrolls sideways on a phone.
4. Filters, then content.

One primary (filled) button per screen. On Today the primary is "Mark attendance now"; "New lead" is outlined.

## Typography

Title 22 px semibold, tight tracking; description 13 px muted; table text 13 px, table header 11.5 px muted on a tinted row; rows 41 px.

## Roles

What a person sees follows the same rules everywhere ([navigation](navigation.md)): the sidebar, command menu, New menu and Today read one model. Delivery staff see no Sales group, no leads card on Today, and no New lead; the empty team row on Today takes no space for them.

## Checklist for a new screen

- Uses `PageHeader` with `tabs` for views; no custom pill groups.
- One primary action; secondary actions outlined.
- Loading placeholders match final geometry ([layout-shift spec](../../tests/e2e/customer/layout-shift.spec.ts) covers nine routes).
- Works at 390 px and in the dark theme.
- Checked as owner, manager and staff.
