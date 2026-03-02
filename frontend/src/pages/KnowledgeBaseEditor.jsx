import React, { useMemo, useState } from "react";
import apiClient from "../api/client";
import { hasMinLength, isBlank } from "../utils/validation";

const createEmptyForm = () => ({
  title: "",
  summary: "",
  content: "",
  category: "",
  status: "draft",
});

const KnowledgeBaseEditor = () => {
  const [form, setForm] = useState(createEmptyForm());
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return Boolean(
      form.title.trim() ||
      form.summary.trim() ||
      form.content.trim() ||
      form.category.trim() ||
      tags.length > 0 ||
      form.status !== "draft",
    );
  }, [form, tags.length]);

  const addTag = (rawTag) => {
    const nextTag = String(rawTag || "").trim().toLowerCase();
    if (!nextTag) return;
    if (tags.includes(nextTag)) return;
    setTags((prev) => [...prev, nextTag]);
  };

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (event.key === "Backspace" && !tagInput && tags.length > 0) {
      event.preventDefault();
      const last = tags[tags.length - 1];
      removeTag(last);
    }
  };

  const handleTagBlur = () => {
    if (!tagInput.trim()) return;
    addTag(tagInput);
    setTagInput("");
  };

  const validate = ({ title, category, content }) => {
    if (!hasMinLength(title, 5)) return "Title must be at least 5 characters.";
    if (isBlank(category) || !hasMinLength(category, 2)) return "Category must be at least 2 characters.";
    if (!hasMinLength(content, 20)) return "Content must be at least 20 characters.";
    return "";
  };

  const handleSubmitWithStatus = async (status) => {
    setMessage("");
    setError("");
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        status,
        tags: tags.join(", "),
      };
      const res = await apiClient.post("/kb/articles", payload);
      if (res.data.status === "success") {
        setMessage(status === "published" ? "Article published." : "Draft saved.");
        setForm(createEmptyForm());
        setTags([]);
        setTagInput("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create article");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>KB Editor</h2>
          <p>Create or update knowledge base articles.</p>
          <p className="muted">
            Keep titles short and searchable. Use tags for common keywords.
            Draft stays internal, Published is visible to all users.
          </p>
        </div>
      </div>

      {message && <div className="panel success">{message}</div>}
      {error && <div className="panel error">{error}</div>}

      <div className="kb-editor-workspace">
        <form className="kb-editor-column" onSubmit={(e) => e.preventDefault()}>
          <div className="section-card">
            <div className="section-header">
              <h3>Article Basics</h3>
              <p className="muted">Short, clear title and a searchable category.</p>
            </div>
            <label className="field">
              <span>Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Example: Reset email password"
              />
            </label>
            <label className="field">
              <span>Category</span>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Example: Access Request"
              />
            </label>
            <label className="field">
              <span>Summary</span>
              <textarea
                rows={3}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Short summary shown in article cards and search results."
              />
            </label>
            <label className="field">
              <span>
                Tags
                <span className="info-tip" title="Press Enter or comma to add keyword chips.">
                  i
                </span>
              </span>
              <div className="tag-chip-input">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                      x
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={handleTagBlur}
                  placeholder={tags.length ? "Add another tag" : "vpn, password, onboarding"}
                />
              </div>
            </label>
          </div>

          <div className="section-card full">
            <div className="section-header">
              <h3>Step-by-Step Content</h3>
              <p className="muted">Include prerequisites and expected results.</p>
            </div>
            <label className="field full">
              <span>Content</span>
              <textarea
                rows={12}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Step-by-step instructions, prerequisites, and expected result."
              />
            </label>
          </div>
        </form>

        <aside className="kb-preview-column">
          <div className="section-card kb-live-preview">
            <div className="section-header">
              <h3>Live Preview</h3>
              <p className="muted">What end users will see.</p>
            </div>
            <div className="kb-preview-head">
              <h4>{form.title.trim() || "Untitled article"}</h4>
              <p className="muted">{form.category.trim() || "Uncategorized"}</p>
              {form.summary.trim() && (
                <p className="kb-preview-summary">{form.summary.trim()}</p>
              )}
              {tags.length > 0 && (
                <div className="kb-preview-tags">
                  {tags.map((tag) => (
                    <span key={`preview-${tag}`}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="kb-preview-body">
              {form.content.trim() ? (
                <p>{form.content}</p>
              ) : (
                <p className="muted">Start typing content to see a preview.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="kb-sticky-actions">
        <div className="kb-sticky-meta">
          <span>{hasChanges ? "Unsaved changes" : "No changes yet"}</span>
        </div>
        <div className="kb-sticky-buttons">
          <button
            type="button"
            className="btn ghost"
            onClick={() => handleSubmitWithStatus("draft")}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => handleSubmitWithStatus("published")}
            disabled={saving}
          >
            {saving ? "Publishing..." : "Publish Article"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseEditor;
