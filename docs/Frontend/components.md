# Frontend UI Components Documentation

NeuroTraffic uses a set of primitive UI components built with Tailwind CSS and inspired by "Brutalist" and "Glassmorphism" design trends. These components are located in `src/components/ui/`.

## 1. Button.tsx

- **Variants**: Supports `primary`, `secondary`, `outline`, and `danger` versions.
- **Styling**: Features sharp borders, monochromatic schemes, and subtle hover/active micro-animations (press-to-scale).
- **Accessibility**: Includes proper focus states and standard HTML button attributes.

## 2. Card.tsx

- **Layout**: Provides a container with a subtle glassmorphism effect (`backdrop-blur`).
- **Composition**: Modular sub-components like `CardHeader`, `CardTitle`, and `CardContent` allow for flexible layout building.
- **Visuals**: Uses a deep charcoal background (`bg-brand-darkgray/50`) with thin borders to maintain a premium feel.

## 3. LogTable.tsx

- **Purpose**: A reusable, high-performance table component optimized for displaying densities and logs.
- **Formatting**: Automatically formats timestamps and provides color-coded density indicators (Green for low, Red for high).
- **Responsiveness**: Implements horizontal scrolling for mobile devices and dense data views.
