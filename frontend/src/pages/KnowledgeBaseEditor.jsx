import React, { useState } from "react";
import apiClient from "../api/client";

const KnowledgeBaseEditor = () => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    status: "draft",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const res = await apiClient.post("/kb/articles", form);
      if (res.data.status === "success") {
        setMessage("Article created.");
        setForm({
          title: "",
          content: "",
          category: "",
          tags: "",
          status: "draft",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create article");
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
      <form className="kb-editor" onSubmit={handleSubmit}>
        <div className="section-card">
          <div className="section-header">
            <h3>Article Basics</h3>
            <p className="muted">
              Short, clear title and a searchable category.
            </p>
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
            <span>
              Tags
              <span className="info-tip" title="Comma-separated keywords.">
                i
              </span>
            </span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="vpn, password, onboarding"
            />
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
              rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Step-by-step instructions, prerequisites, and expected result."
            />
          </label>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h3>Visibility</h3>
            <p className="muted">
              Draft stays internal. Published is user-facing.
            </p>
          </div>
          <label className="field">
            <span>
              Status
              <span className="info-tip" title="Draft is internal only.">
                i
              </span>
            </span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button className="btn primary" type="submit">
            Create Article
          </button>
        </div>
      </form>
    </div>
  );
};

export default KnowledgeBaseEditor;
