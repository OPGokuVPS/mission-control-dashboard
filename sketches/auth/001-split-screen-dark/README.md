## Variant 001 — Split Screen Dark

### Design stance
Enterprise control-plane aesthetic — dark brand panel + clean light form, communicating authority and technical sophistication.

### Key choices
- Layout: 50/50 split; left is brand hero, right is the form
- Brand panel: animated grid background, floating gradient orbs, stats row
- Form: pure white, high contrast inputs with rounded corners
- Input styling: full bordered boxes with focus glow ring
- Social auth: inline Google/GitHub buttons above an "or" divider
- Password: eye toggle for show/hide
- Button: gradient purple-to-indigo with shimmer hover effect
- Responsive: brand panel hides on mobile, form goes full-width

### Trade-offs
- Strong at: makes a strong first impression, communicates "serious tool", clear visual hierarchy
- Weak at: more complex to maintain across breakpoints, heavier CSS

### Best for
- Products that want to communicate power and capability on first load
- Control panels, dashboards, developer tools — anywhere the user expects intensity
