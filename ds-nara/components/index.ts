/* ─── Design System Component Library ─────────────────────────────────────
   Re-exports all components from their domain files.
   Import from "./components" for the same ergonomics as the original single file.
   ──────────────────────────────────────────────────────────────────────────── */

// Atoms (primitives — the smallest reusable building blocks)
export { Button, IconButton, Card, StatPair, Label, ContentDivider, Counter, Checkbox, SectionHeader, InteractiveCard } from "./atoms";

// Typography (server-compatible)
export { Title, Eyebrow, H1, H2, H3, Body, Caption, Italic } from "./typography";

// Layout (server-compatible)
export { Container, Section, Rule, ThinRule } from "./layout";

// Interactive controls (client components)
export { FilterPills, SortControls, NavPill } from "./controls";

// Tabs family (client components)
export { Tabs, SegmentedControl, TextTabs, IconTabs, TabsWithCount } from "./tabs";

// Form primitives (client components)
export { TextInput, Textarea, Select } from "./forms";

// Status / feedback primitives (client components)
export { StatusBadge, Kbd, MiniStat, Collapsible } from "./status";
export type { StatusBadgeTone } from "./status";

// Command palette (client component)
export { CommandPalette } from "./command-palette";
export type { Command } from "./command-palette";

// Scroll primitives (client components)
export { Scrollable, ScrollToTop } from "./scroll";

// Tables (client components)
export { GhostTable, RuledTable, BorderedTable, StripedTable, CardTable, KeyValueTable } from "./tables";
export type { Column } from "./tables";

// Data display (client components — DataRow uses hover state)
export {
  GaugeBar,
  Swatch,
  CategoryHeader,
  DivergingBar,
  PrevalenceBar,
  DataRow,
  AxisHeader,
  TickMarks,
} from "./data-display";

// Overlays (server-compatible)
export { Tooltip } from "./overlays";

// Meta (server-compatible)
export { Legend, MetaFooter } from "./meta";

// Narrative / storytelling (client components)
export {
  ProgressDots,
  SlideCarousel,
  SlideNumber,
  Tag,
  TagRow,
  TensionGrid,
  FrictionTrack,
  ReframeCards,
  NavButtons,
  Reveal,
  StatusDots,
} from "./narrative";

// Expandable patterns (client components)
export { ExpandableRow, ExpandableListCard, SpecTag, SpecTagRow, SpecRow, PipelineCard } from "./expandable";
export type { FlowStep } from "./expandable";

// Modals (client components)
export { Modal, ModalHeader } from "./modals";

// Chips & node primitives (client components)
export { Chip, NodeBox } from "./chips";

// Flow / diagram primitives (client components)
export { ZoneLabel, FlowArrow } from "./flow";

// Showcase-only (not part of the design system library — documentation utilities)
export { CodeBlock, PreviewBox, ColorCard, PropTable } from "./showcase";
