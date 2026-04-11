import type { Metadata } from "next";
import { colors, fonts } from "./tokens";
import "./cockpit-ds.css";

export const metadata: Metadata = {
  title: "NaRa Design System — Identity Guidelines",
  description:
    "NaRa identity: black-on-white ePaper palette, PP Mondwest display, PP NeueBit UI.",
};

export default function NaraDesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="ds-cockpit-scope"
      style={{
        margin: 0,
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: fonts.mono,
      }}
    >
      {children}
    </div>
  );
}
