import { type CSSProperties, type ReactNode } from "react";
import { typography } from "../tokens";

interface TypographyProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Title({ children, style }: TypographyProps) {
  return <h1 style={{ ...typography.title, margin: 0, marginBottom: 16, ...style }}>{children}</h1>;
}

export function Eyebrow({ children, style }: TypographyProps) {
  return <div style={{ ...typography.eyebrow, marginBottom: 12, ...style }}>{children}</div>;
}

export function H1({ children, style }: TypographyProps) {
  return <h1 style={{ ...typography.h1, margin: 0, marginBottom: 12, ...style }}>{children}</h1>;
}

export function H2({ children, style }: TypographyProps) {
  return <h2 style={{ ...typography.h2, margin: 0, marginBottom: 12, ...style }}>{children}</h2>;
}

export function H3({ children, style }: TypographyProps) {
  return <h3 style={{ ...typography.h3, margin: 0, marginBottom: 8, ...style }}>{children}</h3>;
}

export function Body({ children, style }: TypographyProps) {
  return <p style={{ ...typography.body, margin: 0, ...style }}>{children}</p>;
}

export function Caption({ children, style }: TypographyProps) {
  return <span style={{ ...typography.caption, ...style }}>{children}</span>;
}

export function Italic({ children, style }: TypographyProps) {
  return <em style={{ fontStyle: "normal", fontWeight: 400, ...style }}>{children}</em>;
}
