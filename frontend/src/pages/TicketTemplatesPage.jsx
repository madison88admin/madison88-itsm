import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { hasMaxLength, hasMinLength, isBlank } from "../utils/validation";

const categories = [
  "Hardware",
  "Software",
  "Access Request",
  "Account Creation",
  "Network",
  "Other",
];

const priorities = ["P1", "P2", "P3", "P4"];

const TicketTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    description: "",
    business_impact: "",
    category: "",
    priority: "P3",
    is_active: true,
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_id === selectedId),
    [templates, selectedId],
  );

  const loadTemplates = async () => {
    setError("");
    try {
      const res = await apiClient.get("/ticket-templates");
      setTemplates(res.data.data.templates || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load templates");
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    setForm({
      name: selectedTemplate.name || "",
      title: selectedTemplate.title || "",
      description: selectedTemplate.description || "",
      business_impact: selectedTemplate.business_impact || "",
      category: selectedTemplate.category || "",
      priority: selectedTemplate.priority || "P3",
      is_active: selectedTemplate.is_active !== false,
    });
  }, [selectedTemplate]);

  const resetForm = () => {
    setSelectedId("");
    setForm({
      name: "",
      title: "",
      description: "",
      business_impact: "",
      category: "",
      priority: "P3",
      is_active: true,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasMinLength(form.name, 3)) {
      setError("Name must be at least 3 characters.");
      return;
    }
    if (!hasMaxLength(form.name, 120)) {
      setError("Name must be 120 characters or less.");
      return;
    }
    if (!hasMinLength(form.title, 5)) {
      setError("Title must be at least 5 characters.");
      return;
    }
    if (!hasMaxLength(form.title, 255)) {
      setError("Title must be 255 characters or less.");
      return;
    }
    if (isBlank(form.category)) {
      setError("Category is required.");
      return;
    }
    if (!hasMinLength(form.description, 10)) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (!hasMinLength(form.business_impact, 10)) {
      setError("Business impact must be at least 10 characters.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (selectedId) {
        await apiClient.patch(`/ticket-templates/${selectedId}`, form);
        setMessage("Template updated.");
      } else {
        await apiClient.post("/ticket-templates", form);
        setMessage("Template created.");
      }
      resetForm();
      loadTemplates();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-stack">
      {error && <div className="panel error">{error}</div>}
      {message && <div className="panel success">{message}</div>}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Ticket Templates</h2>
            <p>Create reusable templates for common requests.</p>
          </div>
        </div>
        <div className="template-grid">
          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.template_id}
                className={`template-card ${
                  selectedId === template.template_id ? "active" : ""
                }`}
                onClick={() => setSelectedId(template.template_id)}
              >
                <div>
                  <strong>{template.name}</strong>
                  <span>{template.category}</span>
                </div>
                <div className="template-meta">
                  <span>{template.priority}</span>
                  <span>{template.is_active ? "Active" : "Inactive"}</span>
                </div>
              </button>
            ))}
            {templates.length === 0 && (
              <div className="empty-state">No templates yet.</div>
            )}
          </div>
          <form className="template-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Onboarding laptop"
                required
              />
            </label>
            <label className="field">
              <span>Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Laptop setup request"
                required
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                required
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full">
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </label>
            <label className="field full">
              <span>Business Impact</span>
              <textarea
                rows={3}
                value={form.business_impact}
                onChange={(e) =>
                  setForm({ ...form, business_impact: e.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "active" })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : selectedId
                    ? "Update Template"
                    : "Create Template"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={resetForm}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TicketTemplatesPage;
