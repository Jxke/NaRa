"use client";

import { useCallback, useState, useMemo, useRef, useEffect, memo, createContext, useContext } from "react";
import {
  ReactFlow,
  Background,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  type EdgeProps,
  Handle,
  Position,
  BaseEdge,
  getSmoothStepPath,
  ReactFlowProvider,
  type NodeMouseHandler,
  type OnNodesChange,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  getSmartEdge,
  pathfindingAStarDiagonal,
  svgDrawSmoothLinePath,
  type SVGDrawFunction,
} from "@tisoap/react-flow-smart-edge";
import { colors, fonts, weights, spacing, radius, transitions, typography } from "./tokens";
import { zone } from "./architecture-tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   HOVER CONTEXT — avoids passing hover state through React Flow data
   which would cause full re-renders on every mouse move.
   Instead, nodes/edges read from context and only re-render themselves.
   ═══════════════════════════════════════════════════════════════════════════ */

interface HoverState {
  hoveredNode: string | null;
  connectedIds: Set<string> | null;
}

const HoverContext = createContext<HoverState>({ hoveredNode: null, connectedIds: null });
const NodesContext = createContext<Node[]>([]);
/** Set of "nodeId:handleId" strings for handles that have edges connected */
const ActiveHandlesContext = createContext<Set<string>>(new Set());

/** A* tuner settings */
interface TunerSettings {
  nodePadding: number;
  gridRatio: number;
  useSmartEdge: boolean;
  edgeSpread: number; // px offset between collinear edges sharing a handle (0 = off)
}

const DEFAULT_TUNER: TunerSettings = { nodePadding: 4, gridRatio: 6, useSmartEdge: true, edgeSpread: 0 };
const TunerContext = createContext<TunerSettings>(DEFAULT_TUNER);

/* ═══════════════════════════════════════════════════════════════════════════
   CUSTOM NODE — DS-compliant styled node
   ═══════════════════════════════════════════════════════════════════════════ */

interface PipelineNodeData {
  label: string;
  sublabel?: string;
  color: string;
  [key: string]: unknown;
}

const HANDLE_IDS = ["top", "top-target", "right", "right-target", "bottom", "bottom-target", "left", "left-target"] as const;
const HANDLE_POSITIONS: Record<string, Position> = {
  top: Position.Top, "top-target": Position.Top,
  right: Position.Right, "right-target": Position.Right,
  bottom: Position.Bottom, "bottom-target": Position.Bottom,
  left: Position.Left, "left-target": Position.Left,
};
const HANDLE_TYPES: Record<string, "source" | "target"> = {
  top: "source", "top-target": "target",
  right: "source", "right-target": "target",
  bottom: "source", "bottom-target": "target",
  left: "source", "left-target": "target",
};

const PipelineNode = memo(function PipelineNode({ id, data }: NodeProps<Node<PipelineNodeData>>) {
  const { label, sublabel, color } = data;
  const { hoveredNode, connectedIds } = useContext(HoverContext);
  const activeHandles = useContext(ActiveHandlesContext);

  const isHovered = hoveredNode === id;
  const isDimmed = connectedIds !== null && !connectedIds.has(id);

  return (
    <div
      style={{
        padding: sublabel ? `${spacing.xs}px ${spacing.sm}px` : `5px ${spacing.sm}px`,
        borderRadius: radius.sm,
        border: `1px solid ${isHovered ? color : `${color}80`}`,
        background: isHovered ? `${color}28` : `${color}12`,
        fontFamily: fonts.mono,
        opacity: isDimmed ? 0.6 : 1,
        transition: transitions.fast,
        cursor: "pointer",
        minWidth: spacing.xxl + spacing.xl,
        textAlign: "center",
      }}
    >
      {HANDLE_IDS.map((hid) => {
        const connected = activeHandles.has(`${id}:${hid}`);
        return (
          <Handle
            key={hid}
            type={HANDLE_TYPES[hid]}
            position={HANDLE_POSITIONS[hid]}
            id={hid}
            style={{
              background: connected ? `${color}90` : "transparent",
              border: "none",
              width: connected ? 5 : 4,
              height: connected ? 5 : 4,
            }}
          />
        );
      })}
      <div style={{ ...typography.body, fontWeight: weights.medium, color, lineHeight: 1.3 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ ...typography.stat, color: colors.ink2, lineHeight: 1.3, marginTop: 1 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   ZONE GROUP NODE
   ═══════════════════════════════════════════════════════════════════════════ */

interface ZoneNodeData {
  label: string;
  color: string;
  [key: string]: unknown;
}

const ZoneNode = memo(function ZoneNode({ data }: NodeProps<Node<ZoneNodeData>>) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius.lg,
        background: `${data.color}0c`,
        border: `1px solid ${data.color}15`,
        padding: `${spacing.sm}px ${spacing.md}px`,
      }}
    >
      <div style={{ ...typography.caption, fontWeight: weights.medium, color: data.color }}>
        {data.label}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   CUSTOM EDGE — reads hover context for active state
   ═══════════════════════════════════════════════════════════════════════════ */

interface PipelineEdgeData {
  color: string;
  edgeLabel?: string;
  [key: string]: unknown;
}

const PipelineEdge = memo(function PipelineEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<PipelineEdgeData>>) {
  const { connectedIds, hoveredNode } = useContext(HoverContext);
  const allNodes = useContext(NodesContext);
  // Convert child positions to absolute and exclude zone boxes from pathfinding
  const pipelineNodes = useMemo(() => {
    const parentPositions = new Map<string, { x: number; y: number }>();
    for (const n of allNodes) {
      if (n.type === "zone") parentPositions.set(n.id, n.position);
    }
    return allNodes
      .filter((n) => n.type !== "zone")
      .map((n) => {
        const parent = n.parentId ? parentPositions.get(n.parentId) : undefined;
        if (!parent) return n;
        return { ...n, position: { x: n.position.x + parent.x, y: n.position.y + parent.y } };
      });
  }, [allNodes]);
  const edgeColor = data?.color ?? colors.ink3;

  const active = hoveredNode === null || source === hoveredNode || target === hoveredNode;

  const tuner = useContext(TunerContext);

  // Apply collinearity spread offset
  const spreadInfo = EDGE_SPREAD_INFO.get(id);
  let spreadOffset = 0;
  if (spreadInfo && spreadInfo.total > 1 && tuner.edgeSpread > 0) {
    spreadOffset = (spreadInfo.index - (spreadInfo.total - 1) / 2) * tuner.edgeSpread;
  }
  const isVertSrc = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
  const isVertTgt = targetPosition === Position.Top || targetPosition === Position.Bottom;
  const sX = sourceX + (isVertSrc ? spreadOffset : 0);
  const sY = sourceY + (!isVertSrc ? spreadOffset : 0);
  const tX = targetX + (isVertTgt ? spreadOffset : 0);
  const tY = targetY + (!isVertTgt ? spreadOffset : 0);

  // Smooth step fallback (always computed)
  const [stepPath, stepLabelX, stepLabelY] = getSmoothStepPath({
    sourceX: sX, sourceY: sY, targetX: tX, targetY: tY, sourcePosition, targetPosition, borderRadius: radius.lg,
  });

  let edgePath = stepPath;
  let labelX = stepLabelX;
  let labelY = stepLabelY;

  if (tuner.useSmartEdge) {
    const smartResult = getSmartEdge({
      sourceX: sX, sourceY: sY, targetX: tX, targetY: tY,
      sourcePosition, targetPosition, nodes: pipelineNodes,
      options: {
        nodePadding: tuner.nodePadding,
        gridRatio: tuner.gridRatio,
        drawEdge: svgDrawSmoothLinePath,
        generatePath: pathfindingAStarDiagonal,
      },
    });
    if (!(smartResult instanceof Error)) {
      edgePath = smartResult.svgPathString;
      labelX = (sX + tX) / 2;
      labelY = (sY + tY) / 2;
    }
  }

  return (
    <>
      {/* Base line — always visible */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: active && hoveredNode !== null ? 2 : 1,
          opacity: active ? (hoveredNode === null ? 0.2 : 0.5) : 0.05,
          transition: transitions.fast,
        }}
      />
      {/* Animated dashed flow */}
      {active && (
        <path
          d={edgePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={hoveredNode !== null ? 2 : 1.5}
          strokeDasharray={hoveredNode !== null ? "8 10" : "4 12"}
          strokeLinecap="round"
          opacity={hoveredNode !== null ? 0.85 : 0.3}
          style={{ animation: "archFlowDash 1.2s linear infinite", transition: transitions.fast }}
        />
      )}
      {/* Edge label — on hover */}
      {data?.edgeLabel && active && hoveredNode !== null && (
        <text
          x={labelX}
          y={labelY - 6}
          textAnchor="middle"
          style={{ ...typography.stat, fontSize: 7, fill: edgeColor, fontFamily: fonts.mono }}
        >
          {data.edgeLabel}
        </text>
      )}
    </>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   NODE & EDGE DATA — built once, never mutated
   ═══════════════════════════════════════════════════════════════════════════ */

const nodeTypes: NodeTypes = { pipeline: PipelineNode, zone: ZoneNode };
const edgeTypes: EdgeTypes = { pipeline: PipelineEdge };

function buildNodes(): Node[] {
  const nodes: Node[] = [];

  // Zone groups — 4 zones (no separate Glyph System zone in v5)
  // Device (left) | Cloud/Supabase (center) | App + Privacy (right)
  nodes.push(
    { id: "zone-device", type: "zone", position: { x: 0, y: 0 }, data: { label: "On-Device (ESP32-S3)", color: zone.device }, style: { width: 290, height: 700 }, draggable: false, selectable: false },
    { id: "zone-cloud", type: "zone", position: { x: 330, y: 0 }, data: { label: "Cloud (Supabase)", color: zone.cloud }, style: { width: 500, height: 700 }, draggable: false, selectable: false },
    { id: "zone-app", type: "zone", position: { x: 870, y: 0 }, data: { label: "Companion App", color: zone.app }, style: { width: 290, height: 280 }, draggable: false, selectable: false },
    { id: "zone-privacy", type: "zone", position: { x: 870, y: 320 }, data: { label: "Privacy & Compliance", color: zone.privacy }, style: { width: 290, height: 280 }, draggable: false, selectable: false },
  );

  /* ── On-Device nodes ── */
  const d = (id: string, x: number, y: number, label: string, sublabel: string | undefined, color: string) =>
    nodes.push({ id, type: "pipeline", position: { x, y }, data: { label, sublabel, color }, parentId: "zone-device", expandParent: false });

  // Audio pipeline (top)
  d("mic",    20,  40,  "INMP441 Microphone", "I2S • 16-bit • 2mA", zone.audio);
  d("vad",    20,  100, "ESP-SR VAD", "Core 0 • gate WiFi", zone.device);
  d("opus",   20,  160, "Opus Encoder", "16kbps • Core 1", zone.audio);
  // Sensors & input
  d("imu",    20,  230, "IMU", "MPU-6050 • I2C", zone.device);
  d("btn",    155, 230, "Button", "Consult • GPIO 2", zone.device);
  d("haptic", 155, 300, "Haptic Motor", "DRV2605L • 80mA", zone.device);
  // Tier storage (on-device cache)
  d("t1",     20,  300, "Tier 1 — Signals", "1 hour • flash", zone.storage);
  d("t2",     20,  360, "Tier 2 — Daily", "1 day • flash", zone.storage);
  d("t3",     20,  420, "Tier 3 — Weekly", "1 week • flash", zone.storage);
  d("t4",     20,  480, "Tier 4 — Themes", "2-yr rolling • encrypted", zone.privacy);
  // Glyph store (on-device, static 22)
  d("glyphstore", 155, 420, "Glyph Inventory", "22 static • flash", zone.glyph);
  // Output & connectivity
  d("eink",   20,  555, "E-Ink Display", "200x200 • scroll", zone.app);
  d("pot",    155, 555, "Potentiometer", "scroll + contrast", zone.device);
  d("ble",    155, 625, "BLE Radio", "Provisioning", zone.device);
  d("wifi",   20,  625, "WiFi Credentials", "NVS encrypted", zone.privacy);

  /* ── Cloud / Supabase nodes ── */
  const c = (id: string, x: number, y: number, label: string, sublabel: string | undefined, color: string) =>
    nodes.push({ id, type: "pipeline", position: { x, y }, data: { label, sublabel, color }, parentId: "zone-cloud", expandParent: false });

  // Supabase infrastructure
  c("supabase-auth",     20,  40,  "Supabase Auth", "JWT • RLS", zone.cloud);
  c("supabase-realtime", 200, 40,  "Supabase Realtime", "WebSocket channels", zone.cloud);
  c("postgres",          20,  110, "Postgres", "Tier tables • RLS", zone.storage);
  c("supabase-storage",  200, 110, "Supabase Storage", "Glyph bitmaps", zone.storage);
  // Edge Functions — ingestion
  c("edge-ingest", 20,  185, "Edge Fn: /ingest-audio", "Deepgram STT • write T1", zone.audio);
  // Compression (Edge Functions triggered by pg_cron)
  c("pgcron",  340, 185, "pg_cron", "Scheduler", zone.cloud);
  c("hcomp",   20,  260, "Hourly Comp.", "Edge Fn", zone.storage);
  c("dcomp",   160, 260, "Daily Comp.", "Edge Fn", zone.storage);
  c("wcomp",   310, 260, "Weekly Comp.", "Edge Fn", zone.storage);
  c("merge",   160, 330, "Theme Merger", "Edge Fn • time-decay", zone.storage);
  // Consultation pipeline (Edge Function)
  c("edge-consult", 20,  410, "Edge Fn: /consult", "Full pipeline", zone.cloud);
  c("qstt",    20,  480, "Query STT", "Deepgram • ~800ms", zone.cloud);
  c("fetchctx", 170, 480, "Fetch Context", "Tiers 1-4 • ~50ms", zone.cloud);
  c("deepreasoner", 20, 550, "Deep Reasoner", "OpenAI/Claude • ~1500ms", zone.cloud);
  c("glyphpicker", 20, 620, "Glyph Picker", "Haiku-class • ~400ms", zone.cloud);
  c("rule",    250, 620, "Rule Constraint", "3 glyphs + 1 word", zone.cloud);

  /* ── Companion App nodes ── */
  const a = (id: string, x: number, y: number, label: string, sublabel: string | undefined, color: string) =>
    nodes.push({ id, type: "pipeline", position: { x, y }, data: { label, sublabel, color }, parentId: "zone-app", expandParent: false });

  a("wifiprov",   20,  40,  "WiFi Provisioning", "SRP6a / X25519", zone.app);
  a("devstatus",  20,  100, "Device Status", undefined, zone.app);
  a("tierview",   155, 100, "Tier Viewer", undefined, zone.app);
  a("privctrl",   20,  160, "Privacy Controls", undefined, zone.app);
  a("ota",        155, 160, "OTA Firmware", "Ed25519", zone.app);
  a("consent",    20,  220, "Consent Settings", undefined, zone.app);

  /* ── Privacy & Compliance nodes ── */
  const p = (id: string, x: number, y: number, label: string, sublabel: string | undefined, color: string) =>
    nodes.push({ id, type: "pipeline", position: { x, y }, data: { label, sublabel, color }, parentId: "zone-privacy", expandParent: false });

  p("crypto",        20,  40,  "Crypto-Shredding", "AES-256-GCM • eFuse", zone.privacy);
  p("nvs",           20,  100, "NVS Encrypted", "WiFi creds • keys", zone.privacy);
  p("erasure",       155, 100, "Right to Erasure", "GDPR Art. 17", zone.privacy);
  p("dataexp",       20,  165, "Data Export", "Art. 20 • JSON+PDF", zone.privacy);
  p("recindicator",  155, 165, "Recording Indicator", "Hardwired", zone.privacy);

  return nodes;
}

function buildEdges(): Edge[] {
  const e = (id: string, source: string, target: string, color: string, edgeLabel?: string): Edge => ({
    id, source, target, type: "pipeline", data: { color, edgeLabel },
  });

  return [
    // Audio capture → device
    e("e-mic-vad", "mic", "vad", zone.audio),
    e("e-vad-opus", "vad", "opus", zone.audio),
    // Audio stream to Supabase
    e("e-opus-realtime", "opus", "supabase-realtime", zone.audio, "Opus stream"),
    e("e-realtime-ingest", "supabase-realtime", "edge-ingest", zone.audio, "audio frames"),
    // Edge Fn /ingest-audio writes to Postgres T1
    e("e-ingest-postgres", "edge-ingest", "postgres", zone.audio, "write T1"),
    e("e-postgres-t1", "postgres", "t1", zone.storage, "sync T1"),
    // IMU
    e("e-imu-t1", "imu", "t1", zone.device),
    // Supabase Auth → Edge Functions
    e("e-auth-ingest", "supabase-auth", "edge-ingest", zone.cloud, "auth"),
    e("e-auth-consult", "supabase-auth", "edge-consult", zone.cloud, "auth"),
    // Supabase Storage → glyph store
    e("e-storage-glyphstore", "supabase-storage", "glyphstore", zone.storage, "glyph bitmaps"),
    // Compression (Edge Functions triggered by pg_cron)
    e("e-pgcron-hcomp", "pgcron", "hcomp", zone.cloud, "hourly"),
    e("e-pgcron-dcomp", "pgcron", "dcomp", zone.cloud, "daily"),
    e("e-pgcron-wcomp", "pgcron", "wcomp", zone.cloud, "weekly"),
    e("e-postgres-hcomp", "postgres", "hcomp", zone.storage, "T1 rows"),
    e("e-postgres-dcomp", "postgres", "dcomp", zone.storage, "T2 rows"),
    e("e-postgres-wcomp", "postgres", "wcomp", zone.storage, "T3 rows"),
    e("e-hcomp-postgres", "hcomp", "postgres", zone.storage, "write T2"),
    e("e-dcomp-postgres", "dcomp", "postgres", zone.storage, "write T3"),
    e("e-wcomp-merge", "wcomp", "merge", zone.storage),
    e("e-merge-postgres", "merge", "postgres", zone.storage, "write T4"),
    e("e-hcomp-t2", "hcomp", "t2", zone.storage, "sync T2"),
    e("e-dcomp-t3", "dcomp", "t3", zone.storage, "sync T3"),
    e("e-merge-t4", "merge", "t4", zone.privacy, "sync T4"),
    // Consultation pipeline
    e("e-btn-mic", "btn", "mic", zone.device, "activate"),
    e("e-btn-t1", "btn", "t1", zone.device),
    e("e-btn-consult", "btn", "edge-consult", zone.cloud, "query"),
    e("e-consult-qstt", "edge-consult", "qstt", zone.cloud, "step 1"),
    e("e-qstt-fetchctx", "qstt", "fetchctx", zone.cloud, "query text"),
    e("e-fetchctx-postgres", "fetchctx", "postgres", zone.cloud, "read T1-T4"),
    e("e-fetchctx-dr", "fetchctx", "deepreasoner", zone.cloud, "context + query"),
    e("e-glyphstore-gp", "glyphstore", "glyphpicker", zone.storage, "22 glyph metadata"),
    e("e-dr-gp", "deepreasoner", "glyphpicker", zone.cloud, "internal reasoning"),
    e("e-gp-rule", "glyphpicker", "rule", zone.cloud, "3 glyphs + word"),
    e("e-rule-eink", "rule", "eink", zone.app, "glyphs → E-Ink"),
    // WiFi gate
    e("e-vad-wifi", "vad", "wifi", zone.device, "WiFi gate"),
    e("e-wifi-auth", "wifi", "supabase-auth", zone.cloud, "TLS → JWT"),
    // BLE
    e("e-ble-wifiprov", "ble", "wifiprov", zone.device, "BLE prov"),
    e("e-ble-wifi", "ble", "wifi", zone.device),
    e("e-t4-crypto", "t4", "crypto", zone.privacy, "certs"),
    // Potentiometer & Haptic
    e("e-pot-eink", "pot", "eink", zone.device, "scroll + contrast"),
    e("e-btn-haptic", "btn", "haptic", zone.device, "press feedback"),
    e("e-rule-haptic", "rule", "haptic", zone.cloud, "response buzz"),
    // Companion App
    e("e-ble-devstatus", "ble", "devstatus", zone.app, "BLE status"),
    e("e-ble-tierview", "ble", "tierview", zone.app, "BLE tier data"),
    e("e-ble-privctrl", "ble", "privctrl", zone.app, "BLE settings"),
    e("e-privctrl-crypto", "privctrl", "crypto", zone.privacy, "tier deletion"),
    e("e-ble-consent", "ble", "consent", zone.app, "BLE consent"),
    e("e-supabase-storage-ota", "supabase-storage", "ota", zone.app, "firmware"),
    // Privacy & Compliance
    e("e-wifiprov-nvs", "wifiprov", "nvs", zone.privacy, "store creds"),
    e("e-nvs-crypto", "nvs", "crypto", zone.privacy, "tier keys"),
    e("e-privctrl-erasure", "privctrl", "erasure", zone.privacy, "GDPR request"),
    e("e-erasure-crypto", "erasure", "crypto", zone.privacy, "shred keys"),
    e("e-privctrl-dataexp", "privctrl", "dataexp", zone.privacy, "export request"),
    e("e-t4-dataexp", "t4", "dataexp", zone.privacy, "theme data"),
    e("e-mic-recindicator", "mic", "recindicator", zone.privacy, "hardwired"),
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMART HANDLE ASSIGNMENT — pick best source/target handle per edge
   based on relative node positions
   ═══════════════════════════════════════════════════════════════════════════ */

function assignSmartHandles(nodes: Node[], edges: Edge[]): Edge[] {
  // Build absolute position map (child position + parent position)
  const absPos = new Map<string, { x: number; y: number }>();
  const parentPos = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (node.type === "zone") {
      parentPos.set(node.id, node.position);
    }
  }

  for (const node of nodes) {
    if (node.type === "zone") {
      absPos.set(node.id, node.position);
    } else {
      const parent = node.parentId ? parentPos.get(node.parentId) : undefined;
      absPos.set(node.id, {
        x: node.position.x + (parent?.x ?? 0),
        y: node.position.y + (parent?.y ?? 0),
      });
    }
  }

  return edges.map((edge) => {
    const srcPos = absPos.get(edge.source);
    const tgtPos = absPos.get(edge.target);
    if (!srcPos || !tgtPos) return edge;

    const dx = tgtPos.x - srcPos.x;
    const dy = tgtPos.y - srcPos.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const ratio = absDx === 0 ? Infinity : absDy / absDx;

    // Source handle: pick the side the target is most toward
    // For diagonal-friendly routing, use independent axis logic per endpoint
    let sourceHandle: string;
    let targetHandle: string;

    if (absDx > absDy) {
      // Primarily horizontal
      sourceHandle = dx > 0 ? "right" : "left";
      targetHandle = dx > 0 ? "left-target" : "right-target";
    } else {
      // Primarily vertical
      sourceHandle = dy > 0 ? "bottom" : "top";
      targetHandle = dy > 0 ? "top-target" : "bottom-target";
    }

    return { ...edge, sourceHandle, targetHandle };
  });
}

/* Pre-compute adjacency map for fast hover lookups */
const EDGES = assignSmartHandles(buildNodes(), buildEdges());

/* Pre-compute which handles have edges connected */
const ACTIVE_HANDLES = new Set<string>();
for (const edge of EDGES) {
  if (edge.sourceHandle) ACTIVE_HANDLES.add(`${edge.source}:${edge.sourceHandle}`);
  if (edge.targetHandle) ACTIVE_HANDLES.add(`${edge.target}:${edge.targetHandle}`);
}

/* Pre-compute collinearity index: for each edge, its index among edges sharing the same source handle,
   and the total count. Stored as edgeId → { index, total } */
const EDGE_SPREAD_INFO = new Map<string, { index: number; total: number }>();
{
  const handleGroups = new Map<string, string[]>();
  for (const edge of EDGES) {
    const key = `${edge.source}:${edge.sourceHandle}`;
    if (!handleGroups.has(key)) handleGroups.set(key, []);
    handleGroups.get(key)!.push(edge.id);
  }
  for (const [, edgeIds] of handleGroups) {
    for (let i = 0; i < edgeIds.length; i++) {
      EDGE_SPREAD_INFO.set(edgeIds[i], { index: i, total: edgeIds.length });
    }
  }
}

const ADJACENCY = new Map<string, Set<string>>();
for (const edge of EDGES) {
  if (!ADJACENCY.has(edge.source)) ADJACENCY.set(edge.source, new Set());
  if (!ADJACENCY.has(edge.target)) ADJACENCY.set(edge.target, new Set());
  ADJACENCY.get(edge.source)!.add(edge.target);
  ADJACENCY.get(edge.target)!.add(edge.source);
}

function getConnectedIds(nodeId: string): Set<string> {
  const ids = new Set<string>();
  ids.add(nodeId);
  const neighbors = ADJACENCY.get(nodeId);
  if (neighbors) {
    for (const n of neighbors) ids.add(n);
  }
  return ids;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLOW COMPONENT — stable nodes/edges, hover via context only
   ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_NODES = buildNodes();
const STORAGE_KEY = "maddi-pipeline-v5-node-positions";

function loadSavedPositions(): Record<string, { x: number; y: number }> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyPositions(nodes: Node[], positions: Record<string, { x: number; y: number }> | null): Node[] {
  if (!positions) return nodes;
  return nodes.map((node) => {
    const saved = positions[node.id];
    if (saved) return { ...node, position: saved };
    return node;
  });
}

function PipelineFlowInner({ onNodeClick }: { onNodeClick: (nodeId: string) => void }) {
  const [nodes, setNodes] = useState<Node[]>(() => applyPositions(DEFAULT_NODES, loadSavedPositions()));
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tuner, setTuner] = useState<TunerSettings>(DEFAULT_TUNER);
  const [showTuner, setShowTuner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onNodeDragStop: NodeMouseHandler = useCallback((_event, _node) => {
    // Save all positions to localStorage
    setNodes((currentNodes) => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const n of currentNodes) {
        positions[n.id] = n.position;
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch {}
      return currentNodes;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setNodes(DEFAULT_NODES);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const hoverState = useMemo<HoverState>(() => ({
    hoveredNode,
    connectedIds: hoveredNode ? getConnectedIds(hoveredNode) : null,
  }), [hoveredNode]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_event, node) => {
    if (node.type !== "zone") setHoveredNode(node.id);
  }, []);

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.type !== "zone") onNodeClick(node.id);
  }, [onNodeClick]);

  return (
    <HoverContext.Provider value={hoverState}>
    <NodesContext.Provider value={nodes}>
    <ActiveHandlesContext.Provider value={ACTIVE_HANDLES}>
    <TunerContext.Provider value={tuner}>
      <div ref={containerRef} style={{
        position: "relative",
        width: "100%",
        height: isFullscreen ? "100vh" : 1000,
        borderRadius: isFullscreen ? 0 : 0,
        border: "none",
        overflow: "hidden",
        background: colors.bg,
      }}>
        <style>{`
          .react-flow__attribution { display: none; }
          @keyframes archFlowDash { to { stroke-dashoffset: -20; } }
        `}</style>
        {/* Toolbar */}
        <div style={{
          position: "absolute",
          top: spacing.xs,
          right: spacing.xs,
          zIndex: 10,
          display: "flex",
          gap: spacing.xxs,
        }}>
          {[
            { label: "A* Tuner", onClick: () => setShowTuner((s) => !s), active: showTuner },
            { label: "Fit View", onClick: () => fitView({ padding: 0.12 }) },
            { label: "Reset Layout", onClick: resetLayout },
            { label: isFullscreen ? "Exit Fullscreen" : "Fullscreen", onClick: toggleFullscreen },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              style={{
                ...typography.label,
                padding: `${spacing.xxs}px ${spacing.xs}px`,
                borderRadius: radius.sm,
                border: `1px solid ${btn.active ? colors.ink : colors.rule}`,
                background: btn.active ? colors.ink : colors.bg,
                color: btn.active ? colors.bg : colors.ink2,
                cursor: "pointer",
                transition: transitions.fast,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {/* Tuner Panel */}
        {showTuner && (
          <div
            style={{
              position: "absolute",
              top: 32,
              right: spacing.xs,
              zIndex: 10,
              background: colors.bg,
              border: `1px solid ${colors.ruleStrong}`,
              borderRadius: radius.md,
              padding: `${spacing.sm}px ${spacing.md}px`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: spacing.sm,
              minWidth: 220,
            }}
          >
            <div style={{ ...typography.caption, color: colors.ink, fontWeight: weights.medium, marginBottom: spacing.xxs }}>
              A* Pathfinder Tuning
            </div>
            {/* Smart Edge toggle */}
            <label style={{ ...typography.label, color: colors.ink2, display: "flex", alignItems: "center", gap: spacing.xs, cursor: "pointer" }}>
              <input type="checkbox" checked={tuner.useSmartEdge}
                onChange={(e) => setTuner((t) => ({ ...t, useSmartEdge: e.target.checked }))}
              />
              A* Pathfinding {tuner.useSmartEdge ? "ON" : "OFF"}
            </label>
            {/* Node Padding */}
            <label style={{ ...typography.label, color: tuner.useSmartEdge ? colors.ink2 : colors.ink3, display: "flex", flexDirection: "column", gap: spacing.xxs }}>
              Node Padding: {tuner.nodePadding}px
              <input type="range" min={0} max={40} value={tuner.nodePadding} disabled={!tuner.useSmartEdge}
                onChange={(e) => setTuner((t) => ({ ...t, nodePadding: +e.target.value }))}
                style={{ width: "100%" }}
              />
            </label>
            {/* Grid Ratio */}
            <label style={{ ...typography.label, color: tuner.useSmartEdge ? colors.ink2 : colors.ink3, display: "flex", flexDirection: "column", gap: spacing.xxs }}>
              Grid Ratio: {tuner.gridRatio} {tuner.gridRatio <= 3 ? "(fine — slow)" : tuner.gridRatio >= 15 ? "(coarse — fast)" : ""}
              <input type="range" min={2} max={20} value={tuner.gridRatio} disabled={!tuner.useSmartEdge}
                onChange={(e) => setTuner((t) => ({ ...t, gridRatio: +e.target.value }))}
                style={{ width: "100%" }}
              />
            </label>
            {/* Edge Spread */}
            <label style={{ ...typography.label, color: colors.ink2, display: "flex", flexDirection: "column", gap: spacing.xxs }}>
              Edge Spread: {tuner.edgeSpread}px {tuner.edgeSpread === 0 ? "(off)" : ""}
              <input type="range" min={0} max={20} value={tuner.edgeSpread}
                onChange={(e) => setTuner((t) => ({ ...t, edgeSpread: +e.target.value }))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={EDGES}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0 }}
          minZoom={0.1}
          maxZoom={10}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          style={{ background: colors.bg }}
        >
          <Background color={`${colors.ink}10`} gap={spacing.md} />
        </ReactFlow>
      </div>
    </TunerContext.Provider>
    </ActiveHandlesContext.Provider>
    </NodesContext.Provider>
    </HoverContext.Provider>
  );
}

export function PipelineFlow({ onNodeClick, portalContainer }: { onNodeClick: (nodeId: string) => void; portalContainer?: React.RefObject<HTMLElement | null> }) {
  return (
    <ReactFlowProvider>
      <PipelineFlowInner onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
}
