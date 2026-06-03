import React, { FC, useState, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { styles } from "../../constants";
import { ICONS } from "../../pages/AuthPage";
import { supabase } from "../../supabase";
import { ConsultationWithLabs } from "../../types";

interface ConsultationFormModalProps {
  consultation: ConsultationWithLabs | null;
  personId: string;
  onClose: () => void;
  onSave: () => void;
  zIndex?: number;
}

const ConsultationFormModal: FC<ConsultationFormModalProps> = ({
  consultation,
  personId,
  onClose,
  onSave,
  zIndex = 1100,
}) => {
  const modalRoot = document.getElementById("modal-root");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    consultation_date: new Date().toISOString().slice(0, 16),
    weight_kg: "",
    height_cm: "",
    ta: "",
    notes: "",
  });

  useEffect(() => {
    if (consultation) {
      setFormData({
        consultation_date: new Date(consultation.consultation_date)
          .toISOString()
          .slice(0, 16),
        weight_kg: consultation.weight_kg?.toString() || "",
        height_cm: consultation.height_cm?.toString() || "",
        ta: consultation.ta || "",
        notes: consultation.notes || "",
      });
    }
  }, [consultation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if weight/height changes IMC
      let imc = null;
      if (formData.weight_kg && formData.height_cm) {
        const w = parseFloat(formData.weight_kg);
        const h = parseFloat(formData.height_cm) / 100;
        if (!isNaN(w) && !isNaN(h) && h > 0) {
          imc = parseFloat((w / (h * h)).toFixed(2));
        }
      }

      const payload: any = {
        person_id: personId,
        consultation_date: new Date(formData.consultation_date).toISOString(),
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        ta: formData.ta || null,
        notes: formData.notes || null,
        imc: imc,
      };

      if (consultation) {
        const { error: err } = await supabase
          .from("consultations")
          .update(payload)
          .eq("id", consultation.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("consultations")
          .insert(payload);
        if (err) throw err;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || "Error al guardar la consulta");
    } finally {
      setLoading(false);
    }
  };

  if (!modalRoot) return null;

  const content = (
    <div style={{ ...styles.modalOverlay, zIndex }}>
      <form
        onSubmit={handleSubmit}
        style={{ ...styles.modalContent, maxWidth: "500px" }}
        className="fade-in"
      >
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {consultation ? "Editar Consulta" : "Nueva Consulta"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ ...styles.iconButton, border: "none" }}
          >
            {ICONS.close}
          </button>
        </div>

        <div style={styles.modalBody}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Fecha y Hora de Consulta *</label>
          <input
            type="datetime-local"
            required
            style={styles.input}
            value={formData.consultation_date}
            onChange={(e) =>
              setFormData({ ...formData, consultation_date: e.target.value })
            }
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label style={styles.label}>Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                style={styles.input}
                value={formData.weight_kg}
                onChange={(e) =>
                  setFormData({ ...formData, weight_kg: e.target.value })
                }
              />
            </div>
            <div>
              <label style={styles.label}>Altura (cm)</label>
              <input
                type="number"
                step="any"
                style={styles.input}
                value={formData.height_cm}
                onChange={(e) =>
                  setFormData({ ...formData, height_cm: e.target.value })
                }
              />
            </div>
          </div>

          <label style={styles.label}>Tensión Arterial (ej. 120/80)</label>
          <input
            type="text"
            style={styles.input}
            value={formData.ta}
            onChange={(e) => setFormData({ ...formData, ta: e.target.value })}
            placeholder="120/80"
          />

          <label style={styles.label}>Notas adicionales</label>
          <textarea
            rows={4}
            style={styles.input}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </div>

        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className="button-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? "Guardando..." : "Guardar Consulta"}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(content, modalRoot);
};

export default ConsultationFormModal;
