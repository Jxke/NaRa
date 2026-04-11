import { type CSSProperties, type ReactNode } from "react";
import { colors, borders } from "../tokens";

export function Container({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", ...style }}>
      {children}
    </div>
  );
}

export function Section({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        marginBottom: 48,
        paddingTop: 28,
        borderTop: borders.rule,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Rule() {
  return (
    <hr style={{ border: "none", borderTop: borders.heavyRule, margin: "8px 0" }} />
  );
}

export function ThinRule() {
  return (
    <hr style={{ border: "none", borderTop: borders.rule, margin: "8px 0" }} />
  );
}
