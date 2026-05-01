import { useState } from "react";
import { supabase } from "../supabaseClient";

function calcHours(start, end, lunch) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return 0;
  return Math.max(0, (endMin - startMin - (lunch || 0)) / 60);
}

function toMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function checkOverlaps(blocks) {
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const aStart = toMinutes(blocks[i].start_time);
      const aEnd = toMinutes(blocks[i].end_time);
      const bStart = toMinutes(blocks[j].start_time);
      const bEnd = toMinutes(blocks[j].end_time);
      if (aStart < bEnd && bStart < aEnd) {
        return `El Bloque ${i + 1} (${blocks[i].start_time}–${blocks[i].end_time}) se solapa con el Bloque ${j + 1} (${blocks[j].start_time}–${blocks[j].end_time}).`;
      }
    }
  }
  return null;
}

function TimeInput({ label, value, onChange }) {
  return (
    <div style={s.timeField}>
      <label style={s.label}>{label}</label>
      <input
        type="time"
        style={s.timeInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function EntryBlock({ block, index, projects, onChange, onRemove, canRemove }) {
  const hours = calcHours(block.start_time, block.end_time, block.lunch_minutes);

  return (
    <div style={s.entryBlock}>
      <div style={s.entryBlockHeader}>
        <span style={s.entryBlockTitle}>Bloque {index + 1}</span>
        {canRemove && (
          <button style={s.removeBlockBtn} onClick={onRemove}>✕ Eliminar</button>
        )}
      </div>

      <div style={s.timeRow}>
        <TimeInput label="Entrada" value={block.start_time} onChange={(v) => onChange("start_time", v)} />
        <TimeInput label="Salida" value={block.end_time} onChange={(v) => onChange("end_time", v)} />
      </div>

      <div style={s.lunchRow}>
        <label style={s.label}>Almuerzo</label>
        <div style={s.lunchBtns}>
          {[0, 30, 60].map((min) => (
            <button
              key={min}
              style={{
                ...s.lunchBtn,
                background: block.lunch_minutes === min ? "#2563eb" : "#f3f4f6",
                color: block.lunch_minutes === min ? "#fff" : "#374151",
              }}
              onClick={() => onChange("lunch_minutes", min)}
            >
              {min === 0 ? "Sin almuerzo" : `${min} min`}
            </button>
          ))}
        </div>
      </div>

      <div style={s.projectField}>
        <label style={s.label}>Proyecto</label>
        <select
          style={s.select}
          value={block.project_id}
          onChange={(e) => onChange("project_id", e.target.value)}
        >
          <option value="">— Sin proyecto —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number ? `${p.number} · ` : ""}{p.name}
            </option>
          ))}
        </select>
      </div>

      {hours > 0 && (
        <div style={s.hoursPreview}>
          ⏱ {hours.toFixed(2)} horas netas
        </div>
      )}
    </div>
  );
}

export default function DayEntryModal({ employee, date, dayIndex, existingEntries, sheetId, projects, onClose, onSaved, onError }) {
  const isSunday = dayIndex === 6;

  const [blocks, setBlocks] = useState(() => {
    if (existingEntries && existingEntries.length > 0) {
      return existingEntries.map((e) => ({
        id: e.id,
        start_time: e.start_time || "",
        end_time: e.end_time || "",
        lunch_minutes: e.lunch_minutes ?? 30,
        project_id: e.project_id || "",
      }));
    }
    return [{ id: null, start_time: "07:00", end_time: "15:30", lunch_minutes: 30, project_id: "" }];
  });

  const [saving, setSaving] = useState(false);

  function updateBlock(index, field, value) {
    setBlocks((prev) => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  }

  function addBlock() {
    const last = blocks[blocks.length - 1];
    setBlocks((prev) => [...prev, {
      id: null,
      start_time: last?.end_time || "13:00",
      end_time: "17:00",
      lunch_minutes: 0,
      project_id: last?.project_id || "",
    }]);
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  const totalHours = blocks.reduce((sum, b) => sum + calcHours(b.start_time, b.end_time, b.lunch_minutes), 0);

  async function handleSave() {
    // Validate individual blocks
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.start_time || !b.end_time) { onError(`Bloque ${i + 1}: entrada y salida son requeridas.`); return; }
      const h = calcHours(b.start_time, b.end_time, b.lunch_minutes);
      if (h <= 0) { onError(`Bloque ${i + 1}: la salida debe ser después de la entrada.`); return; }
    }

    // ✅ Validate overlaps between blocks
    if (blocks.length > 1) {
      const overlapError = checkOverlaps(blocks);
      if (overlapError) { onError(overlapError); return; }
    }

    setSaving(true);

    const existingIds = existingEntries.map((e) => e.id).filter(Boolean);
    if (existingIds.length > 0) {
      await supabase.from("time_entries").delete().in("id", existingIds);
    }

    const toInsert = blocks.map((b) => ({
      sheet_id: sheetId,
      employee_id: employee.id,
      work_date: date,
      start_time: b.start_time,
      end_time: b.end_time,
      lunch_minutes: b.lunch_minutes,
      project_id: b.project_id || null,
    }));

    const { error } = await supabase.from("time_entries").insert(toInsert);
    setSaving(false);
    if (error) { onError("Error al guardar: " + error.message); return; }
    onSaved();
  }

  async function handleClear() {
    if (existingEntries.length === 0) { onClose(); return; }
    setSaving(true);
    const ids = existingEntries.map((e) => e.id).filter(Boolean);
    if (ids.length > 0) await supabase.from("time_entries").delete().in("id", ids);
    setSaving(false);
    onSaved();
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("es-PR", {
    weekday: "long", month: "long", day: "numeric"
  });

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <h3 style={s.modalTitle}>{employee.full_name}</h3>
            <p style={s.modalDate}>
              {dateLabel}
              {isSunday && <span style={s.sundayTag}> · OT×2</span>}
            </p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.blocksContainer}>
          {blocks.map((block, i) => (
            <EntryBlock
              key={i}
              block={block}
              index={i}
              projects={projects}
              onChange={(field, value) => updateBlock(i, field, value)}
              onRemove={() => removeBlock(i)}
              canRemove={blocks.length > 1}
            />
          ))}
        </div>

        <button style={s.addBlockBtn} onClick={addBlock}>
          + Agregar bloque de horas
        </button>

        {totalHours > 0 && (
          <div style={s.totalRow}>
            <span style={s.totalLabel}>Total del día:</span>
            <span style={s.totalHours}>{totalHours.toFixed(2)} horas</span>
            {isSunday && <span style={s.sundayNote}>(todas OT×2)</span>}
          </div>
        )}

        <button
          style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>

        {existingEntries.length > 0 && (
          <button style={s.clearBtn} onClick={handleClear} disabled={saving}>
            🗑 Borrar horas de este día
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  modalTitle: { fontSize: "17px", fontWeight: "600", color: "#111827", margin: "0 0 2px 0" },
  modalDate: { fontSize: "13px", color: "#6b7280", margin: 0, textTransform: "capitalize" },
  sundayTag: { color: "#dc2626", fontWeight: "600" },
  closeBtn: { background: "none", border: "none", fontSize: "20px", color: "#6b7280", cursor: "pointer", padding: "4px" },
  blocksContainer: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" },
  entryBlock: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" },
  entryBlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  entryBlockTitle: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  removeBlockBtn: { fontSize: "12px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" },
  timeRow: { display: "flex", gap: "10px", marginBottom: "12px" },
  timeField: { flex: 1 },
  label: { display: "block", fontSize: "11px", fontWeight: "500", color: "#6b7280", marginBottom: "4px" },
  timeInput: { width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fff" },
  lunchRow: { marginBottom: "12px" },
  lunchBtns: { display: "flex", gap: "6px", marginTop: "4px" },
  lunchBtn: { flex: 1, padding: "7px 4px", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  projectField: { marginBottom: "8px" },
  select: { width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", background: "#fff", outline: "none" },
  hoursPreview: { fontSize: "12px", color: "#16a34a", fontWeight: "500", textAlign: "right" },
  addBlockBtn: { width: "100%", padding: "11px", background: "#f0fdf4", color: "#16a34a", border: "1px dashed #86efac", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", marginBottom: "14px" },
  totalRow: { display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" },
  totalLabel: { fontSize: "13px", color: "#374151", flex: 1 },
  totalHours: { fontSize: "16px", fontWeight: "700", color: "#16a34a" },
  sundayNote: { fontSize: "11px", color: "#dc2626", fontWeight: "500" },
  saveBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginBottom: "10px" },
  clearBtn: { width: "100%", padding: "11px", background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "10px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" },
};