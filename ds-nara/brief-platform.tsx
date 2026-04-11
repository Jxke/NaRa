"use client";

import { useState } from "react";
import {
  colors,
  weights,
  spacing,
  borders,
  typography,
} from "./tokens";
import {
  H2,
  H3,
  Body,
  Card,
  Label,
  SectionHeader,
  Rule,
  FilterPills,
  StatusBadge,
  MiniStat,
  Collapsible,
  GaugeBar,
  TensionGrid,
  StatusDots,
  KeyValueTable,
  RuledTable,
} from "./components";

import { mod } from "./brief-tokens";
import { FlowArrow, NodeBox, Chip } from "./brief-shared";
import { BriefSidebar, useSidebarObserver } from "./brief-nav";

const SIDEBAR_SECTIONS = [
  { id: "app-screens", label: "App Screens", color: mod.companion },
  { id: "social", label: "Social Exchange", color: mod.companion },
  { id: "encryption", label: "Encryption", color: mod.privacy },
  { id: "shredding", label: "Crypto-Shredding", color: mod.privacy },
  { id: "gdpr", label: "GDPR Rights", color: mod.privacy },
  { id: "bystander", label: "Bystander Consent", color: mod.privacy },
  { id: "bom", label: "Hardware BOM", color: mod.hardware },
  { id: "power", label: "Power Budget", color: mod.hardware },
  { id: "freertos", label: "FreeRTOS Tasks", color: mod.hardware },
  { id: "flash", label: "Flash Layout", color: mod.hardware },
];

const bomItems = [
  { label: "ESP32-S3-N32R16V", sub: "Dual-core 240MHz, 32MB Flash, 16MB PSRAM", color: mod.hardware, chips: ["Core 0: Audio", "Core 1: Network"], cat: "MCU" },
  { label: "INMP441", sub: "I2S MEMS Microphone", color: mod.audio, chips: ["16-bit PCM", "2mA"], cat: "Sensors" },
  { label: "MPU-6050", sub: "6DoF IMU (I2C 0x68)", color: mod.hardware, chips: ["Accel + Gyro", "3.5mA"], cat: "Sensors" },
  { label: "E-Ink Display", sub: "200x200 SPI", color: mod.consult, chips: ["1-bit", "0mA hold"], cat: "I/O" },
  { label: "DRV2605L + Motor", sub: "Haptic (I2C 0x5A)", color: mod.hardware, chips: ["80mA burst", "0.6mA idle"], cat: "I/O" },
  { label: "BQ25185 PMIC", sub: "USB-C charging", color: mod.compress, chips: ["85% eff.", "CC/CV"], cat: "Power" },
  { label: "LiPo 1000mAh", sub: "3.7V nominal", color: mod.compress, chips: ["~8h idle", "JST"], cat: "Power" },
  { label: "Button + Pot", sub: "GPIO 2 + ADC GPIO 8", color: mod.hardware, chips: ["Interrupt", "5 zones"], cat: "I/O" },
];

const freertosData = [
  { task: "audio_capture", core: "0", priority: "6", role: "I2S DMA \u2192 ring buffer" },
  { task: "vad_engine", core: "0", priority: "5", role: "ESP-SR WakeNet VAD" },
  { task: "imu_reader", core: "0", priority: "3", role: "25Hz MPU-6050 poll" },
  { task: "opus_encoder", core: "1", priority: "5", role: "20ms Opus frames" },
  { task: "wifi_streamer", core: "1", priority: "4", role: "WebSocket TX" },
  { task: "storage_mgr", core: "1", priority: "3", role: "LittleFS writes" },
];

const flashPartitions = [
  { name: "nvs_encrypted", size: "64KB", pct: 0.2, color: mod.privacy, desc: "WiFi creds, device keys" },
  { name: "ota_0 + ota_1", size: "8MB", pct: 25, color: mod.hardware, desc: "Dual firmware slots" },
  { name: "tier_store", size: "12MB", pct: 37.5, color: mod.compress, desc: "Tiers 1-4, offline buffer" },
  { name: "glyph_store", size: "256KB", pct: 0.8, color: mod.glyph, desc: "22 glyphs + metadata" },
  { name: "unallocated", size: "~11.5MB", pct: 36, color: colors.ink3, desc: "Future headroom" },
];

export default function BriefPlatform() {
  const activeSection = useSidebarObserver(SIDEBAR_SECTIONS.map(s => s.id));
  const [bomFilter, setBomFilter] = useState<string | null>(null);

  const filtered = !bomFilter ? bomItems : bomItems.filter((b) => b.cat === bomFilter);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: spacing.lg }}>
      <BriefSidebar sections={SIDEBAR_SECTIONS} activeSection={activeSection} />
      <div style={{ maxWidth: 760, padding: `${spacing.lg}px 0` }}>

        {/* ── Module 6: Companion App & Social Exchange ──────────────── */}
        <SectionHeader label="Module 06" color={mod.companion} />
        <H2 style={{ color: mod.companion }}>Companion App & Social Exchange</H2>

        <Body style={{ marginBottom: spacing.lg }}>
          A React Native (Expo) app communicating exclusively over BLE. Configuration surface, read-only tier viewer, and social exchange manager. Critically, the app does not display the glyph inventory — glyphs are a device-only experience.
        </Body>

        <section id="app-screens">
          <H3 style={{ color: mod.companion }}>App Screens</H3>
          <Collapsible title="WiFi Provisioning" defaultOpen={false}>
            <Body style={{ padding: `${spacing.xs}px ${spacing.md}px` }}>
              SRP6a + X25519 key agreement encrypts credentials over BLE. Stored in eFuse-protected NVS.
            </Body>
          </Collapsible>
          <Collapsible title="Device Status" defaultOpen={false}>
            <div style={{ padding: `${spacing.xs}px ${spacing.md}px` }}>
              <Body>Live dashboard: battery, WiFi signal, pipeline state, per-tier storage, last sync.</Body>
              <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.sm }}>
                <MiniStat label="Battery" value="78%" />
                <MiniStat label="WiFi" value="-42dBm" />
              </div>
            </div>
          </Collapsible>
          <Collapsible title="Tier Viewer" defaultOpen={false}>
            <Body style={{ padding: `${spacing.xs}px ${spacing.md}px` }}>
              Read-only access to Tier 2-4 summaries in a timeline view. Data held in app memory only during viewing.
            </Body>
          </Collapsible>
          <Collapsible title="Privacy Controls" defaultOpen={false}>
            <Body style={{ padding: `${spacing.xs}px ${spacing.md}px` }}>
              Toggle mic, set quiet hours, configure retention, trigger crypto-shredding, request data export (GDPR Art. 20), invoke right to erasure (Art. 17).
            </Body>
          </Collapsible>
          <Collapsible title="Consent Settings" defaultOpen={false}>
            <div style={{ padding: `${spacing.xs}px ${spacing.md}px` }}>
              <Body>Per-category opt-in: audio, environmental, emotional, biometric/voiceprint, social. Defaults to all disabled.</Body>
              <div style={{ marginTop: spacing.sm }}>
                <StatusBadge tone="amber" label="Default: All Disabled" />
              </div>
            </div>
          </Collapsible>
          <Collapsible title="OTA Updates" defaultOpen={false}>
            <Body style={{ padding: `${spacing.xs}px ${spacing.md}px` }}>
              Ed25519-signed firmware. Dual A/B OTA slots with automatic rollback. Delivered over WiFi, not BLE.
            </Body>
          </Collapsible>
        </section>

        <section id="social" style={{ marginTop: spacing.xl }}>
          <H3 style={{ color: mod.companion }}>Social Exchange</H3>
          <Card style={{ marginBottom: spacing.md }}>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
              <StatusDots total={3} active={new Set([0])} />
              <Label style={{ marginBottom: 0 }}>Level 0</Label>
              <Body style={{ flex: 1 }}>Presence only</Body>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
              <StatusDots total={3} active={new Set([0, 1])} />
              <Label style={{ marginBottom: 0 }}>Level 1</Label>
              <Body style={{ flex: 1 }}>Presence + environment</Body>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <StatusDots total={3} active={new Set([0, 1, 2])} />
              <Label style={{ marginBottom: 0 }}>Level 2</Label>
              <Body style={{ flex: 1 }}>Presence + environment + topics + emotional valence</Body>
            </div>
          </Card>
          <Body style={{ marginBottom: spacing.md }}>
            Mutual-minimum model: data flows at the lower of two agreed levels. Neither party can unilaterally escalate.
          </Body>

          <H3 style={{ marginTop: spacing.lg }}>Pairing Ceremony</H3>
          <Card>
            <Body>
              BLE discovery → simultaneous button press within 5s → X25519 key exchange → Ed25519 public key stored. Prevents accidental pairing.
            </Body>
          </Card>
          <div style={{ marginTop: spacing.md }}>
            <TensionGrid
              left={{ label: "Device A", text: "Stores B's public key, enforces mutual minimum" }}
              right={{ label: "Device B", text: "Stores A's public key, enforces mutual minimum" }}
              leftVariant="help"
              rightVariant="help"
            />
          </div>
        </section>

        <div style={{ margin: `${spacing.xl}px 0` }}><Rule /></div>

        {/* ── Module 7: Privacy & Data Lifecycle ────────────────────── */}
        <SectionHeader label="Module 07" color={mod.privacy} />
        <H2 style={{ color: mod.privacy }}>Privacy & Data Lifecycle</H2>

        <Body style={{ marginBottom: spacing.lg }}>
          Privacy is not a feature bolted on — it is embedded in the hardware (hardwired LED), the cryptography (per-tier AES-256-GCM with eFuse keys), and the data lifecycle (crypto-shredding for instant, irreversible deletion).
        </Body>

        <section id="encryption">
          <H3 style={{ color: mod.privacy }}>Encryption Architecture</H3>
          <KeyValueTable
            monoValues
            rows={[
              { label: "Algorithm", value: "AES-256-GCM" },
              { label: "Key Storage", value: "eFuse-protected NVS (AES-XTS)" },
              { label: "TLS", value: "1.3 only with cert pinning" },
            ]}
            style={{ marginBottom: spacing.md }}
          />
          <Card style={{ marginBottom: spacing.sm }}>
            <Body>Each tier has its own encryption key. The glyph store uses a separate key. Independent crypto-shredding per partition.</Body>
          </Card>
          <StatusBadge tone="help" label="Hardware Root of Trust" />
        </section>

        <section id="shredding" style={{ marginTop: spacing.xl }}>
          <H3 style={{ color: mod.privacy }}>Crypto-Shredding</H3>
          <Body style={{ marginBottom: spacing.md }}>
            Destroy the key, destroy the data. No need to erase flash blocks — encrypted data without a key is indistinguishable from random noise.
          </Body>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: spacing.xxs, marginBottom: spacing.md }}>
            <NodeBox label="App sends command" color={mod.privacy} />
            <FlowArrow direction="right" color={mod.privacy} />
            <NodeBox label="Cloud deletes backups + KEK" color={mod.privacy} />
            <FlowArrow direction="right" color={mod.privacy} />
            <NodeBox label="Device destroys tier key" color={mod.privacy} />
            <FlowArrow direction="right" color={mod.privacy} />
            <NodeBox label="DeletionAttestation signed" color={mod.privacy} />
          </div>
          <StatusBadge tone="harm" label="Irreversible by Design" />
        </section>

        <section id="gdpr" style={{ marginTop: spacing.xl }}>
          <H3 style={{ color: mod.privacy }}>GDPR Rights</H3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.sm }}>
            <Card>
              <Label color={mod.privacy}>Art. 17 — Right to Erasure</Label>
              <Body style={{ marginBottom: spacing.sm }}>Full cascade: cloud + device crypto-shredding + glyph store. Signed DeletionAttestation as proof.</Body>
              <StatusBadge tone="help" label="Implemented" />
            </Card>
            <Card>
              <Label color={mod.privacy}>Art. 20 — Data Portability</Label>
              <Body style={{ marginBottom: spacing.sm }}>JSON + PDF export via 48-hour download link. Includes themes, emotions, topics, consultation history, glyph metadata.</Body>
              <StatusBadge tone="help" label="Implemented" />
            </Card>
            <Card>
              <Label color={mod.privacy}>Art. 9 — Biometric Consent</Label>
              <Body style={{ marginBottom: spacing.sm }}>Separate explicit opt-in for voiceprint processing. Voiceprints are ephemeral — container memory only, never persisted.</Body>
              <StatusBadge tone="help" label="Implemented" />
            </Card>
          </div>
        </section>

        <section id="bystander" style={{ marginTop: spacing.xl }}>
          <H3 style={{ color: mod.privacy }}>Bystander Consent</H3>
          <TensionGrid
            left={{ label: "Recording Indicator", text: "LED hardwired to mic power rail. Circuit-level guarantee — no firmware bug can disable it." }}
            right={{ label: "Audible Notification", text: "No speaker in v1 BOM. Piezo buzzer planned for PCB v2." }}
            leftVariant="help"
            rightVariant="harm"
          />
          <div style={{ marginTop: spacing.md }}>
            <StatusBadge tone="amber" label="Audible Notification Deferred to v2" />
          </div>
        </section>

        <div style={{ margin: `${spacing.xl}px 0` }}><Rule /></div>

        {/* ── Module 8: Hardware Platform ────────────────────────────── */}
        <SectionHeader label="Module 08" color={mod.hardware} />
        <H2 style={{ color: mod.hardware }}>Hardware Platform</H2>

        <Body style={{ marginBottom: spacing.lg }}>
          Built around an ESP32-S3-N32R16V with 32MB flash and 16MB PSRAM. The BOM is locked for v1.
        </Body>

        <section id="bom">
          <H3 style={{ color: mod.hardware }}>Hardware BOM</H3>
          <FilterPills
            options={["All", "MCU", "Sensors", "Power", "I/O"]}
            value={bomFilter}
            onChange={setBomFilter}
            allLabel="All"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.lg }}>
            {filtered.map((item) => (
              <Card key={item.label} style={{ borderLeft: `3px solid ${item.color}` }}>
                <Label style={{ color: item.color }}>{item.label}</Label>
                <Body style={{ marginBottom: spacing.xs }}>{item.sub}</Body>
                <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
                  {item.chips.map((c) => <Chip key={c} color={item.color}>{c}</Chip>)}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="power">
          <H3 style={{ color: mod.hardware }}>Power Budget</H3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md, marginBottom: spacing.lg }}>
            <Card>
              <Label color={colors.help}>Idle (WiFi off)</Label>
              <MiniStat label="Current" value="~80mA" valueColor={colors.help} />
              <GaugeBar value={44} color={colors.help} style={{ marginTop: spacing.xs }} />
            </Card>
            <Card>
              <Label color={mod.hardware}>Active (streaming)</Label>
              <MiniStat label="Current" value="~180mA" valueColor={mod.hardware} />
              <GaugeBar value={100} color={mod.hardware} style={{ marginTop: spacing.xs }} />
            </Card>
          </div>
        </section>

        <section id="freertos">
          <H3 style={{ color: mod.hardware }}>FreeRTOS Task Layout</H3>
          <RuledTable
            columns={[
              { key: "task", header: "Task" },
              { key: "core", header: "Core" },
              { key: "priority", header: "Priority" },
              { key: "role", header: "Role" },
            ]}
            data={freertosData}
            size="sm"
            style={{ marginBottom: spacing.lg }}
          />
        </section>

        <section id="flash">
          <H3 style={{ color: mod.hardware }}>Flash Layout (32MB)</H3>
          <div style={{ marginBottom: spacing.lg }}>
            {flashPartitions.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 60px 1fr 180px",
                  alignItems: "center",
                  padding: `${spacing.xxs}px 0`,
                  borderBottom: borders.rule,
                  ...typography.label,
                }}
              >
                <span style={{ color: p.color, fontWeight: weights.medium }}>{p.name}</span>
                <span style={{ color: colors.ink2, textAlign: "right", paddingRight: spacing.sm }}>{p.size}</span>
                <GaugeBar value={Math.max(p.pct, 1)} color={p.color} height={6} />
                <span style={{ ...typography.stat, color: colors.ink3, paddingLeft: spacing.sm }}>{p.desc}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
