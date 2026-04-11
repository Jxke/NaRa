"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { colors, fonts, spacing, radius, transitions, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   Shared types & helpers
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: number | string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

type TableSize = "sm" | "md" | "lg";

interface BaseTableProps<T> {
  columns: Column<T>[];
  data: T[];
  size?: TableSize;
  /** Row click handler. Adds cursor + hover state when provided. */
  onRowClick?: (row: T, index: number) => void;
  /** Empty state rendered when data is []. */
  emptyState?: ReactNode;
  /** Row key accessor (defaults to index). */
  rowKey?: (row: T, index: number) => string;
  /** Initial sort column. */
  defaultSort?: { key: string; direction: "asc" | "desc" };
  style?: CSSProperties;
}

/** Size → cell padding + header padding. */
const SIZE_PADDING: Record<TableSize, { cell: string; header: string }> = {
  sm: { cell: `${spacing.xxs}px ${spacing.xs}px`, header: `${spacing.xxs}px ${spacing.xs}px` },
  md: { cell: `${spacing.xs}px ${spacing.sm}px`, header: `${spacing.xs}px ${spacing.sm}px` },
  lg: { cell: `${spacing.sm}px ${spacing.md}px`, header: `${spacing.sm}px ${spacing.md}px` },
};

/** Extract cell value — uses `render` if present, otherwise reads `row[key]`. */
function getCellContent<T>(row: T, column: Column<T>): ReactNode {
  if (column.render) return column.render(row);
  const value = (row as Record<string, unknown>)[column.key];
  if (value == null || value === "") {
    return <span style={{ color: colors.ink3 }}>—</span>;
  }
  return String(value);
}

/** Hook: manage sort state + return sorted data. */
function useSortedData<T>(
  data: T[],
  columns: Column<T>[],
  defaultSort?: { key: string; direction: "asc" | "desc" },
) {
  const [sort, setSort] = useState(defaultSort);

  const sortedData = sort
    ? [...data].sort((a, b) => {
        const col = columns.find((c) => c.key === sort.key);
        if (!col) return 0;
        const av = (a as Record<string, unknown>)[sort.key];
        const bv = (b as Record<string, unknown>)[sort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sort.direction === "asc" ? av - bv : bv - av;
        }
        const as = String(av);
        const bs = String(bv);
        return sort.direction === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
      })
    : data;

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return undefined;
    });
  };

  return { sortedData, sort, toggleSort };
}

/** Sortable header cell with arrow indicator. */
function HeaderCell<T>({
  column,
  sort,
  onSort,
  padding,
}: {
  column: Column<T>;
  sort: { key: string; direction: "asc" | "desc" } | undefined;
  onSort: (key: string) => void;
  padding: string;
}) {
  const isSorted = sort?.key === column.key;
  const canSort = column.sortable;
  return (
    <th
      style={{
        ...typography.label,
        color: colors.ink3,
        padding,
        textAlign: column.align ?? "left",
        width: column.width,
        fontWeight: 400,
        cursor: canSort ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        transition: transitions.fast,
      }}
      onClick={canSort ? () => onSort(column.key) : undefined}
      onMouseEnter={(e) => {
        if (canSort) e.currentTarget.style.color = colors.ink;
      }}
      onMouseLeave={(e) => {
        if (canSort && !isSorted) e.currentTarget.style.color = colors.ink3;
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: isSorted ? colors.ink : undefined }}>
        {column.header}
        {canSort && (
          <span style={{ fontSize: 8, opacity: isSorted ? 1 : 0.3, lineHeight: 1 }}>
            {isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "▲"}
          </span>
        )}
      </span>
    </th>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. GHOST TABLE — no chrome, hover row only
   ═══════════════════════════════════════════════════════════════════════════ */

export function GhostTable<T>({
  columns,
  data,
  size = "md",
  onRowClick,
  emptyState,
  rowKey,
  defaultSort,
  style,
}: BaseTableProps<T>) {
  const pad = SIZE_PADDING[size];
  const { sortedData, sort, toggleSort } = useSortedData(data, columns, defaultSort);
  return (
    <TableWrapper style={style}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <HeaderCell key={col.key} column={col} sort={sort} onSort={toggleSort} padding={pad.header} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <EmptyRow colSpan={columns.length} padding={pad.cell}>
              {emptyState}
            </EmptyRow>
          ) : (
            sortedData.map((row, i) => (
              <HoverRow
                key={rowKey?.(row, i) ?? i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} column={col} padding={pad.cell}>
                    {getCellContent(row, col)}
                  </TableCell>
                ))}
              </HoverRow>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. RULED TABLE — horizontal dividers, double rule under header
   ═══════════════════════════════════════════════════════════════════════════ */

export function RuledTable<T>({
  columns,
  data,
  size = "md",
  onRowClick,
  emptyState,
  rowKey,
  defaultSort,
  style,
}: BaseTableProps<T>) {
  const pad = SIZE_PADDING[size];
  const { sortedData, sort, toggleSort } = useSortedData(data, columns, defaultSort);
  return (
    <TableWrapper style={style}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${colors.ink}` }}>
            {columns.map((col) => (
              <HeaderCell key={col.key} column={col} sort={sort} onSort={toggleSort} padding={pad.header} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <EmptyRow colSpan={columns.length} padding={pad.cell}>
              {emptyState}
            </EmptyRow>
          ) : (
            sortedData.map((row, i) => (
              <HoverRow
                key={rowKey?.(row, i) ?? i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                style={{ borderBottom: `1px solid ${colors.rule}` }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} column={col} padding={pad.cell}>
                    {getCellContent(row, col)}
                  </TableCell>
                ))}
              </HoverRow>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. BORDERED TABLE — full grid
   ═══════════════════════════════════════════════════════════════════════════ */

export function BorderedTable<T>({
  columns,
  data,
  size = "md",
  onRowClick,
  emptyState,
  rowKey,
  defaultSort,
  style,
}: BaseTableProps<T>) {
  const pad = SIZE_PADDING[size];
  const { sortedData, sort, toggleSort } = useSortedData(data, columns, defaultSort);
  const cellBorder = `1px solid ${colors.rule}`;
  return (
    <TableWrapper style={{ border: cellBorder, borderRadius: radius.sm, overflow: "hidden", ...style }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: colors.inkFaint, borderBottom: cellBorder }}>
            {columns.map((col, i) => (
              <th
                key={col.key}
                style={{
                  borderLeft: i > 0 ? cellBorder : "none",
                  padding: 0,
                }}
              >
                <HeaderCell column={col} sort={sort} onSort={toggleSort} padding={pad.header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <EmptyRow colSpan={columns.length} padding={pad.cell}>
              {emptyState}
            </EmptyRow>
          ) : (
            sortedData.map((row, i) => (
              <HoverRow
                key={rowKey?.(row, i) ?? i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                style={i < sortedData.length - 1 ? { borderBottom: cellBorder } : undefined}
              >
                {columns.map((col, j) => (
                  <TableCell
                    key={col.key}
                    column={col}
                    padding={pad.cell}
                    style={j > 0 ? { borderLeft: cellBorder } : undefined}
                  >
                    {getCellContent(row, col)}
                  </TableCell>
                ))}
              </HoverRow>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. STRIPED TABLE — alternating row tint
   ═══════════════════════════════════════════════════════════════════════════ */

export function StripedTable<T>({
  columns,
  data,
  size = "md",
  onRowClick,
  emptyState,
  rowKey,
  defaultSort,
  style,
}: BaseTableProps<T>) {
  const pad = SIZE_PADDING[size];
  const { sortedData, sort, toggleSort } = useSortedData(data, columns, defaultSort);
  return (
    <TableWrapper style={style}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.rule}` }}>
            {columns.map((col) => (
              <HeaderCell key={col.key} column={col} sort={sort} onSort={toggleSort} padding={pad.header} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <EmptyRow colSpan={columns.length} padding={pad.cell}>
              {emptyState}
            </EmptyRow>
          ) : (
            sortedData.map((row, i) => (
              <HoverRow
                key={rowKey?.(row, i) ?? i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                baseBg={i % 2 === 1 ? colors.inkFaint : "transparent"}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} column={col} padding={pad.cell}>
                    {getCellContent(row, col)}
                  </TableCell>
                ))}
              </HoverRow>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. CARD TABLE — rows as bordered cards with gap
   ═══════════════════════════════════════════════════════════════════════════ */

export function CardTable<T>({
  columns,
  data,
  size = "md",
  onRowClick,
  emptyState,
  rowKey,
  defaultSort,
  style,
}: BaseTableProps<T>) {
  const pad = SIZE_PADDING[size];
  const { sortedData, sort, toggleSort } = useSortedData(data, columns, defaultSort);
  return (
    <TableWrapper style={style}>
      {/* Header uses same column layout as cards */}
      <div
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: columns.map((c) => (c.width ? String(c.width) : "1fr")).join(" "),
          padding: `0 ${spacing.md}px`,
          marginBottom: spacing.sm,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              ...typography.label,
              color: colors.ink3,
              padding: `0 ${spacing.sm}px`,
              textAlign: col.align ?? "left",
              cursor: col.sortable ? "pointer" : "default",
              userSelect: "none",
            }}
            onClick={col.sortable ? () => toggleSort(col.key) : undefined}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: sort?.key === col.key ? colors.ink : undefined }}>
              {col.header}
              {col.sortable && (
                <span style={{ fontSize: 8, opacity: sort?.key === col.key ? 1 : 0.3 }}>
                  {sort?.key === col.key ? (sort.direction === "asc" ? "▲" : "▼") : "▲"}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      {sortedData.length === 0 ? (
        <div
          style={{
            padding: pad.cell,
            ...typography.body,
            color: colors.ink3,
            textAlign: "center",
            border: `1px solid ${colors.rule}`,
            borderRadius: radius.sm,
          }}
        >
          {emptyState ?? "No data"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          {sortedData.map((row, i) => (
            <CardRow
              key={rowKey?.(row, i) ?? i}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              columns={columns}
              padding={pad.cell}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{
                    padding: `0 ${spacing.sm}px`,
                    textAlign: col.align ?? "left",
                    ...typography.body,
                    color: colors.ink2,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getCellContent(row, col)}
                </div>
              ))}
            </CardRow>
          ))}
        </div>
      )}
    </TableWrapper>
  );
}

function CardRow<T>({
  children,
  onClick,
  columns,
  padding,
}: {
  children: ReactNode;
  onClick?: () => void;
  columns: Column<T>[];
  padding: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="row"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: columns.map((c) => (c.width ? String(c.width) : "1fr")).join(" "),
        alignItems: "center",
        padding,
        border: `1px solid ${hovered && onClick ? colors.ruleStrong : colors.rule}`,
        borderRadius: radius.sm,
        background: hovered && onClick ? colors.inkFaint : "transparent",
        cursor: onClick ? "pointer" : "default",
        transition: transitions.fast,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. KEY-VALUE TABLE — two-column spec sheet
   ═══════════════════════════════════════════════════════════════════════════ */

interface KeyValueRow {
  label: string;
  value: ReactNode;
}

interface KeyValueTableProps {
  rows: KeyValueRow[];
  size?: TableSize;
  /** Use mono for values. Useful for technical spec sheets. Default false. */
  monoValues?: boolean;
  style?: CSSProperties;
}

export function KeyValueTable({
  rows,
  size = "md",
  monoValues = false,
  style,
}: KeyValueTableProps) {
  const pad = SIZE_PADDING[size];
  return (
    <TableWrapper style={style}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td
                style={{
                  ...typography.label,
                  color: colors.ink3,
                  padding: pad.cell,
                  paddingLeft: 0,
                  verticalAlign: "baseline",
                  whiteSpace: "nowrap",
                  width: 1,
                }}
              >
                {row.label}
              </td>
              <td
                style={{
                  ...(monoValues
                    ? { fontFamily: fonts.mono, fontSize: 13, fontWeight: 400, color: colors.ink }
                    : { ...typography.body, color: colors.ink }),
                  padding: pad.cell,
                  paddingRight: 0,
                  verticalAlign: "baseline",
                }}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

/* ─── Shared table primitives ───────────────────────────────────────────── */

function TableWrapper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={style}>{children}</div>;
}

function HoverRow({
  children,
  onClick,
  style,
  baseBg,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  baseBg?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? colors.inkSubtle : baseBg ?? "transparent",
        cursor: onClick ? "pointer" : "default",
        transition: transitions.fast,
        ...style,
      }}
    >
      {children}
    </tr>
  );
}

function TableCell<T>({
  children,
  column,
  padding,
  style,
}: {
  children: ReactNode;
  column: Column<T>;
  padding: string;
  style?: CSSProperties;
}) {
  return (
    <td
      style={{
        ...typography.body,
        color: colors.ink2,
        padding,
        textAlign: column.align ?? "left",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function EmptyRow({
  colSpan,
  padding,
  children,
}: {
  colSpan: number;
  padding: string;
  children?: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          ...typography.body,
          color: colors.ink3,
          padding: `${spacing.lg}px ${padding.split(" ")[1] ?? spacing.md}`,
          textAlign: "center",
        }}
      >
        {children ?? "No data"}
      </td>
    </tr>
  );
}
