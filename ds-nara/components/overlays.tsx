import { colors, invertedColors, fonts, radius, shadows, transitions } from "../tokens";
import { StatPair } from "./atoms";

interface TooltipProps {
  title: string;
  stats: { label: string; value: string; color?: string }[];
  description?: string;
  visible?: boolean;
}

export function Tooltip({
  title,
  stats,
  description,
  visible = true,
}: TooltipProps) {
  return (
    <div
      role="tooltip"
      style={{
        background: colors.ink,
        color: colors.bg,
        borderRadius: radius.md,
        padding: "14px 18px",
        fontFamily: fonts.mono,
        fontSize: 10,
        maxWidth: 240,
        minWidth: 200,
        boxShadow: shadows.tooltip,
        opacity: visible ? 1 : 0,
        transition: transitions.fast,
      }}
    >
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: 15,
          fontWeight: 400,
          marginBottom: 10,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      {stats.map((s) => (
        <StatPair
          key={s.label}
          label={s.label}
          value={s.value}
          valueColor={s.color}
          inverted
        />
      ))}
      {description && (
        <div
          style={{
            fontSize: 9,
            lineHeight: 1.65,
            color: invertedColors.textSubtle,
            marginTop: 10,
            borderTop: `1px solid ${invertedColors.border}`,
            paddingTop: 10,
            fontWeight: 700,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
