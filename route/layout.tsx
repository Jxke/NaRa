import type { Metadata } from "next";
import { colors, fonts } from "../../ds-nara/tokens";
import "../../ds-nara/cockpit-ds.css";

export const metadata: Metadata = {
  title: "NaRa — Identity Guidelines",
  description:
    "NaRa identity system: black-on-white ePaper palette, PP Mondwest display, PP NeueBit UI.",
};

export default function NaraLayout({
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
        fontFamily: fonts.serif,
      }}
    >
      {children}
    </div>
  );
}
