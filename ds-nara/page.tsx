"use client";

import { useEffect, useRef, useState } from "react";
import {
  colors,
  categoryColors,
  fonts,
  typography,
  radius,
  spacing,
  type CategoryName,
} from "./tokens";
import {
  Title,
  Eyebrow,
  H1,
  H2,
  H3,
  Body,
  Caption,
  Italic,
  Section,
  Rule,
  ThinRule,
  FilterPills,
  SortControls,
  Tabs,
  SegmentedControl,
  TextTabs,
  IconTabs,
  TabsWithCount,
  TextInput,
  Textarea,
  Select,
  StatusBadge,
  Kbd,
  MiniStat,
  Collapsible,
  CommandPalette,
  type Command,
  Scrollable,
  ScrollToTop,
  GhostTable,
  RuledTable,
  BorderedTable,
  StripedTable,
  CardTable,
  KeyValueTable,
  type Column,
  CategoryHeader,
  DivergingBar,
  PrevalenceBar,
  DataRow,
  AxisHeader,
  TickMarks,
  Tooltip,
  Legend,
  MetaFooter,
  ProgressDots,
  SlideCarousel,
  SlideNumber,
  Tag,
  TagRow,
  TensionGrid,
  FrictionTrack,
  ReframeCards,
  NavButtons,
  Button,
  IconButton,
  Card,
  StatPair,
  Label,
  ContentDivider,
  Counter,
  CodeBlock,
  PreviewBox,
  ColorCard,
  PropTable,
  NavPill,
  ExpandableRow,
  ExpandableListCard,
  SpecTag,
  SpecTagRow,
  SpecRow,
  Modal,
  ModalHeader,
  Chip,
  NodeBox,
  PipelineCard,
} from "./components";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitBranch,
  Activity,
  Zap,
  Users,
  FileText,
  Package,
  LayoutGrid,
  List,
  Rows3,
  Columns3,
  Plus,
  Trash2,
  Settings,
  Download,
  MoreHorizontal,
} from "lucide-react";

/* ─── Shared Data ─────────────────────────────────────────────────────────── */

const ALL_DATA = [
  { name: "Productivity & Work", cat: "Cognitive" as CategoryName, net: 72, prev: 88, mag: 85, desc: "Automation of routine tasks, coding, writing, summarisation." },
  { name: "Information Access", cat: "Cognitive" as CategoryName, net: 55, prev: 92, mag: 88, desc: "Radically reduces friction to knowledge." },
  { name: "Learning & Education", cat: "Cognitive" as CategoryName, net: 62, prev: 78, mag: 72, desc: "Personalised tutoring, instant explanation." },
  { name: "Creative Exploration", cat: "Cognitive" as CategoryName, net: 48, prev: 62, mag: 65, desc: "Ideation, rapid prototyping, overcoming blocks." },
  { name: "Attention & Focus", cat: "Cognitive" as CategoryName, net: -55, prev: 85, mag: 83, desc: "AI-optimised content competes for attention." },
  { name: "Emotional Support", cat: "Emotional" as CategoryName, net: 18, prev: 58, mag: 60, desc: "Accessible 24/7, non-judgmental listener." },
  { name: "Mental Health", cat: "Emotional" as CategoryName, net: -12, prev: 74, mag: 78, desc: "Comparison culture, doomscrolling, anxiety." },
  { name: "Self-image & Identity", cat: "Emotional" as CategoryName, net: -30, prev: 68, mag: 72, desc: "AI-generated beauty standards and deepfakes." },
  { name: "Social Connection", cat: "Social" as CategoryName, net: -38, prev: 76, mag: 80, desc: "Substitutes for human contact." },
  { name: "Relationship Quality", cat: "Social" as CategoryName, net: -22, prev: 65, mag: 62, desc: "Phubbing, distraction during presence." },
  { name: "Physical Health Mgmt", cat: "Health" as CategoryName, net: 42, prev: 60, mag: 58, desc: "Symptom checking, fitness coaching." },
  { name: "Sleep Quality", cat: "Health" as CategoryName, net: -50, prev: 80, mag: 76, desc: "AI-optimised content keeps users engaged past bedtime." },
  { name: "Financial Opportunity", cat: "Economic" as CategoryName, net: 52, prev: 58, mag: 66, desc: "New income streams, democratised financial tools." },
  { name: "Job Security", cat: "Economic" as CategoryName, net: -35, prev: 70, mag: 80, desc: "Displacement anxiety across white-collar work." },
  { name: "Privacy & Autonomy", cat: "Civic" as CategoryName, net: -72, prev: 90, mag: 92, desc: "Pervasive data collection without consent." },
  { name: "Misinformation", cat: "Civic" as CategoryName, net: -65, prev: 82, mag: 86, desc: "AI-generated synthetic media and disinformation." },
  { name: "Epistemic Autonomy", cat: "Civic" as CategoryName, net: -40, prev: 72, mag: 74, desc: "Filter bubbles narrow worldviews." },
];

const SAMPLE_DATA = ALL_DATA.slice(0, 8);

/* ─── Bitmap spinner — stepped braille cycle, not smooth ──────────────────── */
const BRAILLE_FRAMES = [
  "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
];

function BitmapSpinner({ size = 12 }: { size?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % BRAILLE_FRAMES.length), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      aria-hidden
      style={{
        fontFamily: fonts.mono,
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        width: size,
        textAlign: "center",
      }}
    >
      {BRAILLE_FRAMES[i]}
    </span>
  );
}

/* ─── State-variant buttons used in the Button → States showcase ──────────── */
type NaraButtonState = "default" | "disabled" | "loading" | "saving";

function NaraStateButton({
  state,
  children,
}: {
  state: NaraButtonState;
  children: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    ...typography.label,
    fontFamily: fonts.mono,
    padding: "8px 14px",
    borderRadius: radius.sm,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: state === "disabled" ? "default" : "pointer",
    background: colors.bg,
    color: colors.ink,
    border: `1px solid ${colors.ink}`,
  };
  if (state === "default") {
    return (
      <button type="button" style={{ ...base, background: colors.ink, color: colors.bg }}>
        {children}
      </button>
    );
  }
  if (state === "disabled") {
    return (
      <button
        type="button"
        disabled
        style={{
          ...base,
          border: `1px solid ${colors.ink3}`,
          color: colors.ink3,
          textDecoration: "line-through",
        }}
      >
        {children}
      </button>
    );
  }
  if (state === "loading") {
    return (
      <button type="button" style={base}>
        <BitmapSpinner />
        {children}
      </button>
    );
  }
  // saving
  return (
    <button
      type="button"
      style={{ ...base, borderStyle: "dashed" }}
    >
      <BitmapSpinner />
      {children}
    </button>
  );
}

/* ─── Section definitions ─────────────────────────────────────────────────── */

const SECTION_GROUPS = [
  {
    group: "Foundations",
    items: [
      { id: "overview", label: "Overview" },
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "layout", label: "Layout" },
    ],
  },
  {
    group: "Atoms",
    items: [
      { id: "button", label: "Button" },
      { id: "label", label: "Label" },
      { id: "stat-pair", label: "Stat Pair" },
      { id: "content-divider", label: "Content Divider" },
      { id: "counter", label: "Counter" },
      { id: "status-badge", label: "Status Badge" },
      { id: "kbd", label: "Kbd" },
      { id: "mini-stat", label: "Mini Stat" },
    ],
  },
  {
    group: "Forms",
    items: [
      { id: "text-input", label: "Text Input" },
      { id: "textarea", label: "Textarea" },
      { id: "select", label: "Select" },
    ],
  },
  {
    group: "Controls",
    items: [
      { id: "filter-pills", label: "Filter Pills" },
      { id: "sort-controls", label: "Sort Controls" },
      { id: "tabs", label: "Tabs" },
    ],
  },
  {
    group: "Containers",
    items: [
      { id: "card", label: "Card" },
      { id: "collapsible", label: "Collapsible" },
      { id: "scrollable", label: "Scrollable" },
    ],
  },
  {
    group: "Tables",
    items: [
      { id: "ghost-table", label: "Ghost Table" },
      { id: "ruled-table", label: "Ruled Table" },
      { id: "bordered-table", label: "Bordered Table" },
      { id: "striped-table", label: "Striped Table" },
      { id: "card-table", label: "Card Table" },
      { id: "key-value-table", label: "Key-Value Table" },
    ],
  },
  {
    group: "Data Display",
    items: [
      { id: "category-header", label: "Category Header" },
      { id: "diverging-bar", label: "Diverging Bar" },
      { id: "prevalence-bar", label: "Prevalence Bar" },
      { id: "data-row", label: "Data Row" },
      { id: "axis-ticks", label: "Axis & Ticks" },
    ],
  },
  {
    group: "Overlays",
    items: [
      { id: "tooltip", label: "Tooltip" },
      { id: "command-palette", label: "Command Palette" },
    ],
  },
  {
    group: "Meta",
    items: [
      { id: "legend", label: "Legend" },
      { id: "meta-footer", label: "Meta Footer" },
      { id: "tags", label: "Tags" },
    ],
  },
  {
    group: "Narrative",
    items: [
      { id: "tension-grid", label: "Tension Grid" },
      { id: "friction-track", label: "Friction Track" },
      { id: "reframe-cards", label: "Reframe Cards" },
      { id: "stepper", label: "Stepper & Carousel" },
    ],
  },
  {
    group: "Architecture",
    items: [
      { id: "expandable-row", label: "Expandable Row" },
      { id: "expandable-list-card", label: "Expandable List Card" },
      { id: "modal", label: "Modal" },
      { id: "chip-nodebox", label: "Chip & NodeBox" },
      { id: "spec-tags", label: "Spec Tags" },
      { id: "pipeline-card", label: "Pipeline Card" },
    ],
  },
  {
    group: "Patterns",
    items: [
      { id: "card-patterns", label: "Card Patterns" },
      { id: "card-guidelines", label: "Card Do's & Don'ts" },
      { id: "composed", label: "Full Composition" },
      { id: "story", label: "Story Composition" },
    ],
  },
];

const SECTIONS = SECTION_GROUPS.flatMap((g) => g.items);

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function DesignSystemPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const isScrollingRef = useRef(false);

  /* Interactive state for demos */
  const [filterVal, setFilterVal] = useState<string | null>(null);
  const [sortVal, setSortVal] = useState("cat");
  const [barValue, setBarValue] = useState(45);
  const [barMag, setBarMag] = useState(75);
  const [prevValue, setPrevValue] = useState(72);
  const [tabVal, setTabVal] = useState("overview");
  const [segVal, setSegVal] = useState("day");
  const [textTabVal, setTextTabVal] = useState("all");
  const [iconTabVal, setIconTabVal] = useState("grid");
  const [countTabVal, setCountTabVal] = useState("inbox");
  const [inputVal, setInputVal] = useState("");
  const [textareaVal, setTextareaVal] = useState("");
  const [selectVal, setSelectVal] = useState("medium");
  const [btnVariant, setBtnVariant] = useState<string | null>(null);
  const [btnSize, setBtnSize] = useState("md");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteLog, setPaletteLog] = useState<string | null>(null);

  /* Scroll-tracking via IntersectionObserver */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isScrollingRef.current) {
            setActiveSection(s.id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  /* Global Cmd+K / Ctrl+K to open palette */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    isScrollingRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { isScrollingRef.current = false; }, 800);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: colors.bg,
      }}
    >
      {/* ── Sidebar ── */}
      <nav
        aria-label="Component sections"
        style={{
          width: 180,
          flexShrink: 0,
          padding: "40px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          borderRight: `1px solid ${colors.rule}`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: 14,
            fontWeight: 400,
            color: colors.ink,
            marginBottom: 20,
            paddingLeft: 10,
          }}
        >
          Components
        </div>
        {SECTION_GROUPS.map((group, i) => (
          <div key={group.group} style={{ marginTop: i === 0 ? 0 : spacing.md }}>
            <div
              style={{
                ...typography.label,
                color: colors.ink3,
                paddingLeft: 10,
                marginBottom: spacing.xxs,
              }}
            >
              {group.group}
            </div>
            {group.items.map((s) => (
              <NavPill
                key={s.id}
                label={s.label}
                active={activeSection === s.id}
                onClick={() => scrollTo(s.id)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          padding: "40px 48px 80px",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {/* ── OVERVIEW ── */}
        <div id="overview" style={{ marginBottom: 48 }}>
          <Eyebrow>Component Library</Eyebrow>
          <H1>NaRa Design System</H1>
          <Body style={{ maxWidth: 480 }}>
            A component library for the Cockpit spatial dev workspace.
            Forked from the editorial foundation, evolving independently
            for dev tooling UX. Every component on this page is built
            from the library it documents.
          </Body>
        </div>

        {/* ── IDENTITY: COVER ── */}
        <Section>
          <div id="identity-cover" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Identity Guidelines</Eyebrow>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nara/logomark.svg"
              alt="NaRa — ur digital oracle"
              style={{
                display: "block",
                width: "100%",
                maxWidth: 420,
                height: "auto",
                margin: "24px 0 32px",
              }}
            />
            <Body style={{ maxWidth: 560, marginBottom: 16 }}>
              Nara is a palm-sized physical digital oracle designed to support
              personal reflection and cognitive health. It functions as a
              private, low-resolution consultant, powered by contextual AI,
              that helps users process uncertainty, develop their own
              judgment, and optionally exchange insight with trusted peers.
            </Body>
            <div
              style={{
                fontFamily: fonts.mono,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.ink,
              }}
            >
              v1.0: 04/10/2026
            </div>
          </div>
        </Section>

        {/* ── IDENTITY: TYPOGRAPHY SPEC ── */}
        <Section>
          <div id="identity-type" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Identity Guidelines</Eyebrow>
            <H2>Type Scale</H2>
            <Body style={{ marginBottom: 20, maxWidth: 560 }}>
              Two typefaces, two weights. PP Mondwest Regular (400) for
              display, headline, and body. PP NeueBit Bold (700) for UI,
              subheads, mono body, and captions. All-caps is reserved for H2
              and captions.
            </Body>
            <div
              style={{
                border: `1px solid ${colors.ink}`,
                background: colors.bg,
                fontFamily: fonts.mono,
                fontWeight: 700,
                fontSize: 13,
                color: colors.ink,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1.5fr 1fr 80px",
                  padding: "10px 14px",
                  borderBottom: `1px solid ${colors.ink}`,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <div>Level</div>
                <div>Family</div>
                <div>Size</div>
                <div>All Caps</div>
              </div>
              {[
                ["Display", "PP Mondwest", "32 – 128", "☒"],
                ["H1", "PP Mondwest", "24 – 96", "☒"],
                ["Body", "PP Mondwest", "12 – 20", "☒"],
                ["H2", "PP NeueBit", "0.63 × H1", "☑"],
                ["Body (mono)", "PP NeueBit", "9 – 16", "☒"],
                ["Caption", "PP NeueBit", "6 – 12", "☑"],
              ].map(([level, family, size, caps], i, arr) => (
                <div
                  key={level}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1.5fr 1fr 80px",
                    padding: "10px 14px",
                    borderBottom:
                      i === arr.length - 1
                        ? "none"
                        : `1px solid ${colors.rule}`,
                  }}
                >
                  <div>{level}</div>
                  <div>{family}</div>
                  <div>{size}</div>
                  <div>{caps}</div>
                </div>
              ))}
            </div>
            <Caption
              style={{ marginTop: 12, display: "block" }}
            >
              PP Mondwest ships Regular only. PP NeueBit ships Bold only.
            </Caption>
          </div>
        </Section>

        {/* ── IDENTITY: GLYPH LEXICON ── */}
        <Section>
          <div id="identity-glyphs" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Identity Guidelines</Eyebrow>
            <H2>Glyph Lexicon</H2>
            <Body style={{ marginBottom: 20, maxWidth: 560 }}>
              Lofi, hand-drawn, organic, primitive, folkloric, biomorphic.
              Drawn from the Unicode symbol plane and rendered in PP Mondwest
              so each glyph inherits the same bitmap warmth as the wordmark.
            </Body>
            <div
              style={{
                border: `1px solid ${colors.ink}`,
                padding: 20,
                background: colors.bg,
              }}
            >
              {[
                "☼ ☾ ☀ ♺ ✨ ⚠ ☁ ☂ ☃ ☕ ♖ ♙ ♜ ♟ ♡ ♢ ♥ ♦ ♪ ♫",
                "← ↑ → ↓ ↔ ∆ ∇ √ ∞ ≈ ≠ © ® ™ ℮ № ℃ ℉",
                "■ □ ▧ ▨ ▩ ◊ ☐ ☑ ☒ ☓ ☔ ☨ ☹ ☺ ☻ ☽ ♩ ♬ ♻ ⚖ ⚗ ⛅ ⛈",
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: fonts.serif,
                    fontWeight: 400,
                    fontSize: 32,
                    lineHeight: 1.4,
                    color: colors.ink,
                    letterSpacing: "0.08em",
                    wordSpacing: "0.2em",
                  }}
                >
                  {row}
                </div>
              ))}
            </div>
            <Caption
              style={{ marginTop: 12, display: "block" }}
            >
              Lofi, hand-drawn, organic, primitive, folkloric, biomorphic.
            </Caption>
          </div>
        </Section>

        {/* ── COLORS ── */}
        <Section>
          <div id="colors" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Foundations</Eyebrow>
            <H2>Color Tokens</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              A restrained palette anchored by warm paper and dark ink, with
              semantic harm/help tones for data encoding and six category accent
              colors.
            </Body>

            <H3>Core</H3>
            <PreviewBox>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorCard name="bg" value={colors.bg} textColor={colors.ink} />
                <ColorCard name="ink" value={colors.ink} />
                <ColorCard name="ink2" value={colors.ink2} />
                <ColorCard name="ink3" value={colors.ink3} />
                <ColorCard name="rule" value={colors.rule} />
                <ColorCard name="ruleStrong" value={colors.ruleStrong} />
                <ColorCard name="inkFaint" value={colors.inkFaint} textColor={colors.ink} />
                <ColorCard name="inkSubtle" value={colors.inkSubtle} textColor={colors.ink} />
                <ColorCard name="inkHover" value={colors.inkHover} textColor={colors.ink} />
              </div>
            </PreviewBox>

            <H3 style={{ marginTop: 24 }}>Semantic (collapsed to B/W)</H3>
            <PreviewBox>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorCard name="harm" value={colors.harm} />
                <ColorCard name="help" value={colors.help} />
                <ColorCard name="amber" value={colors.amber} />
              </div>
            </PreviewBox>

            {/* Black-is-not-a-background callout */}
            <div
              style={{
                marginTop: 24,
                padding: 20,
                border: `1px solid ${colors.ink}`,
                background: colors.bg,
                fontFamily: fonts.serif,
                fontSize: 18,
                fontWeight: 400,
                color: colors.ink,
                lineHeight: 1.35,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Guideline
              </div>
              Black should never be used as full background color. Exception
              can be made for when highlighting or when used on small design
              elements in layout.
            </div>

            <H3 style={{ marginTop: 24 }}>Category Accents</H3>
            <div
              style={{
                border: `1px solid ${colors.ink}`,
                padding: 24,
                marginTop: 8,
                marginBottom: 16,
                fontFamily: fonts.serif,
                fontSize: 17,
                lineHeight: 1.55,
                color: colors.ink,
                background: colors.bg,
              }}
            >
              <div
                style={{
                  ...typography.label,
                  color: colors.ink,
                  marginBottom: 10,
                }}
              >
                CATEGORY ACCENTS — COLLAPSED
              </div>
              NaRa does not use accent color to differentiate categories.
              Category meaning is encoded through typography scale, glyph
              selection, or layout position. Anything that required color
              encoding in a legacy DS collapses to pure black in NaRa.
            </div>

            <CodeBlock>{`import { colors, categoryColors } from "./tokens";

colors.bg      // "#ffffff"
colors.ink     // "#000000"
colors.rule    // "rgba(0,0,0,0.18)"
colors.ruleStrong // "#000000"

// NaRa collapses semantic color to B/W.
categoryColors.Cognitive  // "#000000"
categoryColors.Emotional  // "#000000"`}</CodeBlock>
          </div>
        </Section>

        {/* ── TYPOGRAPHY ── */}
        <Section>
          <div id="typography" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Foundations</Eyebrow>
            <H2>Typography</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Two typefaces: PP Mondwest Regular for display and body, PP
              NeueBit Bold for UI, headers, captions and data. Mondwest
              carries an 8-bit styled serif warmth; NeueBit is pixel-grid
              precise and all-caps-native. No third face — the tension
              between the pair does all the work.
            </Body>

            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <Label>TITLE — PP MONDWEST 400</Label>
                  <Title style={{ marginBottom: 0 }}>
                    Display Title
                  </Title>
                </div>
                <ThinRule />
                <div>
                  <Label>EYEBROW</Label>
                  <Eyebrow>Component Library &middot; 2025</Eyebrow>
                </div>
                <ThinRule />
                <div>
                  <Label>H1 — PANGAIA 200</Label>
                  <H1 style={{ marginBottom: 0 }}>
                    Where AI helps. <Italic>Where it doesn&apos;t.</Italic>
                  </H1>
                </div>
                <ThinRule />
                <div>
                  <Label>H2 — PANGAIA 200</Label>
                  <H2 style={{ marginBottom: 0 }}>Section Heading</H2>
                </div>
                <ThinRule />
                <div>
                  <Label>H3 — PANGAIA 500</Label>
                  <H3 style={{ marginBottom: 0 }}>Subsection Title</H3>
                </div>
                <ThinRule />
                <div>
                  <Label>BODY — NEUE MONTREAL 400, 13PX</Label>
                  <Body>
                    Each row is a life domain. Bars extend left toward harm,
                    right toward help. The small bar on the right shows how
                    broadly each effect is experienced.
                  </Body>
                </div>
                <ThinRule />
                <div>
                  <Label>ITALIC — PANGAIA ITALIC</Label>
                  <H2 style={{ marginBottom: 0 }}>
                    Editorial voice with <Italic>emphasis</Italic> woven in.
                  </H2>
                </div>
                <ThinRule />
                <div>
                  <Label>CAPTION — IBM PLEX MONO 400, 11PX</Label>
                  <Caption>PREVALENCE &middot; NET EFFECT &middot; MAGNITUDE</Caption>
                </div>
                <ThinRule />
                <div>
                  <Label>LABEL — IBM PLEX MONO 9PX, 0.12EM</Label>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={typography.label}>DEFAULT</span>
                    <span style={{ ...typography.label, color: colors.harm }}>
                      &larr; HARM
                    </span>
                    <span style={{ ...typography.label, color: colors.help }}>
                      HELP &rarr;
                    </span>
                  </div>
                </div>
                <ThinRule />
                <div>
                  <Label>STAT — IBM PLEX MONO 500, 9PX</Label>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={typography.stat}>+72 / 100</span>
                    <span style={typography.stat}>88%</span>
                    <span style={typography.stat}>N = 1,284</span>
                  </div>
                </div>
              </div>
            </PreviewBox>

            <CodeBlock>{`<Title>Display Title</Title>
<Eyebrow>Component Library · 2025</Eyebrow>
<H1>Where AI helps. <Italic>Where it doesn't.</Italic></H1>
<H2>Section Heading</H2>
<H3>Subsection Title</H3>
<Body>Descriptive paragraph text...</Body>
<Caption>CAPTION TEXT</Caption>
<span style={typography.label}>LABEL</span>
<span style={typography.stat}>+72 / 100</span>`}</CodeBlock>
          </div>
        </Section>

        {/* ── LAYOUT ── */}
        <Section>
          <div id="layout" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Foundations</Eyebrow>
            <H2>Layout</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Container constrains to 820px. Section adds border-top spacing.
              Rule and ThinRule provide visual breaks at two weights.
            </Body>

            <PreviewBox style={{ background: colors.inkFaint }}>
              <div
                style={{
                  border: `1px dashed ${colors.ink3}`,
                  padding: 16,
                  borderRadius: 0,
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                <Label>CONTAINER (MAX 820PX)</Label>
                <div style={{ marginTop: 12 }}>
                  <Rule />
                  <Label style={{ marginTop: 8, marginBottom: 0 }}>
                    RULE (1.5PX, INK)
                  </Label>
                </div>
                <div style={{ marginTop: 12 }}>
                  <ThinRule />
                  <Label style={{ marginTop: 8, marginBottom: 0 }}>
                    THIN RULE (1PX, RULE)
                  </Label>
                </div>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "maxWidth", type: "number", default: "820", description: "Container max width in px" },
                { name: "style", type: "CSSProperties", description: "Override styles on Container and Section" },
              ]}
            />
          </div>
        </Section>

        {/* ── BUTTON ── */}
        <Section>
          <div id="button" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Atoms</Eyebrow>
            <H2>Button</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Five variants across three sizes. Supports icon slots,
              loading state, full-width layout, and a dedicated IconButton
              variant for icon-only controls.
            </Body>

            {/* ── Playground ── */}
            <H3 style={{ marginTop: 16 }}>Playground</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Filter by variant and size to inspect any combination.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
                  <Label style={{ marginBottom: 0 }}>Variant</Label>
                  <FilterPills
                    options={["primary", "secondary", "ghost", "outline", "danger"]}
                    value={btnVariant}
                    onChange={setBtnVariant}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
                  <Label style={{ marginBottom: 0 }}>Size</Label>
                  <SortControls
                    options={[
                      { key: "sm", label: "Small" },
                      { key: "md", label: "Medium" },
                      { key: "lg", label: "Large" },
                    ]}
                    value={btnSize}
                    onChange={setBtnSize}
                  />
                </div>
                <ThinRule />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", minHeight: 60 }}>
                  {(btnVariant ? [btnVariant] : ["primary", "secondary", "ghost", "outline", "danger"]).map((v) => (
                    <Button
                      key={v}
                      variant={v as "primary" | "secondary" | "ghost" | "outline" | "danger"}
                      size={btnSize as "sm" | "md" | "lg"}
                      leftIcon={<Plus size={btnSize === "sm" ? 10 : btnSize === "lg" ? 14 : 12} strokeWidth={2} />}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {(btnVariant ? [btnVariant] : ["primary", "secondary", "ghost", "outline", "danger"]).map((v) => (
                    <Button
                      key={`${v}-plain`}
                      variant={v as "primary" | "secondary" | "ghost" | "outline" | "danger"}
                      size={btnSize as "sm" | "md" | "lg"}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </PreviewBox>

            {/* ── Variants ── */}
            <H3 style={{ marginTop: 36 }}>Variants</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Primary for main CTAs, secondary for default actions, ghost
              for tertiary, outline for emphasis pairs, danger for
              destructive actions.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </PreviewBox>

            {/* ── Sizes ── */}
            <H3 style={{ marginTop: 36 }}>Sizes</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Three densities. Use <code>sm</code> in toolbars and inline
              forms, <code>md</code> as the default, <code>lg</code> for
              hero CTAs.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Button size="sm" variant="primary">Small</Button>
                <Button size="md" variant="primary">Medium</Button>
                <Button size="lg" variant="primary">Large</Button>
              </div>
            </PreviewBox>

            {/* ── With icons ── */}
            <H3 style={{ marginTop: 36 }}>With icons</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              <code>leftIcon</code> for verbs (Create, Download),
              <code>rightIcon</code> for navigation (Continue →, Open ↗).
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary" leftIcon={<Plus size={12} strokeWidth={2} />}>
                  New ticket
                </Button>
                <Button variant="secondary" leftIcon={<Download size={12} strokeWidth={1.5} />}>
                  Download
                </Button>
                <Button variant="ghost" rightIcon={<ArrowUpRight size={12} strokeWidth={1.5} />}>
                  Open docs
                </Button>
                <Button variant="danger" leftIcon={<Trash2 size={12} strokeWidth={1.5} />}>
                  Delete
                </Button>
              </div>
            </PreviewBox>

            {/* ── States ── */}
            <H3 style={{ marginTop: 36 }}>States</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Four states, zero color. Differentiation comes from stroke
              treatment: filled ink for the live default, faded strike-through
              for disabled, bitmap spinner for loading, and a dashed border
              for in-flight save. The spinner cycles braille frames in stepped
              frames — no smooth interpolation, true to the ePaper grid.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <NaraStateButton state="default">Default</NaraStateButton>
                <NaraStateButton state="disabled">Disabled</NaraStateButton>
                <NaraStateButton state="loading">Loading</NaraStateButton>
                <NaraStateButton state="saving">Saving…</NaraStateButton>
              </div>
            </PreviewBox>

            {/* ── Full width ── */}
            <H3 style={{ marginTop: 36 }}>Full width</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Stretches to fill the parent. Use in drawers, modals, and
              narrow sidebars where buttons should align to container edges.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
                <Button variant="primary" fullWidth>Continue</Button>
                <Button variant="secondary" fullWidth>Cancel</Button>
              </div>
            </PreviewBox>

            {/* ── IconButton ── */}
            <H3 style={{ marginTop: 36 }}>Icon Button</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Square icon-only variant. Inherits all Button variants and
              sizes. Requires <code>aria-label</code>.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <IconButton
                    size="sm"
                    icon={<Settings size={12} strokeWidth={1.5} />}
                    aria-label="Settings"
                  />
                  <IconButton
                    size="md"
                    icon={<Settings size={14} strokeWidth={1.5} />}
                    aria-label="Settings"
                  />
                  <IconButton
                    size="lg"
                    icon={<Settings size={16} strokeWidth={1.5} />}
                    aria-label="Settings"
                  />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <IconButton
                    variant="primary"
                    icon={<Plus size={14} strokeWidth={2} />}
                    aria-label="Add"
                  />
                  <IconButton
                    variant="secondary"
                    icon={<MoreHorizontal size={14} strokeWidth={1.5} />}
                    aria-label="More"
                  />
                  <IconButton
                    variant="ghost"
                    icon={<Settings size={14} strokeWidth={1.5} />}
                    aria-label="Settings"
                  />
                  <IconButton
                    variant="danger"
                    icon={<Trash2 size={14} strokeWidth={1.5} />}
                    aria-label="Delete"
                  />
                </div>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "variant", type: '"primary" | "secondary" | "ghost" | "outline" | "danger"', default: '"secondary"', description: "Visual style" },
                { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Visual density" },
                { name: "leftIcon", type: "ReactNode", description: "Icon before label" },
                { name: "rightIcon", type: "ReactNode", description: "Icon after label" },
                { name: "loading", type: "boolean", default: "false", description: "Show spinner + disable click" },
                { name: "disabled", type: "boolean", default: "false", description: "Disable interaction" },
                { name: "fullWidth", type: "boolean", default: "false", description: "Stretch to parent width" },
                { name: "onClick", type: "() => void", description: "Click handler" },
                { name: "type", type: '"button" | "submit" | "reset"', default: '"button"', description: "HTML button type" },
              ]}
            />

            <CodeBlock>{`<Button variant="primary" size="md">Submit</Button>
<Button variant="danger" leftIcon={<Trash2 size={12} />}>Delete</Button>
<Button variant="primary" loading>Saving…</Button>
<Button variant="primary" fullWidth>Continue</Button>
<IconButton variant="ghost" icon={<Settings />} aria-label="Settings" />`}</CodeBlock>
          </div>
        </Section>

        {/* ── LABEL ── */}
        <Section>
          <div id="label" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Atoms</Eyebrow>
            <H2>Label</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Tiny uppercase label (8.5px, 0.14em spacing) with optional color.
              Distinct from Caption (9px, 0.15em). Used in cards, form groups,
              and section markers.
            </Body>

            <PreviewBox>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <Label>Default</Label>
                  <Label color={colors.harm}>Harm</Label>
                  <Label color={colors.help}>Help</Label>
                  <Label color={colors.amber}>Amber</Label>
                  <Label color={colors.ink3}>Muted</Label>
                </div>
                <div>
                  <Caption>CAPTION FOR COMPARISON</Caption>
                  <div style={{ marginTop: 8 }}>
                    <Label>LABEL FOR COMPARISON</Label>
                  </div>
                </div>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "children", type: "ReactNode", description: "Label text" },
                { name: "color", type: "string", description: "Override text color" },
              ]}
            />
          </div>
        </Section>

        {/* ── STAT PAIR ── */}
        <Section>
          <div id="stat-pair" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Atoms</Eyebrow>
            <H2>Stat Pair</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Key-value row with muted label and bold value. Used inside
              Tooltip and anywhere you need aligned stat readouts. Supports
              inverted mode for dark surfaces.
            </Body>

            <PreviewBox>
              <div style={{ maxWidth: 240 }}>
                <StatPair label="Net effect" value="+72 / 100" valueColor={colors.help} />
                <StatPair label="Prevalence" value="88%" />
                <StatPair label="Impact" value="85 / 100" />
              </div>
              <ContentDivider />
              <Label>INVERTED (ON DARK SURFACE)</Label>
              <div style={{ background: colors.ink, borderRadius: 0, padding: "12px 16px", marginTop: 8, maxWidth: 240 }}>
                <StatPair label="Net effect" value="+72" valueColor="#000000" inverted />
                <StatPair label="Prevalence" value="88%" inverted />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Left-aligned muted label" },
                { name: "value", type: "string", description: "Right-aligned bold value" },
                { name: "valueColor", type: "string", description: "Override value text color" },
                { name: "inverted", type: "boolean", default: "false", description: "For dark surfaces (tooltips)" },
              ]}
            />
          </div>
        </Section>

        {/* ── CONTENT DIVIDER ── */}
        <Section>
          <div id="content-divider" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Atoms</Eyebrow>
            <H2>Content Divider</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Thin rule with built-in vertical breathing room (20px padding-top,
              4px margin-top). Unlike Rule/ThinRule which are just lines, this
              creates a content section break.
            </Body>

            <PreviewBox>
              <Body>Content above the divider.</Body>
              <ContentDivider />
              <Body>Content below — note the built-in spacing.</Body>
            </PreviewBox>
          </div>
        </Section>

        {/* ── COUNTER ── */}
        <Section>
          <div id="counter" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Atoms</Eyebrow>
            <H2>Counter</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Step or page counter text. Renders as &ldquo;N / M&rdquo; in the
              standard muted mono style.
            </Body>

            <PreviewBox>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <Counter current={1} total={4} />
                <Counter current={3} total={10} />
                <Counter current={17} total={17} />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "current", type: "number", description: "Current step/page" },
                { name: "total", type: "number", description: "Total steps/pages" },
              ]}
            />
          </div>
        </Section>

        {/* ── STATUS BADGE ── */}
        <Section>
          <div id="status-badge" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Feedback</Eyebrow>
            <H2>Status Badge</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Colored dot + uppercase label. The canonical status pattern.
              Five semantic tones: neutral, help, harm, amber, muted. Two
              visual weights: inline (default) and filled pill.
            </Body>

            <H3 style={{ marginTop: 16 }}>Inline (default)</H3>
            <PreviewBox>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <StatusBadge label="Neutral" tone="neutral" glyph="◯" />
                <StatusBadge label="Passing" tone="help" glyph="☑" />
                <StatusBadge label="Failed" tone="harm" glyph="☒" />
                <StatusBadge label="Queued" tone="amber" glyph="◌" />
                <StatusBadge label="Draft" tone="muted" glyph="◇" />
                <StatusBadge label="Running" tone="help" glyph="⬢" pulse />
              </div>
            </PreviewBox>

            <H3 style={{ marginTop: 24 }}>Filled pill</H3>
            <PreviewBox>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <StatusBadge label="Active" tone="neutral" filled />
                <StatusBadge label="Shipped" tone="help" filled />
                <StatusBadge label="Blocked" tone="harm" filled />
                <StatusBadge label="Pending" tone="amber" filled />
                <StatusBadge label="Archived" tone="muted" filled />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Status text (auto-uppercased via label token)" },
                { name: "tone", type: '"neutral" | "help" | "harm" | "amber" | "muted"', default: '"neutral"', description: "Semantic tone — drives default glyph mapping" },
                { name: "glyph", type: "string", description: "Override the marker glyph (e.g. ☑ ☒ ◯ ◇ ◌ ⬢)" },
                { name: "pulse", type: "boolean", default: "false", description: "Animate marker with soft pulse" },
                { name: "filled", type: "boolean", default: "false", description: "Render as a bordered pill" },
              ]}
            />

            <CodeBlock>{`<StatusBadge label="Running" tone="help" pulse />
<StatusBadge label="Blocked" tone="harm" filled />`}</CodeBlock>
          </div>
        </Section>

        {/* ── KBD ── */}
        <Section>
          <div id="kbd" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Feedback</Eyebrow>
            <H2>Kbd</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Keyboard shortcut hint. Parses combos like &quot;Cmd+K&quot; into
              individual key pills. Use inline in help text, tooltips, and
              command hints.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <Kbd>Cmd+K</Kbd>
                  <Kbd>Shift+Enter</Kbd>
                  <Kbd>Cmd+Shift+P</Kbd>
                  <Kbd>Esc</Kbd>
                </div>
                <div style={{ ...typography.body, color: colors.ink2 }}>
                  Press <Kbd>Cmd+K</Kbd> to open the command palette, or{" "}
                  <Kbd muted>Esc</Kbd> to cancel.
                </div>
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "children", type: "string | string[]", description: "Key combo as 'Cmd+K' string or array of keys" },
                { name: "muted", type: "boolean", default: "false", description: "Dimmer variant for secondary hints" },
              ]}
            />
          </div>
        </Section>

        {/* ── MINI STAT ── */}
        <Section>
          <div id="mini-stat" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Feedback</Eyebrow>
            <H2>Mini Stat</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Small label-above-value pair for dashboard metadata and inline
              metrics. Five directions below — pick the two that feel right.
            </Body>

            {/* ── V1: Mono label + sans body value ── */}
            <H3 style={{ marginTop: 16 }}>V1. Mono label + body value</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              9px mono uppercase label, 13px body sans value. Value reads
              as regular copy — soft, integrates with body paragraphs.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
                {[
                  { label: "Time", value: "4m 12s" },
                  { label: "Tokens", value: "31.7k" },
                  { label: "Cost", value: "$0.73" },
                  { label: "Files", value: "12" },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ ...typography.label, color: colors.ink3, marginBottom: spacing.xxs }}>
                      {s.label}
                    </div>
                    <div style={{ ...typography.body, color: colors.ink, lineHeight: 1 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </PreviewBox>

            {/* ── V2: Mono label + serif value ── */}
            <H3 style={{ marginTop: 36 }}>V2. Mono label + serif value</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              12px mono label, 24px serif value (PP Mondwest). Editorial tone —
              the value becomes a statement. Matches the card pattern hero
              numbers.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
                {[
                  { label: "Time", value: "4m 12s" },
                  { label: "Tokens", value: "31.7k" },
                  { label: "Cost", value: "$0.73" },
                  { label: "Files", value: "12" },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ ...typography.label, color: colors.ink3, marginBottom: spacing.xxs }}>
                      {s.label}
                    </div>
                    <div style={{ ...typography.h3, lineHeight: 1, marginBottom: 0 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </PreviewBox>

            {/* ── V4: Inline label + value ── */}
            <H3 style={{ marginTop: 36 }}>V3. Inline (label · value)</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Single-line format: 11px mono label, 11px mono value,
              separated by a middot. Compact — fits in dense toolbars and
              metadata bars.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Time", value: "4m 12s" },
                  { label: "Tokens", value: "31.7k" },
                  { label: "Cost", value: "$0.73" },
                  { label: "Files", value: "12" },
                ].map((s) => (
                  <div key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: spacing.xxs, lineHeight: 1 }}>
                    <span style={{ ...typography.label, color: colors.ink3, marginBottom: 0 }}>{s.label}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: colors.ink3, lineHeight: 1 }}>·</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: colors.ink, lineHeight: 1 }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Label above the value" },
                { name: "value", type: "string", description: "Value string" },
                { name: "valueColor", type: "string", description: "Override the value text color" },
              ]}
            />
          </div>
        </Section>

        {/* ── TEXT INPUT ── */}
        <Section>
          <div id="text-input" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Forms</Eyebrow>
            <H2>Text Input</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Single-line text field. Supports optional label, hint text,
              error state, and an inline right-aligned label (e.g., character
              counter). Uses body typography for input content.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 360 }}>
                <TextInput
                  label="Branch name"
                  placeholder="feature/auth-fix"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  labelRight={`${inputVal.length} / 64`}
                />
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  hint="Work email only. Used for notifications."
                />
                <TextInput
                  label="Slug"
                  value="invalid slug"
                  error="Slugs may not contain spaces."
                  onChange={() => {}}
                />
                <TextInput label="Project ID" value="proj-a8f2k" disabled onChange={() => {}} />
              </div>
            </PreviewBox>

            <H3 style={{ marginTop: 24 }}>Compact variant</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Denser variant for toolbars, inline filters, and tight
              sidebars. Uses 11px mono-style typography and tighter padding.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 280 }}>
                <TextInput size="compact" placeholder="Search tickets…" />
                <TextInput size="compact" label="Filter" placeholder="type to filter…" />
                <TextInput
                  size="compact"
                  label="Token"
                  value="ghp_invalid"
                  error="Invalid format."
                  onChange={() => {}}
                />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Label above the input" },
                { name: "hint", type: "string", description: "Helper text shown below (hidden if error is set)" },
                { name: "error", type: "string", description: "Error message; switches label + border to harm color" },
                { name: "labelRight", type: "ReactNode", description: "Right-aligned label content (e.g., char count)" },
                { name: "size", type: '"default" | "compact"', default: '"default"', description: "Visual density" },
                { name: "disabled", type: "boolean", default: "false", description: "Disables interaction" },
                { name: "...rest", type: "InputHTMLAttributes", description: "All standard input props (value, onChange, placeholder, type, etc.)" },
              ]}
            />
          </div>
        </Section>

        {/* ── TEXTAREA ── */}
        <Section>
          <div id="textarea" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Forms</Eyebrow>
            <H2>Textarea</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Multi-line text input. Vertically resizable by default. Shares
              the same label, hint, and error patterns as TextInput.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
                <Textarea
                  label="Description"
                  placeholder="What problem does this solve?"
                  value={textareaVal}
                  onChange={(e) => setTextareaVal(e.target.value)}
                  rows={4}
                  labelRight={`${textareaVal.length} chars`}
                />
                <Textarea
                  label="Commit message"
                  hint="Start with a verb. Keep the first line under 72 chars."
                  rows={3}
                />
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "label", type: "string", description: "Label above the textarea" },
                { name: "hint", type: "string", description: "Helper text shown below" },
                { name: "error", type: "string", description: "Error message; switches state to harm color" },
                { name: "labelRight", type: "ReactNode", description: "Right-aligned label content" },
                { name: "rows", type: "number", default: "4", description: "Initial visible rows" },
                { name: "...rest", type: "TextareaHTMLAttributes", description: "All standard textarea props" },
              ]}
            />
          </div>
        </Section>

        {/* ── SELECT ── */}
        <Section>
          <div id="select" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Forms</Eyebrow>
            <H2>Select</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Native select dropdown styled to match the input family.
              Chevron indicator on the right. Custom options render using
              native browser styling inside the dropdown list.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 360 }}>
                <Select
                  label="Priority"
                  value={selectVal}
                  onChange={setSelectVal}
                  options={[
                    { value: "critical", label: "Critical" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                />
                <Select
                  label="Assignee"
                  placeholder="Unassigned"
                  value=""
                  onChange={() => {}}
                  options={[
                    { value: "ahmed", label: "Ahmed Baky" },
                    { value: "kenza", label: "Kenza Mrini" },
                  ]}
                  hint="Leave empty to mark as unassigned."
                />
              </div>
            </PreviewBox>

            <H3 style={{ marginTop: 24 }}>Compact variant</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Denser variant for toolbars and inline filters. Matches the
              compact TextInput density.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Select
                  size="compact"
                  value={selectVal}
                  onChange={setSelectVal}
                  options={[
                    { value: "critical", label: "Critical" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                  style={{ minWidth: 140 }}
                />
                <Select
                  size="compact"
                  label="Sort"
                  value="recent"
                  onChange={() => {}}
                  options={[
                    { value: "recent", label: "Most recent" },
                    { value: "oldest", label: "Oldest" },
                    { value: "priority", label: "By priority" },
                  ]}
                  style={{ minWidth: 160 }}
                />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Label above the select" },
                { name: "options", type: "{ value: string; label: string }[]", description: "Available options" },
                { name: "value", type: "string", description: "Current value" },
                { name: "onChange", type: "(value: string) => void", description: "Change callback" },
                { name: "placeholder", type: "string", description: "Shown when value is empty" },
                { name: "hint", type: "string", description: "Helper text" },
                { name: "error", type: "string", description: "Error message" },
                { name: "size", type: '"default" | "compact"', default: '"default"', description: "Visual density" },
                { name: "disabled", type: "boolean", default: "false", description: "Disables interaction" },
              ]}
            />
          </div>
        </Section>

        {/* ── FILTER PILLS ── */}
        <Section>
          <div id="filter-pills" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Controls</Eyebrow>
            <H2>Filter Pills</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Toggle button strip for categorical filtering. Ink-on-paper when
              active, subtle tint on hover, smooth 120ms transitions.
            </Body>

            <PreviewBox>
              <FilterPills
                options={Object.keys(categoryColors)}
                value={filterVal}
                onChange={setFilterVal}
              />
              <div style={{ marginTop: 12 }}>
                <Caption>
                  Selected: {filterVal ?? "All"}
                </Caption>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "options", type: "string[]", description: "Array of filter option labels" },
                { name: "value", type: "string | null", description: "Currently selected value, null = all" },
                { name: "onChange", type: "(v: string | null) => void", description: "Selection callback" },
                { name: "allLabel", type: "string", default: '"All"', description: "Label for the all-clear button" },
              ]}
            />

            <CodeBlock>{`<FilterPills
  options={["Cognitive", "Emotional", "Social"]}
  value={filter}
  onChange={setFilter}
/>`}</CodeBlock>
          </div>
        </Section>

        {/* ── SORT CONTROLS ── */}
        <Section>
          <div id="sort-controls" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Controls</Eyebrow>
            <H2>Sort Controls</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Underline-active text buttons for sort mode switching. Minimal
              footprint, monocase labels.
            </Body>

            <PreviewBox>
              <SortControls
                options={[
                  { key: "cat", label: "Category" },
                  { key: "net", label: "Net effect" },
                  { key: "prev", label: "Prevalence" },
                ]}
                value={sortVal}
                onChange={setSortVal}
              />
              <div style={{ marginTop: 12 }}>
                <Caption>Active: {sortVal}</Caption>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "options", type: "{ key: string; label: string }[]", description: "Sort option definitions" },
                { name: "value", type: "string", description: "Currently active sort key" },
                { name: "onChange", type: "(key: string) => void", description: "Sort change callback" },
              ]}
            />

            <CodeBlock>{`<SortControls
  options={[
    { key: "cat", label: "Category" },
    { key: "net", label: "Net effect" },
  ]}
  value={sortKey}
  onChange={setSortKey}
/>`}</CodeBlock>
          </div>
        </Section>

        {/* ── TABS ── */}
        <Section>
          <div id="tabs" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Controls</Eyebrow>
            <H2>Tabs</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Five tab variants for different layouts and densities. All five
              share the same keyboard semantics and aria-role patterns. Pick
              based on visual weight and context.
            </Body>

            {/* ── 1. Tabs (underline) ── */}
            <H3 style={{ marginTop: 16 }}>1. Tabs — underline</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              The default tab. Underline marks active, shares a baseline rule
              with the content below. Use for primary panel switching.
            </Body>
            <PreviewBox>
              <Tabs
                options={[
                  { key: "overview", label: "Overview" },
                  { key: "activity", label: "Activity" },
                  { key: "settings", label: "Settings" },
                ]}
                value={tabVal}
                onChange={setTabVal}
              />
              <div style={{ marginTop: 16 }}>
                <Caption>Active: {tabVal}</Caption>
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "options", type: "{ key: string; label: string }[]", description: "Tab definitions" },
                { name: "value", type: "string", description: "Active tab key" },
                { name: "onChange", type: "(key: string) => void", description: "Selection callback" },
                { name: "fullWidth", type: "boolean", default: "false", description: "Distribute tabs equally" },
              ]}
            />

            {/* ── 2. Segmented Control ── */}
            <H3 style={{ marginTop: 36 }}>2. Segmented Control</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Grouped pill switcher with filled active segment. Higher visual
              weight than underline tabs. Use for 2-3 mutually-exclusive
              options in toolbar contexts.
            </Body>
            <PreviewBox>
              <SegmentedControl
                options={[
                  { key: "day", label: "Day" },
                  { key: "week", label: "Week" },
                  { key: "month", label: "Month" },
                ]}
                value={segVal}
                onChange={setSegVal}
              />
              <div style={{ marginTop: 16 }}>
                <Caption>Active: {segVal}</Caption>
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "options", type: "{ key: string; label: string }[]", description: "Segment definitions" },
                { name: "value", type: "string", description: "Active segment key" },
                { name: "onChange", type: "(key: string) => void", description: "Selection callback" },
              ]}
            />

            {/* ── 3. Text Tabs ── */}
            <H3 style={{ marginTop: 36 }}>3. Text Tabs — minimal</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Ultra-minimal. No container, no underlines. Active state is
              color + weight only. Use inside tight headers or dense
              toolbars where visual noise must be zero.
            </Body>
            <PreviewBox>
              <TextTabs
                options={[
                  { key: "all", label: "All" },
                  { key: "open", label: "Open" },
                  { key: "closed", label: "Closed" },
                  { key: "archived", label: "Archived" },
                ]}
                value={textTabVal}
                onChange={setTextTabVal}
              />
              <div style={{ marginTop: 16 }}>
                <Caption>Active: {textTabVal}</Caption>
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "options", type: "{ key: string; label: string }[]", description: "Tab definitions" },
                { name: "value", type: "string", description: "Active tab key" },
                { name: "onChange", type: "(key: string) => void", description: "Selection callback" },
              ]}
            />

            {/* ── 4. Icon Tabs ── */}
            <H3 style={{ marginTop: 36 }}>4. Icon Tabs</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Square icon-only buttons in a grouped container. Use for
              view-mode switchers (grid/list), or vertical toolbars where
              icons convey meaning without labels.
            </Body>
            <PreviewBox>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <IconTabs
                  options={[
                    { key: "grid", label: "Grid view", icon: <LayoutGrid size={14} strokeWidth={1.5} /> },
                    { key: "list", label: "List view", icon: <List size={14} strokeWidth={1.5} /> },
                    { key: "rows", label: "Row view", icon: <Rows3 size={14} strokeWidth={1.5} /> },
                    { key: "columns", label: "Column view", icon: <Columns3 size={14} strokeWidth={1.5} /> },
                  ]}
                  value={iconTabVal}
                  onChange={setIconTabVal}
                />
                <IconTabs
                  orientation="vertical"
                  options={[
                    { key: "grid", label: "Grid view", icon: <LayoutGrid size={14} strokeWidth={1.5} /> },
                    { key: "list", label: "List view", icon: <List size={14} strokeWidth={1.5} /> },
                    { key: "rows", label: "Row view", icon: <Rows3 size={14} strokeWidth={1.5} /> },
                  ]}
                  value={iconTabVal}
                  onChange={setIconTabVal}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <Caption>Active: {iconTabVal}</Caption>
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "options", type: "{ key: string; icon: ReactNode; label: string }[]", description: "Options with icon + aria-label" },
                { name: "value", type: "string", description: "Active tab key" },
                { name: "onChange", type: "(key: string) => void", description: "Selection callback" },
                { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Layout direction" },
              ]}
            />

            {/* ── 5. Tabs with Count ── */}
            <H3 style={{ marginTop: 36 }}>5. Tabs with Count</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Underline tabs with numeric badges. Use for inbox-style views
              where each tab represents a categorized list. Count sits in a
              pill and becomes darker on the active tab.
            </Body>
            <PreviewBox>
              <TabsWithCount
                options={[
                  { key: "inbox", label: "Inbox", count: 12 },
                  { key: "drafts", label: "Drafts", count: 3 },
                  { key: "sent", label: "Sent", count: 48 },
                  { key: "archive", label: "Archive", count: 284 },
                ]}
                value={countTabVal}
                onChange={setCountTabVal}
              />
              <div style={{ marginTop: 16 }}>
                <Caption>Active: {countTabVal}</Caption>
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "options", type: "{ key: string; label: string; count: number }[]", description: "Tabs with counts" },
                { name: "value", type: "string", description: "Active tab key" },
                { name: "onChange", type: "(key: string) => void", description: "Selection callback" },
              ]}
            />

            {/* ── When to use which ── */}
            <H3 style={{ marginTop: 48 }}>When to use which</H3>
            <div style={{ marginTop: 16 }}>
              <PropTable
                props={[
                  { name: "Tabs", type: "underline", description: "Primary panel switching — docs, settings, detail views" },
                  { name: "SegmentedControl", type: "grouped pill", description: "Time ranges, binary/ternary toggles, toolbar filters" },
                  { name: "TextTabs", type: "minimal text", description: "Dense headers, secondary filters, subsection switching" },
                  { name: "IconTabs", type: "icon group", description: "View-mode switchers, vertical rails, dense toolbars" },
                  { name: "TabsWithCount", type: "underline + badge", description: "Inbox, ticket lists, categorized collections" },
                ]}
              />
            </div>
          </div>
        </Section>

        {/* ── CARD ── */}
        <Section>
          <div id="card" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Atoms</Eyebrow>
            <H2>Card</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Bordered container with four semantic schemes. In NaRa, meaning
              is encoded through border stroke, not hue. The foundational atom
              for TensionGrid, ReframeCards, and any grouped content.
            </Body>

            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="neutral">
                  <Label>Neutral — 1px solid rule</Label>
                  <div style={{ color: colors.textMuted }}>
                    Baseline container. Softest possible frame.
                  </div>
                </Card>
                <Card scheme="harm">
                  <Label color={colors.ink}>The Problem — 2px solid</Label>
                  <div style={{ color: colors.textMuted }}>
                    Thick stroke for friction and emphasis.
                  </div>
                </Card>
                <Card scheme="help">
                  <Label color={colors.ink}>The Reframe — 3px double</Label>
                  <div style={{ color: colors.textMuted }}>
                    Layered stroke for synthesis and closure.
                  </div>
                </Card>
                <Card scheme="muted">
                  <Label color={colors.ink}>The Approach — dashed</Label>
                  <div style={{ color: colors.textMuted }}>
                    Tentative frame for exploration and drafts.
                  </div>
                </Card>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "scheme", type: '"neutral" | "harm" | "help" | "muted"', default: '"neutral"', description: "Color scheme" },
                { name: "children", type: "ReactNode", description: "Card content" },
              ]}
            />
          </div>
        </Section>

        {/* ── COLLAPSIBLE ── */}
        <Section>
          <div id="collapsible" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Layout</Eyebrow>
            <H2>Collapsible</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Disclosure panel with eyebrow title, chevron indicator, and
              optional count badge. For sidebars, settings panels, accordion
              layouts. Clicking the header toggles visibility of content.
            </Body>
            <PreviewBox style={{ padding: 0 }}>
              <Collapsible title="Git Status" count={4} defaultOpen>
                <Body style={{ margin: 0 }}>
                  4 modified files ready to stage. Run{" "}
                  <Kbd>Cmd+S</Kbd> to stage all.
                </Body>
              </Collapsible>
              <Collapsible title="Commits" count={12}>
                <Body style={{ margin: 0 }}>
                  12 unpushed commits on <code>dev</code> branch.
                </Body>
              </Collapsible>
              <Collapsible title="Deploys" defaultOpen={false}>
                <Body style={{ margin: 0 }}>
                  Last deploy 2 minutes ago to production.
                </Body>
              </Collapsible>
            </PreviewBox>
            <PropTable
              props={[
                { name: "title", type: "string", description: "Section title (rendered as eyebrow)" },
                { name: "count", type: "number", description: "Optional count badge next to title" },
                { name: "defaultOpen", type: "boolean", default: "true", description: "Initial open state" },
                { name: "bordered", type: "boolean", default: "true", description: "Show border below section" },
                { name: "children", type: "ReactNode", description: "Body content (shown when open)" },
              ]}
            />
          </div>
        </Section>

        {/* ── SCROLLABLE ── */}
        <Section>
          <div id="scrollable" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Containers</Eyebrow>
            <H2>Scrollable</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Bounded scroll container with fade shadows at overflow edges.
              The shadows appear when content extends beyond the visible
              area, fading as you scroll toward each end. Uses the DS
              scrollbar styling.
            </Body>

            <H3 style={{ marginTop: 16 }}>Vertical scroll (default)</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Fade shadows on top and bottom indicate more content above
              or below. They disappear when you reach an edge.
            </Body>
            <PreviewBox>
              <Scrollable maxHeight={180} style={{ maxWidth: 420 }}>
                <div style={{ padding: spacing.md, display: "flex", flexDirection: "column", gap: spacing.sm }}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        ...typography.body,
                        color: colors.ink2,
                        padding: `${spacing.xs}px ${spacing.sm}px`,
                        border: `1px solid ${colors.rule}`,
                        borderRadius: radius.sm,
                      }}
                    >
                      Row {i + 1} — Lorem ipsum dolor sit amet.
                    </div>
                  ))}
                </div>
              </Scrollable>
            </PreviewBox>

            <H3 style={{ marginTop: 36 }}>Horizontal scroll</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              <code>axis=&quot;x&quot;</code> for horizontal scrolling. Shadows
              appear on left and right.
            </Body>
            <PreviewBox>
              <Scrollable axis="x" style={{ maxWidth: 420 }}>
                <div style={{ display: "flex", gap: spacing.sm, padding: spacing.md }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        ...typography.body,
                        color: colors.ink2,
                        padding: `${spacing.sm}px ${spacing.md}px`,
                        border: `1px solid ${colors.rule}`,
                        borderRadius: radius.sm,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Card {i + 1}
                    </div>
                  ))}
                </div>
              </Scrollable>
            </PreviewBox>

            <H3 style={{ marginTop: 36 }}>No shadows</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              <code>shadows={"{false}"}</code> disables fade shadows. Useful
              when the container already has a border or shadow.
            </Body>
            <PreviewBox>
              <Scrollable maxHeight={120} shadows={false} style={{ maxWidth: 420, border: `1px solid ${colors.rule}`, borderRadius: radius.sm }}>
                <div style={{ padding: spacing.md }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{ ...typography.body, color: colors.ink2, padding: `${spacing.xxs}px 0` }}>
                      Line {i + 1} — plain scroll inside bordered container.
                    </div>
                  ))}
                </div>
              </Scrollable>
            </PreviewBox>

            <PropTable
              props={[
                { name: "maxHeight", type: "number | string", description: "Container max height (required for vertical scroll)" },
                { name: "axis", type: '"x" | "y" | "both"', default: '"y"', description: "Scroll axis" },
                { name: "shadows", type: "boolean", default: "true", description: "Show fade shadows at overflow edges" },
                { name: "children", type: "ReactNode", description: "Scrollable content" },
              ]}
            />

            <H3 style={{ marginTop: 36 }}>Scroll to Top</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Fixed button that appears after the user scrolls past a
              threshold. Smooth-scrolls to the top on click. Already
              running on this page — scroll down to see it.
            </Body>
            <PreviewBox>
              <div style={{ ...typography.stat, color: colors.ink3 }}>
                Scroll down ~400px on this page to see the floating button
                appear bottom-right.
              </div>
            </PreviewBox>
            <PropTable
              props={[
                { name: "threshold", type: "number", default: "400", description: "Pixels scrolled before button appears" },
                { name: "target", type: '"window" | HTMLElement', default: '"window"', description: "Scroll source" },
                { name: "offset", type: "{ bottom, right }", default: "{ 24, 24 }", description: "Distance from corner" },
                { name: "label", type: "string", default: '"Back to top"', description: "Button text" },
              ]}
            />

            <H3 style={{ marginTop: 36 }}>Scrollbar styling</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              All scrollbars inside the cockpit DS scope use a warm,
              translucent thumb that matches the paper palette. Applied
              globally via <code>.ds-cockpit-scope</code> in the layout.
            </Body>
          </div>
        </Section>

        {/* ── TABLES ── */}
        <TablesShowcase />

        {/* ── CATEGORY HEADER ── */}
        <Section>
          <div id="category-header" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Data Display</Eyebrow>
            <H2>Category Header</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Section divider with a bitmap marker and uppercase label. Used to
              group data rows by category. The marker is a typographic glyph —
              NaRa does not carry category meaning through color.
            </Body>

            <PreviewBox>
              {Object.entries(categoryColors).map(([name, color], i) => (
                <CategoryHeader
                  key={name}
                  label={name}
                  color={color}
                  showBorder={i > 0}
                />
              ))}
            </PreviewBox>

            <div
              style={{
                border: `1px solid ${colors.ink}`,
                padding: 20,
                marginTop: 16,
                fontFamily: fonts.serif,
                fontSize: 16,
                lineHeight: 1.55,
                color: colors.ink,
              }}
            >
              <div
                style={{
                  ...typography.label,
                  color: colors.ink,
                  marginBottom: 8,
                }}
              >
                ON THE COLOR PROP
              </div>
              The <code>color</code> prop is retained for API compatibility but
              is visually ignored. Every category renders the same bitmap
              marker on pure ink. Hierarchy between sections comes from order
              and the border rule, not hue.
            </div>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Category name" },
                { name: "color", type: "string", description: "Legacy; ignored in NaRa (kept for API compatibility)" },
                { name: "showBorder", type: "boolean", default: "true", description: "Show top border rule" },
              ]}
            />
          </div>
        </Section>

        {/* ── DIVERGING BAR ── */}
        <Section>
          <div id="diverging-bar" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Data Display</Eyebrow>
            <H2>Diverging Bar</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Horizontal bar centered at zero. Extends left (harm) or right
              (help). Bar height and opacity encode a secondary magnitude
              dimension. Drag the sliders to explore.
            </Body>

            <PreviewBox>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
                  <label style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 8 }}>
                    VALUE
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={barValue}
                      aria-label={`Bar value: ${barValue}`}
                      onChange={(e) => setBarValue(Number(e.target.value))}
                      style={{ width: 120 }}
                    />
                    <span style={{ minWidth: 28, textAlign: "right" }}>{barValue}</span>
                  </label>
                  <label style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 8 }}>
                    MAGNITUDE
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={barMag}
                      aria-label={`Bar magnitude: ${barMag}`}
                      onChange={(e) => setBarMag(Number(e.target.value))}
                      style={{ width: 120 }}
                    />
                    <span style={{ minWidth: 28, textAlign: "right" }}>{barMag}</span>
                  </label>
                </div>
                <DivergingBar value={barValue} magnitude={barMag} />
              </div>
              <ThinRule />
              <div style={{ marginTop: 12 }}>
                <Label>RANGE OF VALUES</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <DivergingBar value={-72} magnitude={92} />
                  <DivergingBar value={-35} magnitude={60} />
                  <DivergingBar value={18} magnitude={55} />
                  <DivergingBar value={55} magnitude={88} />
                  <DivergingBar value={72} magnitude={85} />
                </div>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "value", type: "number", description: "Bar value, -100 to +100. Negative = harm, positive = help" },
                { name: "magnitude", type: "number", default: "70", description: "Secondary intensity (0-100), affects bar height and opacity" },
              ]}
            />

            <CodeBlock>{`<DivergingBar value={72} magnitude={85} />
<DivergingBar value={-55} magnitude={83} />`}</CodeBlock>
          </div>
        </Section>

        {/* ── PREVALENCE BAR ── */}
        <Section>
          <div id="prevalence-bar" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Data Display</Eyebrow>
            <H2>Prevalence Bar</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Miniature horizontal progress bar with percentage label. Opacity
              scales with value for visual weight encoding.
            </Body>

            <PreviewBox>
              <div style={{ display: "flex", gap: 24, marginBottom: 16, alignItems: "center" }}>
                <label style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 8 }}>
                  VALUE
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={prevValue}
                    aria-label={`Prevalence value: ${prevValue}%`}
                    onChange={(e) => setPrevValue(Number(e.target.value))}
                    style={{ width: 140 }}
                  />
                  <span style={{ minWidth: 32, textAlign: "right" }}>{prevValue}%</span>
                </label>
              </div>
              <div style={{ maxWidth: 160 }}>
                <PrevalenceBar value={prevValue} />
              </div>
              <ThinRule />
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, maxWidth: 160 }}>
                <PrevalenceBar value={92} />
                <PrevalenceBar value={70} />
                <PrevalenceBar value={45} />
                <PrevalenceBar value={20} />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "value", type: "number", description: "Percentage value, 0-100" },
              ]}
            />
          </div>
        </Section>

        {/* ── DATA ROW ── */}
        <Section>
          <div id="data-row" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Data Display</Eyebrow>
            <H2>Data Row</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Composite row: label + diverging bar + prevalence bar in a 3-column
              grid. Hover reveals a subtle background tint. The primary building
              block for data tables.
            </Body>

            <PreviewBox>
              <AxisHeader />
              <TickMarks />
              {SAMPLE_DATA.slice(0, 4).map((d) => (
                <DataRow
                  key={d.name}
                  label={d.name}
                  net={d.net}
                  magnitude={d.mag}
                  prevalence={d.prev}
                />
              ))}
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Row label text" },
                { name: "net", type: "number", description: "Net value, -100 to +100" },
                { name: "magnitude", type: "number", default: "70", description: "Bar magnitude (0-100)" },
                { name: "prevalence", type: "number", description: "Prevalence percentage (0-100)" },
              ]}
            />

            <CodeBlock>{`<AxisHeader />
<TickMarks />
<DataRow label="Productivity" net={72} magnitude={85} prevalence={88} />
<DataRow label="Sleep Quality" net={-50} magnitude={76} prevalence={80} />`}</CodeBlock>
          </div>
        </Section>

        {/* ── AXIS & TICKS ── */}
        <Section>
          <div id="axis-ticks" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Data Display</Eyebrow>
            <H2>Axis Header & Tick Marks</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Column header bar with harm/help directional labels and tick
              marks at 25-unit intervals. Sits above data rows to provide
              scale context.
            </Body>

            <PreviewBox>
              <AxisHeader />
              <TickMarks />
            </PreviewBox>

            <CodeBlock>{`<AxisHeader />
<TickMarks />`}</CodeBlock>
          </div>
        </Section>

        {/* ── TOOLTIP ── */}
        <Section>
          <div id="tooltip" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Overlays</Eyebrow>
            <H2>Tooltip</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Dark card with a serif title, key-value stat pairs, and an
              optional description separated by a faint rule. Used for hover
              detail on data rows.
            </Body>

            <PreviewBox
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <Tooltip
                title="Productivity & Work"
                stats={[
                  { label: "Net effect", value: "+72 / 100", color: "#000000" },
                  { label: "Prevalence", value: "88%" },
                  { label: "Impact intensity", value: "85 / 100" },
                ]}
                description="Automation of routine tasks, coding, writing, summarisation. Measurable output gains across knowledge workers."
              />
              <Tooltip
                title="Privacy & Autonomy"
                stats={[
                  { label: "Net effect", value: "-72 / 100", color: "#000000" },
                  { label: "Prevalence", value: "90%" },
                  { label: "Impact intensity", value: "92 / 100" },
                ]}
                description="Pervasive data collection, behavioural inference, and surveillance without meaningful consent or recourse."
              />
            </PreviewBox>

            <PropTable
              props={[
                { name: "title", type: "string", description: "Italic serif title" },
                { name: "stats", type: "{ label, value, color? }[]", description: "Key-value stat pairs" },
                { name: "description", type: "string", description: "Optional body text below stats" },
                { name: "visible", type: "boolean", default: "true", description: "Controls opacity for animation" },
              ]}
            />

            <CodeBlock>{`<Tooltip
  title="Productivity & Work"
  stats={[
    { label: "Net effect", value: "+72", color: "#000000" },
    { label: "Prevalence", value: "88%" },
  ]}
  description="Automation of routine tasks..."
/>`}</CodeBlock>
          </div>
        </Section>

        {/* ── COMMAND PALETTE ── */}
        <Section>
          <div id="command-palette" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Overlays</Eyebrow>
            <H2>Command Palette</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Spotlight-style modal for searching and executing commands.
              Supports grouping, icons, shortcut hints, and keyboard
              navigation (↑↓ Enter Esc). Press <Kbd>Cmd+K</Kbd> anywhere on
              this page to open it.
            </Body>

            <PreviewBox>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md, alignItems: "flex-start" }}>
                <Button variant="primary" onClick={() => setPaletteOpen(true)} leftIcon={<Plus size={12} strokeWidth={2} />}>
                  Open palette
                </Button>
                <div style={{ ...typography.stat, color: colors.ink3 }}>
                  Or press <Kbd muted>Cmd+K</Kbd> anywhere on this page.
                </div>
                {paletteLog && (
                  <div
                    style={{
                      ...typography.body,
                      color: colors.help,
                      padding: `${spacing.xs}px ${spacing.sm}px`,
                      background: colors.helpFaint,
                      border: `1px solid ${colors.helpBorder}`,
                      borderRadius: radius.sm,
                    }}
                  >
                    Last selected: <strong>{paletteLog}</strong>
                  </div>
                )}
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "open", type: "boolean", description: "Controls visibility" },
                { name: "onClose", type: "() => void", description: "Called on Esc, backdrop click, or after selection" },
                { name: "commands", type: "Command[]", description: "List of available commands" },
                { name: "placeholder", type: "string", default: '"Type a command…"', description: "Search input placeholder" },
                { name: "emptyState", type: "ReactNode", description: "Custom empty state content" },
              ]}
            />

            <H3 style={{ marginTop: 24 }}>Command type</H3>
            <CodeBlock>{`interface Command {
  id: string;
  label: string;
  group?: string;      // group header
  icon?: ReactNode;    // left-aligned icon
  shortcut?: string;   // right-aligned Kbd hint
  hint?: string;       // secondary line under label
  keywords?: string[]; // extra search terms
  onSelect: () => void;
}`}</CodeBlock>
          </div>
        </Section>

        {/* ── LEGEND ── */}
        <Section>
          <div id="legend" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Meta</Eyebrow>
            <H2>Legend</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Horizontal legend with color swatches and labels. Wraps
              naturally on narrow viewports.
            </Body>

            <PreviewBox>
              <Legend
                items={Object.entries(categoryColors).map(([label, color]) => ({
                  label,
                  color,
                }))}
              />
            </PreviewBox>

            <PropTable
              props={[
                { name: "items", type: "{ label: string; color: string }[]", description: "Legend entries" },
              ]}
            />
          </div>
        </Section>

        {/* ── META FOOTER ── */}
        <Section>
          <div id="meta-footer" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Meta</Eyebrow>
            <H2>Meta Footer</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Bottom strip with legend on the left and source attribution on the
              right, separated by a thin rule.
            </Body>

            <PreviewBox>
              <MetaFooter
                legend={
                  <Legend
                    items={[
                      { label: "Positive", glyph: "●" },
                      { label: "Negative", glyph: "○" },
                    ]}
                  />
                }
                source="Sources: APA Tech in America, Pew Research AI surveys, MIT Sloan, Common Sense Media."
              />
            </PreviewBox>
          </div>
        </Section>

        {/* ── TAGS ── */}
        <Section>
          <div id="tags" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Narrative</Eyebrow>
            <H2>Tags</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Bordered pill tags with semantic color variants: harm (red),
              amber (caution), help (green), and neutral.
            </Body>

            <PreviewBox>
              <TagRow>
                <Tag variant="harm">The Problem</Tag>
                <Tag variant="amber">The Approach</Tag>
                <Tag variant="help">The Reframe</Tag>
                <Tag variant="neutral">Neutral</Tag>
              </TagRow>
            </PreviewBox>

            <PropTable
              props={[
                { name: "variant", type: '"harm" | "amber" | "help" | "neutral"', default: '"neutral"', description: "Semantic color variant" },
                { name: "children", type: "ReactNode", description: "Tag label" },
              ]}
            />

            <CodeBlock>{`<TagRow>
  <Tag variant="harm">Problem</Tag>
  <Tag variant="amber">Approach</Tag>
  <Tag variant="help">Solution</Tag>
</TagRow>`}</CodeBlock>
          </div>
        </Section>

        {/* ── TENSION GRID ── */}
        <Section>
          <div id="tension-grid" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Narrative</Eyebrow>
            <H2>Tension Grid</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Side-by-side comparison cards with a &ldquo;vs&rdquo; divider.
              Each side has a labeled header and body text with semantic
              coloring.
            </Body>

            <PreviewBox>
              <TensionGrid
                left={{ label: "What AI does", text: "Validates. Agrees. Reassures. Tells you what you want to hear." }}
                right={{ label: "What we need", text: "Challenge. Friction. Growth. Decisions that build judgment." }}
              />
            </PreviewBox>

            <PropTable
              props={[
                { name: "left", type: "{ label: string; text: string }", description: "Left card content" },
                { name: "right", type: "{ label: string; text: string }", description: "Right card content" },
                { name: "leftVariant", type: '"harm" | "help"', default: '"harm"', description: "Left card color scheme" },
                { name: "rightVariant", type: '"harm" | "help"', default: '"help"', description: "Right card color scheme" },
              ]}
            />
          </div>
        </Section>

        {/* ── FRICTION TRACK ── */}
        <Section>
          <div id="friction-track" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Narrative</Eyebrow>
            <H2>Friction Track</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Horizontal two-segment track with a center dot marker. Visualizes
              a transition point between two states — e.g., AI response to human
              reflection with a friction point in between.
            </Body>

            <PreviewBox>
              <FrictionTrack />
            </PreviewBox>

            <PropTable
              props={[
                { name: "leftLabel", type: "string", default: '"AI response"', description: "Left segment label" },
                { name: "centerLabel", type: "string", default: '"Friction point"', description: "Center marker label" },
                { name: "rightLabel", type: "string", default: '"Human reflection"', description: "Right segment label" },
                { name: "leftColor", type: "string", description: "Left segment color" },
                { name: "rightColor", type: "string", description: "Right segment color" },
                { name: "markerColor", type: "string", description: "Center dot color" },
              ]}
            />
          </div>
        </Section>

        {/* ── REFRAME CARDS ── */}
        <Section>
          <div id="reframe-cards" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Narrative</Eyebrow>
            <H2>Reframe Cards</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Before/After comparison card pair. Left card has a muted neutral
              style, right card uses the help (green) accent to signal the
              improved framing.
            </Body>

            <PreviewBox>
              <ReframeCards
                before={{ text: "AI as oracle — ask a question, receive an answer, defer to the output." }}
                after={{ text: "AI as companion — prompts reflection, surfaces options, builds your own judgment." }}
              />
            </PreviewBox>

            <PropTable
              props={[
                { name: "before", type: "{ label?: string; text: string }", description: "Left (before) card content" },
                { name: "after", type: "{ label?: string; text: string }", description: "Right (after) card content" },
              ]}
            />
          </div>
        </Section>

        {/* ── STEPPER & CAROUSEL ── */}
        <Section>
          <div id="stepper" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Narrative</Eyebrow>
            <H2>Stepper &amp; Carousel</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              ProgressDots, SlideCarousel, SlideNumber, and NavButtons work
              together to create multi-step narrative flows with fade+slide
              transitions.
            </Body>

            <PreviewBox>
              <StepperDemo />
            </PreviewBox>

            <CodeBlock>{`const [step, setStep] = useState(0);
const labels = ["Intro", "Problem", "Solution"];

<ProgressDots
  total={3}
  current={step}
  onChange={setStep}
  labels={labels}
  colors={[colors.ink, colors.harm, colors.help]}
/>
<SlideCarousel current={step} minHeight={120}>
  <div>Slide 1 content</div>
  <div>Slide 2 content</div>
  <div>Slide 3 content</div>
</SlideCarousel>
<NavButtons
  current={step}
  total={3}
  onBack={() => setStep(s => s - 1)}
  onNext={() => setStep(s => s < 2 ? s + 1 : 0)}
/>`}</CodeBlock>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
             ARCHITECTURE — Components extracted from architecture-v5
           ═══════════════════════════════════════════════════════════════ */}

        {/* ── EXPANDABLE ROW ── */}
        <Section>
          <div id="expandable-row" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Expandable Row</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Click-to-expand row with animated chevron, label, description,
              and optional right-side content. Consolidates 4+ inline patterns
              from architecture-v5.
            </Body>

            <PreviewBox>
              <div style={{ border: `1px solid ${colors.rule}`, borderRadius: 0, overflow: "hidden" }}>
                <ExpandableRow label="INMP441" description="I2S MEMS Microphone" color="#000000" bordered>
                  <Body>Always-on MEMS microphone sampling at 16 kHz. DMA transfers PCM frames into a 64KB PSRAM ring buffer.</Body>
                  <SpecTagRow specs={[{ k: "Sample rate", v: "16 kHz" }, { k: "Format", v: "16-bit PCM" }, { k: "Buffer", v: "64KB ring" }]} style={{ marginTop: 8 }} />
                </ExpandableRow>
                <ExpandableRow label="ESP-SR VAD" description="Voice Activity Detection on Core 0" color="#000000" bordered dot>
                  <Body>Runs WakeNet on Core 0 at priority 5. Gates WiFi radio on/off to save 40-50% of total power.</Body>
                  <SpecTagRow specs={[{ k: "Engine", v: "ESP-SR WakeNet" }, { k: "Core", v: "0" }, { k: "Latency", v: "<50ms" }]} style={{ marginTop: 8 }} />
                </ExpandableRow>
                <ExpandableRow label="Opus Encode" description="16 kbps CBR compression" color="#000000" bordered={false}>
                  <Body>Real-time encoding at 16 kbps CBR. 20ms frames produce ~40 bytes each.</Body>
                </ExpandableRow>
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label", type: "string", description: "Primary label text" },
                { name: "description", type: "string", description: "Secondary text below label" },
                { name: "color", type: "string", default: "colors.ink", description: "Accent color when expanded" },
                { name: "bordered", type: "boolean", default: "true", description: "Show bottom border" },
                { name: "dot", type: "boolean", default: "false", description: "Show colored dot indicator" },
                { name: "right", type: "ReactNode", description: "Right-side content (badges, gauges)" },
                { name: "children", type: "ReactNode", description: "Expanded content" },
              ]}
            />
          </div>
        </Section>

        {/* ── EXPANDABLE LIST CARD ── */}
        <Section>
          <div id="expandable-list-card" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Expandable List Card</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Bordered card with a header and expandable item rows. Extracted from
              PowerBudgetCard, FreeRtosColumn, and VadCycleCard patterns.
            </Body>

            <PreviewBox>
              <ExpandableListCard
                title="Power Budget"
                subtitle="Per-component draw"
                color="#000000"
                hero={{ value: "180 mA", sub: "peak active" }}
                items={[
                  { label: "ESP32-S3 Core", description: "Dual-core @ 240 MHz", gauge: 42, detail: <Body>Main processor running FreeRTOS with WiFi, Opus encoding, and sensor tasks.</Body>, specs: [{ k: "Clock", v: "240 MHz" }, { k: "Draw", v: "80 mA" }] },
                  { label: "WiFi Radio", description: "802.11n transceiver", gauge: 65, detail: <Body>Largest variable consumer. VAD-gated to minimize active time.</Body>, specs: [{ k: "Active", v: "120 mA" }, { k: "Off", v: "0 mA" }] },
                  { label: "INMP441 Mic", description: "Always-on I2S MEMS", gauge: 3, dot: true, color: "#000000", detail: <Body>Ultra-low power MEMS microphone with native I2S output.</Body>, specs: [{ k: "Draw", v: "2 mA" }] },
                ]}
              />
            </PreviewBox>

            <PropTable
              props={[
                { name: "title", type: "string", description: "Card header title" },
                { name: "subtitle", type: "string", description: "Caption next to title" },
                { name: "color", type: "string", description: "Accent color for header and items" },
                { name: "hero", type: "{ value, sub }", description: "Optional hero stat below title" },
                { name: "items", type: "ExpandableListItem[]", description: "Array of expandable items" },
              ]}
            />
          </div>
        </Section>

        {/* ── MODAL ── */}
        <Section>
          <div id="modal" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Modal</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Portal-based overlay with backdrop dismiss and a composable header.
              Used by DefenseModal, SampleDataModal, CostBreakdownModal, and NodePopup.
            </Body>

            <PreviewBox>
              <ModalDemo />
            </PreviewBox>

            <PropTable
              props={[
                { name: "onClose", type: "() => void", description: "Backdrop and close button handler" },
                { name: "children", type: "ReactNode", description: "Modal panel content" },
                { name: "maxWidth", type: "number", default: "520", description: "Panel max width in px" },
                { name: "maxHeight", type: "string", description: "Panel max height (enables scroll)" },
                { name: "padding", type: "number", default: "spacing.lg", description: "Panel padding in px" },
              ]}
            />

            <H3 style={{ marginTop: 24 }}>ModalHeader</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Pre-built header with eyebrow, title, and close button.
            </Body>
            <PropTable
              props={[
                { name: "eyebrow", type: "string", description: "Small text above title" },
                { name: "title", type: "ReactNode", description: "Main title content" },
                { name: "titleSize", type: "number", default: "24", description: "Title font size" },
                { name: "onClose", type: "() => void", description: "Close button handler" },
              ]}
            />
          </div>
        </Section>

        {/* ── CHIP & NODEBOX ── */}
        <Section>
          <div id="chip-nodebox" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Chip & NodeBox</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Inline labeling and bordered containers for diagram nodes.
            </Body>

            <PreviewBox>
              <H3 style={{ marginBottom: 12 }}>Chip</H3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                <Chip>Default</Chip>
                <Chip color="#000000">Device</Chip>
                <Chip color="#000000">Cloud</Chip>
                <Chip color="#000000">App</Chip>
                <Chip color="#000000">Privacy</Chip>
                <Chip color="#000000">Audio</Chip>
              </div>

              <H3 style={{ marginBottom: 12 }}>NodeBox</H3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <NodeBox label="Supabase Auth" sublabel="JWT + RLS" color="#000000" />
                <NodeBox label="Edge Function" sublabel="ingest-audio" color="#000000" />
                <NodeBox label="Tier Store" sublabel="tier_1 .. tier_4" color="#000000" dashed />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "children (Chip)", type: "ReactNode", description: "Chip label content" },
                { name: "color", type: "string", default: "colors.ink2", description: "Chip border and text color" },
                { name: "label (NodeBox)", type: "string", description: "Node title" },
                { name: "sublabel", type: "string", description: "Caption below label" },
                { name: "dashed", type: "boolean", default: "false", description: "Use dashed border" },
              ]}
            />
          </div>
        </Section>

        {/* ── SPEC TAGS ── */}
        <Section>
          <div id="spec-tags" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Spec Tags</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Inline key-value pills and rows for technical specifications.
              Used in every expandable detail panel across the architecture.
            </Body>

            <PreviewBox>
              <H3 style={{ marginBottom: 12 }}>SpecTag & SpecTagRow</H3>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
                <SpecTag label="Bitrate" value="16 kbps" />
                <SpecTag label="Frame" value="20ms" />
                <SpecTag label="Codec" value="Opus CBR" />
              </div>

              <H3 style={{ marginBottom: 12 }}>SpecRow</H3>
              <div style={{ maxWidth: 360 }}>
                <SpecRow label="Sample Rate" value="16 kHz" />
                <SpecRow label="Bit Depth" value="16-bit signed" />
                <SpecRow label="Channels" value="1 (mono)" />
                <SpecRow label="Interface" value="I2S DMA" color="#000000" />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "label (SpecTag)", type: "string", description: "Muted key text" },
                { name: "value (SpecTag)", type: "string", description: "Bold value text" },
                { name: "specs (SpecTagRow)", type: "{ k, v }[]", description: "Array of key-value pairs" },
                { name: "label (SpecRow)", type: "string", description: "Left-aligned label" },
                { name: "value (SpecRow)", type: "string", description: "Right-aligned value" },
                { name: "color (SpecRow)", type: "string", description: "Override value color" },
              ]}
            />
          </div>
        </Section>

        {/* ── PIPELINE CARD ── */}
        <Section>
          <div id="pipeline-card" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Pipeline Card</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Vertical flow card with expandable steps connected by tiny
              directional arrows. Each step has a colored dot, flow label,
              optional timing badge, and expandable detail with spec tags.
            </Body>

            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <PipelineCard
                  title="Passive Capture"
                  description="Always-on ambient pipeline — mic to cloud in under 5s."
                  accent="#000000"
                  steps={[
                    { label: "Mic", detail: "INMP441 I2S MEMS", color: "#000000", flowLabel: "I2S DMA",
                      expanded: <Body>Always-on MEMS microphone sampling at 16 kHz. DMA transfers PCM frames directly into a 64KB PSRAM ring buffer.</Body>,
                      specs: [{ k: "Rate", v: "16 kHz" }, { k: "Format", v: "16-bit PCM" }, { k: "Buffer", v: "64KB ring" }] },
                    { label: "VAD", detail: "ESP-SR WakeNet, Core 0", color: "#000000", flowLabel: "speech flag",
                      expanded: <Body>Voice Activity Detection on Core 0 at priority 5. Gates WiFi radio on/off based on speech presence.</Body>,
                      specs: [{ k: "Engine", v: "ESP-SR" }, { k: "Latency", v: "<50ms" }] },
                    { label: "Opus Encode", detail: "16 kbps CBR", color: "#000000", flowLabel: "encoded frames",
                      expanded: <Body>Real-time Opus encoding. 20ms frames produce ~40 bytes each at constant bitrate.</Body>,
                      specs: [{ k: "Bitrate", v: "16 kbps" }, { k: "Frame", v: "20ms" }] },
                    { label: "WebSocket", detail: "TLS 1.3 to Supabase", color: "#000000",
                      expanded: <Body>Single persistent WSS connection per device with certificate pinning and 0-RTT resumption.</Body>,
                      specs: [{ k: "Protocol", v: "WSS" }, { k: "Association", v: "~300ms" }] },
                  ]}
                />
                <PipelineCard
                  title="Consultation"
                  description="User-initiated query — question to 3 glyphs + 1 word."
                  accent="#000000"
                  steps={[
                    { label: "Button Press", detail: "GPIO 2 interrupt", color: "#000000", flowLabel: "query audio", timing: "0ms" },
                    { label: "Deepgram STT", detail: "Streaming transcription", color: "#000000", flowLabel: "transcript", timing: "~800ms",
                      expanded: <Body>Nova-2 streaming model transcribes the spoken question in real-time.</Body>,
                      specs: [{ k: "Model", v: "Nova-2" }, { k: "Accuracy", v: ">95%" }] },
                    { label: "Deep Reasoner", detail: "Tier context analysis", color: "#000000", flowLabel: "analysis", timing: "~1.5s",
                      expanded: <Body>Claude Haiku analyzes the question against tier 1-4 compressed context.</Body>,
                      specs: [{ k: "Model", v: "Haiku" }, { k: "Context", v: "T1-T4" }] },
                    { label: "Glyph Picker", detail: "3 glyphs + 1 word", color: "#000000", timing: "~500ms",
                      expanded: <Body>Selects 3 glyphs from the 22-glyph inventory and one word (max 15 chars).</Body>,
                      specs: [{ k: "Glyphs", v: "3" }, { k: "Word", v: "≤15 chars" }] },
                  ]}
                />
              </div>
            </PreviewBox>

            <PropTable
              props={[
                { name: "title", type: "string", description: "Pipeline card title" },
                { name: "description", type: "string", description: "Short description below title" },
                { name: "accent", type: "string", description: "Step count color" },
                { name: "steps", type: "FlowStep[]", description: "Ordered pipeline steps" },
              ]}
            />

            <H3 style={{ marginTop: 24 }}>FlowStep</H3>
            <PropTable
              props={[
                { name: "label", type: "string", description: "Step name" },
                { name: "detail", type: "string", description: "Short description" },
                { name: "color", type: "string", description: "Dot and accent color" },
                { name: "timing", type: "string", description: "Right-aligned timing badge" },
                { name: "expanded", type: "ReactNode", description: "Expandable detail content" },
                { name: "specs", type: "{ k, v }[]", description: "Spec tags below expanded content" },
                { name: "flowLabel", type: "string", description: "Label on the flow connector arrow" },
                { name: "extra", type: "ReactNode", description: "Additional content below specs" },
              ]}
            />
          </div>
        </Section>

        {/* ── CARD PATTERNS ── */}
        <Section>
          <div id="card-patterns" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Compositions</Eyebrow>
            <H2>Card Patterns</H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              Ten recurring card compositions built from the same primitives.
              Each pairs typography, iconography, and micro-data differently
              to serve a distinct purpose. Use these as starting points, not
              rigid templates.
            </Body>

            {/* ── 1. Metric Card ── */}
            <H3 style={{ marginTop: 24 }}>1. Metric Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Single KPI with trend indicator. Display font for the number,
              mono caption for context, icon for direction. Use when one
              number carries the whole story.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Card scheme="neutral">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <Label color={colors.ink3}>DEPLOY FREQUENCY</Label>
                    <TrendingUp size={14} color={colors.help} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, lineHeight: 1, color: colors.ink }}>
                    47
                  </div>
                  <div style={{ ...typography.stat, color: colors.help, marginTop: 6 }}>
                    +12% vs last week
                  </div>
                </Card>
                <Card scheme="neutral">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <Label color={colors.ink3}>ERROR RATE</Label>
                    <TrendingDown size={14} color={colors.help} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, lineHeight: 1, color: colors.ink }}>
                    0.42<span style={{ fontSize: 18, color: colors.ink2 }}>%</span>
                  </div>
                  <div style={{ ...typography.stat, color: colors.help, marginTop: 6 }}>
                    &minus;0.08% vs last week
                  </div>
                </Card>
                <Card scheme="neutral">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <Label color={colors.ink3}>P95 LATENCY</Label>
                    <TrendingUp size={14} color={colors.harm} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, lineHeight: 1, color: colors.ink }}>
                    284<span style={{ fontSize: 18, color: colors.ink2 }}>ms</span>
                  </div>
                  <div style={{ ...typography.stat, color: colors.harm, marginTop: 6 }}>
                    +32ms vs last week
                  </div>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 2. Icon Feature Card ── */}
            <H3 style={{ marginTop: 36 }}>2. Icon Feature Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Icon bound to a title and supporting copy. The icon anchors the
              eye; the H3 carries the promise; Body explains. Best for
              feature grids and capability overviews.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="neutral">
                  <div style={{ width: 28, height: 28, borderRadius: radius.sm, background: colors.inkSubtle, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Zap size={14} color={colors.ink} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                    Instant Feedback
                  </div>
                  <Body style={{ margin: 0 }}>
                    See AI output the moment it streams. No waiting, no reload.
                  </Body>
                </Card>
                <Card scheme="neutral">
                  <div style={{ width: 28, height: 28, borderRadius: radius.sm, background: colors.inkSubtle, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <GitBranch size={14} color={colors.ink} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                    Worktree Isolation
                  </div>
                  <Body style={{ margin: 0 }}>
                    Each agent runs in its own git branch. No stepping on toes.
                  </Body>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 3. Progress Card ── */}
            <H3 style={{ marginTop: 36 }}>3. Progress Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Label + value pair with a prevalence bar underneath. Use when
              the number needs visual scale. Bar position matters: under the
              value reads as completion, beside it reads as comparison.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="neutral">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <Label color={colors.ink3}>TEST COVERAGE</Label>
                    <span style={{ ...typography.stat, color: colors.ink }}>82%</span>
                  </div>
                  <PrevalenceBar value={82} />
                  <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                    Target: 80%
                  </div>
                </Card>
                <Card scheme="neutral">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <Label color={colors.ink3}>STORAGE USED</Label>
                    <span style={{ ...typography.stat, color: colors.ink }}>34 / 50 GB</span>
                  </div>
                  <PrevalenceBar value={68} />
                  <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                    16 GB remaining
                  </div>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 4. Status Card ── */}
            <H3 style={{ marginTop: 36 }}>4. Status Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Colored icon + status label + contextual metadata. Semantic
              color scheme tints the whole card. Use for alerts, build
              status, health checks.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Card scheme="help">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <CheckCircle2 size={14} color={colors.help} strokeWidth={1.5} />
                    <Label color={colors.help}>PASSING</Label>
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.ink, marginBottom: 4 }}>
                    Build #284
                  </div>
                  <div style={{ ...typography.stat, color: colors.ink3 }}>
                    2m 14s &middot; 4 min ago
                  </div>
                </Card>
                <Card scheme="harm">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <AlertTriangle size={14} color={colors.harm} strokeWidth={1.5} />
                    <Label color={colors.harm}>FAILED</Label>
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.ink, marginBottom: 4 }}>
                    Migration rollback
                  </div>
                  <div style={{ ...typography.stat, color: colors.ink3 }}>
                    Schema conflict &middot; 12 min ago
                  </div>
                </Card>
                <Card scheme="neutral">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Clock size={14} color={colors.amber} strokeWidth={1.5} />
                    <Label color={colors.amber}>QUEUED</Label>
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.ink, marginBottom: 4 }}>
                    Deploy to staging
                  </div>
                  <div style={{ ...typography.stat, color: colors.ink3 }}>
                    Waiting for tests
                  </div>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 5. Avatar Identity Card ── */}
            <H3 style={{ marginTop: 36 }}>5. Avatar Identity Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Initials circle + name + role. The avatar acts as a visual
              anchor for a person or entity. Name uses serif for warmth,
              role uses mono for structure.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="neutral">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: colors.bg, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>
                      AB
                    </div>
                    <div>
                      <div style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.ink, lineHeight: 1.2 }}>
                        Ahmed Baky
                      </div>
                      <div style={{ ...typography.stat, color: colors.ink3, marginTop: 2 }}>
                        DESIGN ENGINEER
                      </div>
                    </div>
                  </div>
                </Card>
                <Card scheme="neutral">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: colors.bg, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>
                      KM
                    </div>
                    <div>
                      <div style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.ink, lineHeight: 1.2 }}>
                        Kenza Mrini
                      </div>
                      <div style={{ ...typography.stat, color: colors.ink3, marginTop: 2 }}>
                        RESEARCH LEAD
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 6. Changelog Card ── */}
            <H3 style={{ marginTop: 36 }}>6. Changelog Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Tag + title + body + timestamp. The tag classifies, the title
              announces, the body explains, the timestamp orders. Use for
              feeds, activity streams, release notes.
            </Body>
            <PreviewBox>
              <Card scheme="neutral" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ ...typography.stat, color: colors.help, background: colors.helpFaint, padding: "5px 6px 4px", borderRadius: radius.sm, border: `1px solid ${colors.helpBorder}`, lineHeight: 1, display: "inline-block" }}>
                    FEATURE
                  </span>
                  <span style={{ ...typography.stat, color: colors.ink3 }}>2 hours ago</span>
                </div>
                <div style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                  Cockpit design system
                </div>
                <Body style={{ margin: 0 }}>
                  Forked from editorial. Uses PP Mondwest for body copy at
                  mid-size where the pixel mono feels too dense.
                </Body>
              </Card>
              <Card scheme="neutral" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ ...typography.stat, color: colors.harm, background: colors.harmFaint, padding: "5px 6px 4px", borderRadius: radius.sm, border: `1px solid ${colors.harmBorder}`, lineHeight: 1, display: "inline-block" }}>
                    FIX
                  </span>
                  <span style={{ ...typography.stat, color: colors.ink3 }}>yesterday</span>
                </div>
                <div style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                  Madei deck import paths
                </div>
                <Body style={{ margin: 0 }}>
                  Updated four files to point to editorial subdirectory
                  after design-system restructure.
                </Body>
              </Card>
            </PreviewBox>

            {/* ── 7. Trend Sparkline Card ── */}
            <H3 style={{ marginTop: 36 }}>7. Trend Card (with sparkline)</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Value + delta + inline chart. The sparkline gives shape to a
              number without demanding a full chart. Keep it small and
              unlabeled — the number carries the meaning.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="neutral">
                  <Label color={colors.ink3}>WEEKLY ACTIVE</Label>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
                    <div>
                      <div style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, lineHeight: 1, color: colors.ink }}>
                        1,284
                      </div>
                      <div style={{ ...typography.stat, color: colors.help, marginTop: 4 }}>
                        +18% &uarr;
                      </div>
                    </div>
                    <svg width="80" height="32" viewBox="0 0 80 32">
                      <polyline
                        fill="none"
                        stroke={colors.help}
                        strokeWidth="1.5"
                        points="0,24 10,22 20,25 30,18 40,20 50,12 60,14 70,8 80,4"
                      />
                    </svg>
                  </div>
                </Card>
                <Card scheme="neutral">
                  <Label color={colors.ink3}>REQUESTS / MIN</Label>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
                    <div>
                      <div style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, lineHeight: 1, color: colors.ink }}>
                        428
                      </div>
                      <div style={{ ...typography.stat, color: colors.harm, marginTop: 4 }}>
                        &minus;6% &darr;
                      </div>
                    </div>
                    <svg width="80" height="32" viewBox="0 0 80 32">
                      <polyline
                        fill="none"
                        stroke={colors.harm}
                        strokeWidth="1.5"
                        points="0,8 10,12 20,10 30,14 40,18 50,16 60,22 70,20 80,26"
                      />
                    </svg>
                  </div>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 8. Action Card ── */}
            <H3 style={{ marginTop: 36 }}>8. Action Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Title + description + CTA link. The arrow signals interactivity;
              the whole card is clickable. Use for navigation to deeper
              content or adjacent tools.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="neutral" style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 400, color: colors.ink }}>
                      Explore the backlog
                    </div>
                    <ArrowUpRight size={14} color={colors.ink2} strokeWidth={1.5} />
                  </div>
                  <Body style={{ margin: 0 }}>
                    42 open tickets across features and bugs. Review, prioritize,
                    or draft new ones.
                  </Body>
                </Card>
                <Card scheme="neutral" style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 400, color: colors.ink }}>
                      Open Cockpit v2
                    </div>
                    <ArrowUpRight size={14} color={colors.ink2} strokeWidth={1.5} />
                  </div>
                  <Body style={{ margin: 0 }}>
                    Kanban view with live agent progress and git diff overlays.
                  </Body>
                </Card>
              </div>
            </PreviewBox>

            {/* ── 9. Stat Grid Card ── */}
            <H3 style={{ marginTop: 36 }}>9. Stat Grid Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Multiple related stats inside one card. Divider separates
              them; labels on top, values below. Use when stats share a
              domain and belong together visually.
            </Body>
            <PreviewBox>
              <Card scheme="neutral">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <Activity size={14} color={colors.ink} strokeWidth={1.5} />
                  <Label>THIS SPRINT</Label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
                  {[
                    { label: "SHIPPED", value: "12", color: colors.help },
                    { label: "IN PROGRESS", value: "4", color: colors.ink },
                    { label: "BLOCKED", value: "1", color: colors.harm },
                    { label: "BACKLOG", value: "28", color: colors.ink3 },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "0 16px",
                        borderLeft: i > 0 ? `1px solid ${colors.rule}` : "none",
                      }}
                    >
                      <div style={{ ...typography.stat, color: colors.ink3, marginBottom: 6 }}>
                        {stat.label}
                      </div>
                      <div style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 400, lineHeight: 1, color: stat.color }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </PreviewBox>

            {/* ── 10. Empty State Card ── */}
            <H3 style={{ marginTop: 36 }}>10. Empty State Card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Centered icon + headline + hint. Used when a list is empty,
              a search returns nothing, or a feature awaits first use.
              Keep the tone helpful, not apologetic.
            </Body>
            <PreviewBox>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card scheme="muted">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 0" }}>
                    <Package size={20} color={colors.ink3} strokeWidth={1.5} style={{ marginBottom: 10 }} />
                    <div style={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                      No shipped tickets yet
                    </div>
                    <div style={{ ...typography.stat, color: colors.ink3 }}>
                      Mark one as shipped to see it here.
                    </div>
                  </div>
                </Card>
                <Card scheme="muted">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 0" }}>
                    <FileText size={20} color={colors.ink3} strokeWidth={1.5} style={{ marginBottom: 10 }} />
                    <div style={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                      No documents attached
                    </div>
                    <div style={{ ...typography.stat, color: colors.ink3 }}>
                      Drop files or paste a link to add one.
                    </div>
                  </div>
                </Card>
              </div>
            </PreviewBox>
          </div>
        </Section>

        {/* ── CARD GUIDELINES (DO'S & DON'TS) ── */}
        <Section>
          <div id="card-guidelines" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Guidelines</Eyebrow>
            <H2>Card Do&apos;s &amp; Don&apos;ts</H2>
            <Body style={{ marginBottom: 24, maxWidth: 480 }}>
              Cards fail in predictable ways: too many fonts, competing
              hierarchies, crammed content, ambiguous actions. Below are
              the recurring pitfalls and their corrections, shown side by
              side.
            </Body>

            {/* ── Rule 1: Hierarchy ── */}
            <H3 style={{ marginTop: 16 }}>1. One dominant element per card</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Decide what the eye should land on first. A card with three
              equally-loud elements has no entry point.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ ...typography.stat, color: colors.help, marginBottom: 6, letterSpacing: "0.1em" }}>&#10003; DO</div>
                <Card scheme="neutral">
                  <Label color={colors.ink3}>CONVERSION RATE</Label>
                  <div style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, lineHeight: 1, color: colors.ink, marginTop: 8 }}>
                    12.4%
                  </div>
                  <div style={{ ...typography.stat, color: colors.ink3, marginTop: 6 }}>
                    Up from 10.1% last month
                  </div>
                </Card>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                  The number is the hero. Everything else supports it.
                </div>
              </div>
              <div>
                <div style={{ ...typography.stat, color: colors.harm, marginBottom: 6, letterSpacing: "0.1em" }}>&#10007; DON&apos;T</div>
                <Card scheme="neutral">
                  <div style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 400, color: colors.ink }}>
                    Conversion Rate
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 400, lineHeight: 1, color: colors.ink, marginTop: 6 }}>
                    12.4%
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.ink, marginTop: 6 }}>
                    Up from 10.1% last month
                  </div>
                </Card>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                  Three elements fight for attention. Eye has no anchor.
                </div>
              </div>
            </div>

            {/* ── Rule 2: Typography mixing ── */}
            <H3 style={{ marginTop: 36 }}>2. Pair typefaces with intent</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Serif for human language, sans for body prose, mono for data
              and structure. Mixing all three is fine; mixing them
              randomly is not.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ ...typography.stat, color: colors.help, marginBottom: 6, letterSpacing: "0.1em" }}>&#10003; DO</div>
                <Card scheme="neutral">
                  <Label color={colors.ink3}>P95 LATENCY</Label>
                  <div style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, color: colors.ink, marginTop: 6 }}>
                    284ms
                  </div>
                  <Body style={{ margin: "6px 0 0" }}>
                    Spiking on checkout endpoints since deploy at 14:02.
                  </Body>
                </Card>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                  Mono = category. Serif = value. Sans = explanation.
                </div>
              </div>
              <div>
                <div style={{ ...typography.stat, color: colors.harm, marginBottom: 6, letterSpacing: "0.1em" }}>&#10007; DON&apos;T</div>
                <Card scheme="neutral">
                  <div style={{ fontFamily: fonts.serif, fontSize: 11, letterSpacing: "0.2em", color: colors.ink3, textTransform: "uppercase" }}>
                    P95 Latency
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 28, fontWeight: 400, color: colors.ink, marginTop: 6 }}>
                    284ms
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.ink2, marginTop: 6 }}>
                    Spiking on checkout endpoints since deploy at 14:02.
                  </div>
                </Card>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                  Fonts scrambled. Italic serif body feels overwrought.
                </div>
              </div>
            </div>

            {/* ── Rule 3: Whitespace ── */}
            <H3 style={{ marginTop: 36 }}>3. Let content breathe</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Padding is not negotiable. Cramming content to save space
              makes every card harder to scan and read.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ ...typography.stat, color: colors.help, marginBottom: 6, letterSpacing: "0.1em" }}>&#10003; DO</div>
                <Card scheme="neutral">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Users size={14} color={colors.ink} strokeWidth={1.5} />
                    <Label color={colors.ink3}>ACTIVE USERS</Label>
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, color: colors.ink }}>
                    2,847
                  </div>
                  <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                    Past 7 days
                  </div>
                </Card>
              </div>
              <div>
                <div style={{ ...typography.stat, color: colors.harm, marginBottom: 6, letterSpacing: "0.1em" }}>&#10007; DON&apos;T</div>
                <Card scheme="neutral" style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <Users size={14} color={colors.ink} strokeWidth={1.5} />
                    <Label color={colors.ink3}>ACTIVE USERS</Label>
                  </div>
                  <div style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, color: colors.ink }}>
                    2,847
                  </div>
                  <div style={{ ...typography.stat, color: colors.ink3, marginTop: 2 }}>
                    Past 7 days
                  </div>
                </Card>
              </div>
            </div>

            {/* ── Rule 4: Semantic color ── */}
            <H3 style={{ marginTop: 36 }}>4. Reserve semantic color for meaning</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              Red and green carry information. Don&apos;t use them for decoration.
              If every card is tinted, nothing stands out.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ ...typography.stat, color: colors.help, marginBottom: 6, letterSpacing: "0.1em" }}>&#10003; DO</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Card scheme="neutral">
                    <Label color={colors.ink3}>DEPLOYS</Label>
                    <div style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 4 }}>47</div>
                  </Card>
                  <Card scheme="harm">
                    <Label color={colors.harm}>INCIDENTS</Label>
                    <div style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 4 }}>2</div>
                  </Card>
                </div>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                  Red only where it means trouble.
                </div>
              </div>
              <div>
                <div style={{ ...typography.stat, color: colors.harm, marginBottom: 6, letterSpacing: "0.1em" }}>&#10007; DON&apos;T</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Card scheme="help">
                    <Label color={colors.help}>DEPLOYS</Label>
                    <div style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 4 }}>47</div>
                  </Card>
                  <Card scheme="harm">
                    <Label color={colors.harm}>INCIDENTS</Label>
                    <div style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 4 }}>2</div>
                  </Card>
                </div>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: 8 }}>
                  Everything shouts. Eye learns to ignore the color system.
                </div>
              </div>
            </div>

            {/* ── Rule 5: Action clarity ── */}
            <H3 style={{ marginTop: 36 }}>5. Make clickable cards look clickable</H3>
            <Body style={{ marginBottom: 12, maxWidth: 480 }}>
              If a whole card is a link, signal it — an arrow, a hover
              state, or a directional cue. A card with no affordance is a
              wall, not a door.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ ...typography.stat, color: colors.help, marginBottom: 6, letterSpacing: "0.1em" }}>&#10003; DO</div>
                <Card scheme="neutral" style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                      Canvas playground
                    </div>
                    <ArrowUpRight size={14} color={colors.ink2} strokeWidth={1.5} />
                  </div>
                  <Body style={{ margin: 0 }}>
                    Experiment with nodes, edges, and AI operations.
                  </Body>
                </Card>
              </div>
              <div>
                <div style={{ ...typography.stat, color: colors.harm, marginBottom: 6, letterSpacing: "0.1em" }}>&#10007; DON&apos;T</div>
                <Card scheme="neutral" style={{ cursor: "pointer" }}>
                  <div style={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 400, color: colors.ink, marginBottom: 4 }}>
                    Canvas playground
                  </div>
                  <Body style={{ margin: 0 }}>
                    Experiment with nodes, edges, and AI operations.
                  </Body>
                </Card>
              </div>
            </div>

            {/* ── Summary list ── */}
            <H3 style={{ marginTop: 48 }}>Quick reference</H3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <Card scheme="help">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <CheckCircle2 size={14} color={colors.help} strokeWidth={1.5} />
                  <Label color={colors.help}>DO</Label>
                </div>
                <ul style={{ ...typography.body, margin: 0, paddingLeft: 16, color: colors.ink2 }}>
                  <li>Pick one element to dominate</li>
                  <li>Pair fonts with role, not mood</li>
                  <li>Default to generous padding</li>
                  <li>Reserve red/green for meaning</li>
                  <li>Signal clickability with an arrow or hover</li>
                  <li>Align labels and values to a shared grid</li>
                  <li>Keep content in under 4 text blocks</li>
                </ul>
              </Card>
              <Card scheme="harm">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={14} color={colors.harm} strokeWidth={1.5} />
                  <Label color={colors.harm}>DON&apos;T</Label>
                </div>
                <ul style={{ ...typography.body, margin: 0, paddingLeft: 16, color: colors.ink2 }}>
                  <li>Make every element the same weight</li>
                  <li>Mix 4+ typefaces inside one card</li>
                  <li>Shrink padding to fit more content</li>
                  <li>Tint cards for visual variety alone</li>
                  <li>Leave clickable cards without affordance</li>
                  <li>Stack raw unaligned text blocks</li>
                  <li>Repeat the same label in body copy</li>
                </ul>
              </Card>
            </div>
          </div>
        </Section>

        {/* ── FULL COMPOSITION ── */}
        <Section>
          <div id="composed" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Showcase</Eyebrow>
            <H2>
              Full <Italic>Composition</Italic>
            </H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              All components assembled into a complete interactive data
              visualization — the same output as the original reference, built
              entirely from the component library.
            </Body>

            <FullComposition />
          </div>
        </Section>

        {/* ── STORY COMPOSITION ── */}
        <Section>
          <div id="story" style={{ scrollMarginTop: 24 }}>
            <Eyebrow>Showcase</Eyebrow>
            <H2>
              Story <Italic>Composition</Italic>
            </H2>
            <Body style={{ marginBottom: 20, maxWidth: 480 }}>
              All narrative components assembled into a multi-step story flow —
              the same output as the portfolio contradiction reference, built
              entirely from the component library.
            </Body>

            <StoryComposition />
          </div>
        </Section>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={DEMO_COMMANDS.map((c) => ({
          ...c,
          onSelect: () => setPaletteLog(c.label),
        }))}
      />

      <ScrollToTop />
    </div>
  );
}

/* ─── Demo commands for palette showcase ────────────────────────────────── */
const DEMO_COMMANDS: Omit<Command, "onSelect">[] = [
  { id: "new-session", label: "New session", group: "Create", icon: <Plus size={14} strokeWidth={1.5} />, shortcut: "Cmd+N", keywords: ["start", "begin"] },
  { id: "new-ticket", label: "New ticket", group: "Create", icon: <FileText size={14} strokeWidth={1.5} />, shortcut: "Cmd+T" },
  { id: "new-widget", label: "New widget", group: "Create", icon: <LayoutGrid size={14} strokeWidth={1.5} /> },
  { id: "goto-canvas", label: "Go to canvas", group: "Navigate", icon: <ArrowUpRight size={14} strokeWidth={1.5} />, hint: "Switch to canvas view", shortcut: "G C" },
  { id: "goto-backlog", label: "Go to backlog", group: "Navigate", icon: <ArrowUpRight size={14} strokeWidth={1.5} />, shortcut: "G B" },
  { id: "goto-cockpit", label: "Go to cockpit", group: "Navigate", icon: <ArrowUpRight size={14} strokeWidth={1.5} />, shortcut: "G K" },
  { id: "deploy", label: "Deploy to production", group: "Actions", icon: <Zap size={14} strokeWidth={1.5} />, hint: "Push master branch and deploy", keywords: ["ship", "release"] },
  { id: "rollback", label: "Rollback deploy", group: "Actions", icon: <Clock size={14} strokeWidth={1.5} />, hint: "Revert to previous deployment" },
  { id: "clear-cache", label: "Clear cache", group: "Actions", icon: <Trash2 size={14} strokeWidth={1.5} /> },
  { id: "toggle-theme", label: "Toggle theme", group: "Settings", icon: <Settings size={14} strokeWidth={1.5} />, keywords: ["dark", "light", "mode"] },
  { id: "settings", label: "Open settings", group: "Settings", icon: <Settings size={14} strokeWidth={1.5} />, shortcut: "Cmd+," },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FULL COMPOSITION (assembled from library components)
   ═══════════════════════════════════════════════════════════════════════════ */

function FullComposition() {
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("cat");

  const catOrder = Object.keys(categoryColors) as CategoryName[];

  let items = ALL_DATA.filter((d) => !filter || d.cat === filter);
  if (sort === "net") items = [...items].sort((a, b) => b.net - a.net);
  else if (sort === "prev") items = [...items].sort((a, b) => b.prev - a.prev);
  else
    items = [...items].sort(
      (a, b) => catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat) || b.net - a.net
    );

  const headerIndices = new Set<number>();
  if (sort === "cat") {
    let prevCat: string | null = null;
    items.forEach((d, i) => {
      if (d.cat !== prevCat) {
        headerIndices.add(i);
        prevCat = d.cat;
      }
    });
  }

  return (
    <PreviewBox style={{ padding: "32px 28px" }}>
      <Eyebrow>Personal AI Impact Survey &middot; 2024&ndash;25</Eyebrow>
      <H1 style={{ marginBottom: 12 }}>
        Where AI helps.
        <br />
        <Italic>Where it doesn&apos;t.</Italic>
      </H1>
      <Body style={{ marginBottom: 24, maxWidth: 480 }}>
        Each row is a life domain. Bars extend left toward harm, right toward
        help. The small bar on the right shows how broadly each effect is
        experienced.
      </Body>

      <div style={{ marginBottom: 22 }}>
        <FilterPills
          options={catOrder}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <SortControls
          options={[
            { key: "cat", label: "Category" },
            { key: "net", label: "Net effect" },
            { key: "prev", label: "Prevalence" },
          ]}
          value={sort}
          onChange={setSort}
        />
      </div>

      <AxisHeader />
      <TickMarks />

      {items.map((d, i) => (
        <div key={d.name}>
          {headerIndices.has(i) && (
            <CategoryHeader
              label={d.cat}
              color={categoryColors[d.cat]}
              showBorder={i > 0}
            />
          )}
          <DataRow
            label={d.name}
            net={d.net}
            magnitude={d.mag}
            prevalence={d.prev}
          />
        </div>
      ))}

      <MetaFooter
        legend={
          <Legend
            items={Object.entries(categoryColors).map(([label, color]) => ({
              label,
              color,
            }))}
          />
        }
        source="Sources: APA Tech in America &middot; Pew Research AI surveys &middot; MIT Sloan &middot; Common Sense Media &middot; WHO Digital Health."
      />
    </PreviewBox>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEPPER DEMO (inline demo for the stepper section)
   ═══════════════════════════════════════════════════════════════════════════ */

function StepperDemo() {
  const [step, setStep] = useState(0);
  const labels = ["Intro", "Problem", "Solution"];
  const dotColors = [colors.ink, colors.harm, colors.help];

  return (
    <div>
      <ProgressDots
        total={3}
        current={step}
        onChange={setStep}
        labels={labels}
        colors={dotColors}
      />
      <SlideCarousel current={step} minHeight={120}>
        <div>
          <SlideNumber>Overview</SlideNumber>
          <H3 style={{ marginBottom: 8 }}>Introduction slide</H3>
          <Body>This is the first step of the narrative flow.</Body>
        </div>
        <div>
          <SlideNumber>Chapter 01 — The Problem</SlideNumber>
          <H3 style={{ marginBottom: 8 }}>
            Something is <Italic>wrong</Italic>
          </H3>
          <Body>The second step reveals the core tension.</Body>
        </div>
        <div>
          <SlideNumber>Chapter 02 — The Solution</SlideNumber>
          <H3 style={{ marginBottom: 8 }}>
            A path <Italic>forward</Italic>
          </H3>
          <Body>The final step offers resolution.</Body>
        </div>
      </SlideCarousel>
      <NavButtons
        current={step}
        total={3}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => (s < 2 ? s + 1 : 0))}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TABLES SHOWCASE — 6 table variants
   ═══════════════════════════════════════════════════════════════════════════ */

interface Ticket {
  id: string;
  title: string;
  type: "feature" | "bug";
  priority: "critical" | "high" | "medium" | "low";
  status: string;
}

const TICKET_DATA: Ticket[] = [
  { id: "FR-042", title: "Command palette spotlight", type: "feature", priority: "high", status: "in_progress" },
  { id: "BUG-018", title: "Select dropdown clipping", type: "bug", priority: "critical", status: "open" },
  { id: "FR-039", title: "Scroll shadows on panels", type: "feature", priority: "medium", status: "shipped" },
  { id: "FR-041", title: "Design system tables", type: "feature", priority: "low", status: "proposed" },
  { id: "BUG-017", title: "Hover state persists", type: "bug", priority: "medium", status: "fixed" },
];

const TICKET_COLUMNS: Column<Ticket>[] = [
  { key: "id", header: "ID", width: 80, sortable: true },
  { key: "title", header: "Title", sortable: true },
  { key: "type", header: "Type", width: 80, sortable: true },
  { key: "priority", header: "Priority", width: 90, align: "right", sortable: true },
  { key: "status", header: "Status", width: 110, align: "right" },
];

/** Simpler column layout for CardTable — fewer columns so rows breathe. */
const TICKET_COLUMNS_CARD: Column<Ticket>[] = [
  { key: "id", header: "ID", width: "80px", sortable: true },
  { key: "title", header: "Title", width: "1fr", sortable: true },
  { key: "priority", header: "Priority", width: "100px", align: "right", sortable: true },
  { key: "status", header: "Status", width: "120px", align: "right" },
];

function TablesShowcase() {
  const commonProps = {
    columns: TICKET_COLUMNS,
    data: TICKET_DATA,
  };

  return (
    <>
      {/* ── 1. Ghost Table ── */}
      <Section>
        <div id="ghost-table" style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H2>Ghost Table</H2>
          <Body style={{ marginBottom: 20, maxWidth: 480 }}>
            No borders, no stripes. Just aligned cells with hover row
            highlight. Minimal visual weight — sits inside cards and
            sidebars without competing.
          </Body>
          <PreviewBox>
            <GhostTable {...commonProps} onRowClick={() => {}} />
          </PreviewBox>
        </div>
      </Section>

      {/* ── 2. Ruled Table ── */}
      <Section>
        <div id="ruled-table" style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H2>Ruled Table</H2>
          <Body style={{ marginBottom: 20, maxWidth: 480 }}>
            Horizontal dividers between rows, double rule under the
            header. Editorial style — best for data-dense readouts.
          </Body>
          <PreviewBox>
            <RuledTable {...commonProps} onRowClick={() => {}} defaultSort={{ key: "priority", direction: "asc" }} />
          </PreviewBox>
        </div>
      </Section>

      {/* ── 3. Bordered Table ── */}
      <Section>
        <div id="bordered-table" style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H2>Bordered Table</H2>
          <Body style={{ marginBottom: 20, maxWidth: 480 }}>
            Full grid with rules on every edge. Tinted header. Use for
            spec sheets, comparison tables, and admin screens where
            cell boundaries matter.
          </Body>
          <PreviewBox>
            <BorderedTable {...commonProps} />
          </PreviewBox>
        </div>
      </Section>

      {/* ── 4. Striped Table ── */}
      <Section>
        <div id="striped-table" style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H2>Striped Table</H2>
          <Body style={{ marginBottom: 20, maxWidth: 480 }}>
            Alternating row tint (zebra striping). Helps the eye track
            horizontally across long rows. No borders needed.
          </Body>
          <PreviewBox>
            <StripedTable {...commonProps} onRowClick={() => {}} />
          </PreviewBox>
        </div>
      </Section>

      {/* ── 5. Card Table ── */}
      <Section>
        <div id="card-table" style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H2>Card Table</H2>
          <Body style={{ marginBottom: 20, maxWidth: 480 }}>
            Each row is a bordered card with gap between rows. Looser
            rhythm, more browsable. Use for search results, item listings,
            or feed-style data.
          </Body>
          <PreviewBox>
            <CardTable columns={TICKET_COLUMNS_CARD} data={TICKET_DATA} onRowClick={() => {}} />
          </PreviewBox>
        </div>
      </Section>

      {/* ── 6. Key-Value Table ── */}
      <Section>
        <div id="key-value-table" style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H2>Key-Value Table</H2>
          <Body style={{ marginBottom: 20, maxWidth: 480 }}>
            Two-column spec sheet. Labels on the left, values on the
            right. No header row. For metadata panels, deploy details,
            and settings readouts.
          </Body>
          <PreviewBox>
            <KeyValueTable
              rows={[
                { label: "Ticket ID", value: "FR-042" },
                { label: "Status", value: "In progress" },
                { label: "Priority", value: "High" },
                { label: "Assignee", value: "Ahmed Baky" },
                { label: "Created", value: "2026-03-14" },
                { label: "Commit", value: "ae7a620" },
              ]}
              style={{ maxWidth: 420 }}
            />
          </PreviewBox>
          <PropTable
            props={[
              { name: "rows", type: "{ label, value }[]", description: "Label + value pairs" },
              { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Row density" },
              { name: "monoValues", type: "boolean", default: "false", description: "Render values in mono font" },
            ]}
          />
        </div>
      </Section>

      {/* ── Shared API ── */}
      <Section>
        <div style={{ scrollMarginTop: 24 }}>
          <Eyebrow>Tables</Eyebrow>
          <H3>Shared API</H3>
          <Body style={{ marginBottom: 12, maxWidth: 480 }}>
            GhostTable, RuledTable, BorderedTable, StripedTable, and
            CardTable share the same props. Pick the variant by visual
            weight; the API is identical.
          </Body>
          <PropTable
            props={[
              { name: "columns", type: "Column<T>[]", description: "Column definitions (key, header, align, width, render, sortable)" },
              { name: "data", type: "T[]", description: "Array of row objects" },
              { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Row density" },
              { name: "onRowClick", type: "(row, index) => void", description: "Click handler — adds hover+cursor" },
              { name: "emptyState", type: "ReactNode", description: "Content shown when data is empty" },
              { name: "rowKey", type: "(row, index) => string", description: "Row key accessor (defaults to index)" },
              { name: "defaultSort", type: "{ key, direction }", description: "Initial sort state" },
            ]}
          />
          <CodeBlock>{`const columns: Column<Ticket>[] = [
  { key: "id", header: "ID", width: 80, sortable: true },
  { key: "title", header: "Title", sortable: true },
  { key: "priority", header: "Priority", align: "right", sortable: true,
    render: (row) => <StatusBadge label={row.priority} tone="amber" /> },
];

<RuledTable columns={columns} data={tickets} onRowClick={openTicket} />`}</CodeBlock>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL DEMO — interactive demo for the Modal component
   ═══════════════════════════════════════════════════════════════════════════ */

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md, alignItems: "flex-start" }}>
        <Button variant="primary" onClick={() => setOpen(true)} leftIcon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1.5" y="2" width="9" height="8" rx="1.5" />
            <path d="M1.5 5h9" />
          </svg>
        }>
          Open modal
        </Button>
        <div style={{ ...typography.stat, color: colors.ink3 }}>
          Click the backdrop or the <Kbd muted>×</Kbd> button to dismiss.
        </div>
      </div>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <ModalHeader eyebrow="Value Defense" title="16 kHz Sample Rate" onClose={() => setOpen(false)} />
          <Body style={{ lineHeight: 1.7 }}>
            16 kHz is the native input rate for Deepgram, wav2vec2, and YAMNet — no resampling
            needed. It captures the full human voice range while using half the bandwidth of 44.1 kHz.
          </Body>
          <div style={{ marginTop: 16, display: "flex", gap: 4, flexWrap: "wrap" }}>
            <SpecTag label="Rate" value="16 kHz" />
            <SpecTag label="Depth" value="16-bit" />
            <SpecTag label="Channels" value="1 (mono)" />
          </div>
        </Modal>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORY COMPOSITION (full narrative from portfolio_contradiction_story)
   ═══════════════════════════════════════════════════════════════════════════ */

function StoryComposition() {
  const [step, setStep] = useState(0);
  const labels = ["Introduction", "The Problem", "The Approach", "The Reframe"];
  const dotColors = [colors.ink, colors.harm, colors.amber, colors.help];

  return (
    <PreviewBox style={{ padding: "32px 28px" }}>
      <Eyebrow>The Portfolio Contradiction</Eyebrow>
      <H1 style={{ marginBottom: 12 }}>
        AI causes the problem.
        <br />
        <Italic>AI is the solution.</Italic>
      </H1>
      <Body style={{ marginBottom: 24, maxWidth: 480 }}>
        A three-part argument for designing with friction. Navigate through the
        chapters below.
      </Body>

      <ProgressDots
        total={4}
        current={step}
        onChange={setStep}
        labels={labels}
        colors={dotColors}
      />

      <SlideCarousel current={step} minHeight={280}>
        {/* Slide 0 — Overview */}
        <div>
          <SlideNumber>Overview</SlideNumber>
          <H2 style={{ marginBottom: 16, maxWidth: 480 }}>
            Three chapters. <Italic>One contradiction.</Italic>
          </H2>
          <Body style={{ marginBottom: 20, maxWidth: 460 }}>
            AI is deeply integrated into the infrastructure of daily life.
            People are outsourcing personal decisions to systems that validate
            rather than challenge. The net negative comes from over-reliance —
            so we add friction to the experience.
          </Body>
          <TagRow>
            <Tag variant="harm">The Problem</Tag>
            <Tag variant="amber">The Approach</Tag>
            <Tag variant="help">The Reframe</Tag>
          </TagRow>
        </div>

        {/* Slide 1 — The Problem */}
        <div>
          <SlideNumber>Chapter 01 — The Problem</SlideNumber>
          <H2 style={{ marginBottom: 16, maxWidth: 480 }}>
            Sycophantic systems that <Italic>validate</Italic>, not challenge.
          </H2>
          <Body style={{ marginBottom: 20, maxWidth: 460 }}>
            AI is deeply integrated into our infrastructure. People are
            outsourcing personal decisions to chatbots that validate rather than
            challenge — quietly eroding agency and intuition over time.
          </Body>
          <TensionGrid
            left={{
              label: "What AI does",
              text: "Validates. Agrees. Reassures. Tells you what you want to hear.",
            }}
            right={{
              label: "What we need",
              text: "Challenge. Friction. Growth. Decisions that build judgment.",
            }}
          />
        </div>

        {/* Slide 2 — The Approach */}
        <div>
          <SlideNumber>Chapter 02 — The Approach</SlideNumber>
          <H2 style={{ marginBottom: 16, maxWidth: 480 }}>
            We can&apos;t remove AI. So we{" "}
            <Italic>control the relationship.</Italic>
          </H2>
          <Body style={{ marginBottom: 20, maxWidth: 460 }}>
            A portfolio solution: the net negative comes from over-reliance, not
            from AI itself. We introduce deliberate friction between the AI
            response and the human decision — creating space for reflection.
          </Body>
          <FrictionTrack />
        </div>

        {/* Slide 3 — The Reframe */}
        <div>
          <SlideNumber>Chapter 03 — The Reframe</SlideNumber>
          <H2 style={{ marginBottom: 16, maxWidth: 480 }}>
            AI as a <Italic>guide,</Italic> not an answer.
          </H2>
          <Body style={{ marginBottom: 20, maxWidth: 460 }}>
            Reframe AI companionship entirely. Encourage people to tap into
            their own efforts and intuition — with AI as a scaffold for
            thinking, not a crutch that replaces it.
          </Body>
          <ReframeCards
            before={{
              text: "AI as oracle — ask a question, receive an answer, defer to the output.",
            }}
            after={{
              text: "AI as companion — prompts reflection, surfaces options, builds your own judgment.",
            }}
          />
        </div>
      </SlideCarousel>

      <NavButtons
        current={step}
        total={4}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => (s < 3 ? s + 1 : 0))}
      />
    </PreviewBox>
  );
}
