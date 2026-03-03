---

# Design Technical Specification

## 1. General Principles

* The interface must be minimalistic and clean.
* No excessive borders, outlines, or decorative frames.
* Focus on clarity, whitespace, and hierarchy.
* The design must feel lightweight and modern.
* Target platform: **Progressive Web App (PWA)**.

---

## 2. Color System

### Primary Colors

The UI must be built around three core colors:

1. **Light Green** – primary accent color

   * Used for primary buttons, active states, highlights, and important UI elements.

2. **Terracotta** – secondary accent color

   * Used for warnings, secondary actions, status indicators, and emphasis elements.

3. **White Background**

   * Main background color.
   * Ensures clean and distraction-free layout.

### Usage Rules

* Avoid color overuse — accents should guide attention, not dominate the interface.
* Text must maintain sufficient contrast for accessibility (WCAG AA minimum).
* Avoid additional decorative colors unless strictly necessary.

---

## 3. Layout & Visual Style

### Borders

* No visible heavy borders.
* Prefer:

  * Subtle shadows (very light, soft)
  * Background contrast blocks
  * Spacing for separation instead of lines

### Corner Radius

* All interactive components must use:

  * **7px border-radius**
* Applies to:

  * Buttons
  * Inputs
  * Cards
  * Modals
  * Dropdowns

Consistency is mandatory.

---

## 4. Spacing & Structure

* Use consistent spacing scale (e.g., 4px or 8px grid system).
* Prefer whitespace over separators.
* Content should breathe — avoid dense layouts.

---

## 5. Responsiveness

The application must be fully responsive:

### Mobile-first approach

* Design starting from mobile layout.
* Optimize for touch interaction.
* Comfortable tap targets (minimum 44px height).

### Breakpoints

* Mobile
* Tablet
* Desktop

### Behavior

* Flexible layout (CSS Grid or Flexbox recommended).
* No fixed-width containers.
* Content should reflow naturally.
* Avoid horizontal scrolling.

---

## 6. PWA Requirements

* Must look and behave like a native mobile app.
* Safe-area support (for notched devices).
* No browser-looking UI elements.
* Splash screen and icon colors must match primary palette.
* Smooth transitions and lightweight animations.

---

## 7. Interaction Guidelines

* Subtle hover states (desktop only).
* Clear active and pressed states.
* Transitions: 150–250ms ease-in-out.
* No flashy animations.

---

