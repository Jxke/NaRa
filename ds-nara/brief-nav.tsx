"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, fonts, weights, spacing, borders, typography } from "./tokens";
import { Caption, Kbd, Swatch, CommandPalette, type Command } from "./components";
import { mod } from "./brief-tokens";

const NAV_ITEMS = [
  { href: "/brief/philosophy", label: "Philosophy", color: mod.privacy },
  { href: "/architecture-v5", label: "Architecture", color: mod.audio },
  { href: "/tiers", label: "Tiers", color: mod.compress },
  { href: "/brand", label: "Brand", color: mod.glyph },
] as const;

const ALL_COMMANDS: Command[] = [
  { id: "nav-home", label: "Home", group: "Pages", onSelect: () => {}, keywords: ["home", "intro", "landing"] },
  { id: "nav-philosophy", label: "Philosophy — Restraint AI & Friction Design", group: "Pages", onSelect: () => {}, keywords: ["philosophy", "friction", "restraint", "cognitive"] },
  { id: "nav-architecture", label: "Architecture — System Diagram & Tech Deep-Dive", group: "Pages", onSelect: () => {}, keywords: ["architecture", "diagram", "tech", "hardware"] },
  { id: "nav-sensing", label: "Sensing — Audio & Cloud Pipeline", group: "Deep Dives", onSelect: () => {}, keywords: ["audio", "cloud", "pipeline", "analyzer"] },
  { id: "nav-intelligence", label: "Intelligence — Compression, Consultation & Glyphs", group: "Deep Dives", onSelect: () => {}, keywords: ["tier", "consult", "glyph", "compression"] },
  { id: "nav-platform", label: "Platform — App, Privacy & Hardware", group: "Deep Dives", onSelect: () => {}, keywords: ["companion", "privacy", "hardware", "esp32"] },
  { id: "nav-status", label: "Status — Open Questions", group: "Deep Dives", onSelect: () => {}, keywords: ["questions", "deferred", "open"] },
];

export function BriefNavbar() {
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const commands: Command[] = ALL_COMMANDS.map((cmd) => ({
    ...cmd,
    onSelect: () => {
      const id = cmd.id.replace("nav-", "");
      const href = id === "home" ? "/brief" : id === "architecture" ? "/architecture-v5" : `/brief/${id}`;
      window.location.href = href;
      setCmdOpen(false);
    },
  }));

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: colors.bg,
          borderBottom: borders.rule,
          padding: `0 ${spacing.lg}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.lg,
        }}
      >
        {/* Left: Brand */}
        <Link href="/brief" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: fonts.serif,
              fontSize: 18,
              fontWeight: weights.medium,
              color: pathname === "/brief" ? colors.ink : colors.ink2,
              letterSpacing: "0.02em",
            }}
          >
            Nara
          </span>
        </Link>

        {/* Center: Page links — DS Tabs underline style */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <button
                  style={{
                    ...typography.label,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? colors.ink : "transparent"}`,
                    color: isActive ? colors.ink : colors.ink3,
                    fontWeight: isActive ? weights.medium : weights.regular,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {item.label}
                </button>
              </Link>
            );
          })}
        </div>

        {/* Right: Cmd+K hint */}
        <div
          style={{ cursor: "pointer" }}
          onClick={() => setCmdOpen(true)}
        >
          <Kbd>{"\u2318K"}</Kbd>
        </div>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </>
  );
}

export interface SidebarSection {
  id: string;
  label: string;
  color?: string;
}

export function BriefSidebar({
  sections,
  activeSection,
}: {
  sections: SidebarSection[];
  activeSection: string;
}) {
  return (
    <aside
      style={{
        position: "sticky",
        top: 56,
        alignSelf: "start",
        borderRight: borders.rule,
        paddingRight: spacing.md,
        paddingTop: spacing.md,
        maxHeight: "calc(100vh - 56px)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: spacing.xxs }}>
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.xs,
                padding: `${spacing.xxs}px ${spacing.xs}px`,
                borderRadius: 0,
                textDecoration: "none",
                background: isActive ? `${s.color ?? colors.ink}08` : "transparent",
                transition: "all 0.12s",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: isActive ? (s.color ?? colors.ink) : colors.ink3,
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.4,
                }}
              />
              <Caption
                style={{
                  color: isActive ? (s.color ?? colors.ink) : colors.ink3,
                  fontWeight: isActive ? weights.medium : weights.regular,
                }}
              >
                {s.label}
              </Caption>
            </a>
          );
        })}
      </div>
    </aside>
  );
}

export function useSidebarObserver(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}
