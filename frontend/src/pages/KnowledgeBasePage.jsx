import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { hasMinLength, isBlank } from "../utils/validation";

const PRODUCT_OPTIONS = ["all", "network", "email", "payroll", "erp", "hris"];
const ROLE_OPTIONS = ["all", "end_user", "it_agent", "it_manager", "system_admin"];
const LOCATION_OPTIONS = ["all", "philippines", "indonesia", "united_states"];
const LAST_UPDATED_OPTIONS = [
  { label: "Any time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

const KnowledgeBasePage = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchDebounceRef = useRef(null);

  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("published");
  const [compactMode, setCompactMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [lastUpdatedFilter, setLastUpdatedFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checklistState, setChecklistState] = useState({});
  const [editForm, setEditForm] = useState({
    title: "",
    summary: "",
    category: "",
    tags: "",
    status: "draft",
    content: "",
    change_summary: "",
  });

  const isPrivileged = useMemo(
    () => ["it_manager", "system_admin"].includes(user?.role),
    [user?.role],
  );

  const normalizeTags = (value) => {
    if (!value) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const extractCodeBlocks = (content) => {
    if (!content) return [];
    const blocks = [];
    const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    let match = regex.exec(content);
    while (match) {
      blocks.push({
        language: match[1] || "text",
        code: (match[2] || "").trim(),
      });
      match = regex.exec(content);
    }
    return blocks;
  };

  const extractChecklistItems = (content) => {
    if (!content) return [];
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s\[( |x|X)\]\s.+/.test(line))
      .map((line) => ({
        checked: /\[(x|X)\]/.test(line),
        text: line.replace(/^[-*]\s\[( |x|X)\]\s/, ""),
      }));
  };

  const buildKbParams = ({ includeQuery = true } = {}) => {
    const params = {};
    if (includeQuery && query.trim()) params.q = query.trim();
    if (isPrivileged && statusFilter !== "all") params.status = statusFilter;
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (productFilter !== "all") params.product = productFilter;
    if (roleFilter !== "all") params.role = roleFilter;
    if (locationFilter !== "all") params.location = locationFilter;
    if (lastUpdatedFilter !== "all") params.last_updated = lastUpdatedFilter;
    return params;
  };

  const fetchArticles = async ({ includeQuery = true } = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = buildKbParams({ includeQuery });
      if (params.q) {
        const res = await apiClient.get("/kb/search", { params });
        setArticles(res.data?.data?.results || []);
      } else {
        const res = await apiClient.get("/kb/articles", { params });
        setArticles(res.data?.data?.articles || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const loadArticle = async (articleId) => {
    setSelectedId(articleId);
    setDetailLoading(true);
    setDetailError("");
    setEditMode(false);
    try {
      const res = await apiClient.get(`/kb/articles/${articleId}`);
      const article = res.data.data.article;
      setSelectedArticle(article);
      setChecklistState({});
      setEditForm({
        title: article.title || "",
        summary: article.summary || "",
        category: article.category || "",
        tags: normalizeTags(article.tags),
        status: article.status || "draft",
        content: article.content || "",
        change_summary: "",
      });
    } catch (err) {
      setSelectedArticle(null);
      setDetailError(err.response?.data?.message || "Failed to load article");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedArticle) return;
    setSaving(true);
    setDetailError("");
    if (!hasMinLength(editForm.title, 5)) {
      setDetailError("Title must be at least 5 characters.");
      setSaving(false);
      return;
    }
    if (isBlank(editForm.category) || !hasMinLength(editForm.category, 2)) {
      setDetailError("Category must be at least 2 characters.");
      setSaving(false);
      return;
    }
    if (!hasMinLength(editForm.content, 20)) {
      setDetailError("Content must be at least 20 characters.");
      setSaving(false);
      return;
    }
    try {
      const payload = {
        title: editForm.title,
        summary: editForm.summary,
        category: editForm.category,
        tags: editForm.tags,
        status: editForm.status,
        content: editForm.content,
        change_summary: editForm.change_summary,
      };
      const res = await apiClient.patch(`/kb/articles/${selectedArticle.article_id}`, payload);
      setSelectedArticle(res.data.data.article);
      setEditMode(false);
      setEditForm((prev) => ({ ...prev, change_summary: "" }));
      await fetchArticles({ includeQuery: true });
    } catch (err) {
      setDetailError(err.response?.data?.message || "Failed to update article");
    } finally {
      setSaving(false);
    }
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (query.trim()) chips.push({ key: "query", label: `Search: ${query.trim()}` });
    if (isPrivileged && statusFilter !== "all") chips.push({ key: "status", label: `Status: ${statusFilter}` });
    if (categoryFilter !== "all") chips.push({ key: "category", label: `Category: ${categoryFilter}` });
    if (productFilter !== "all") chips.push({ key: "product", label: `Product: ${productFilter}` });
    if (roleFilter !== "all") chips.push({ key: "role", label: `Role: ${roleFilter}` });
    if (locationFilter !== "all") chips.push({ key: "location", label: `Location: ${locationFilter}` });
    if (lastUpdatedFilter !== "all") chips.push({ key: "lastUpdated", label: `Updated: ${lastUpdatedFilter}d` });
    return chips;
  }, [query, isPrivileged, statusFilter, categoryFilter, productFilter, roleFilter, locationFilter, lastUpdatedFilter]);

  const removeChip = (key) => {
    if (key === "query") setQuery("");
    if (key === "status") setStatusFilter("all");
    if (key === "category") setCategoryFilter("all");
    if (key === "product") setProductFilter("all");
    if (key === "role") setRoleFilter("all");
    if (key === "location") setLocationFilter("all");
    if (key === "lastUpdated") setLastUpdatedFilter("all");
  };

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value || "");
    } catch (err) {
      setDetailError("Copy failed. Check browser permission.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const q = params.get("q");

    if (q) {
      setQuery(q);
    }
    if (id) {
      loadArticle(id);
    }
  }, [location.search]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      fetchArticles({ includeQuery: true });
    }, 250);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [query, statusFilter, categoryFilter, productFilter, roleFilter, locationFilter, lastUpdatedFilter, isPrivileged]);

  const categoryOptions = useMemo(() => {
    const values = new Set();
    for (const article of articles) {
      if (article?.category) values.add(String(article.category).toLowerCase());
    }
    return ["all", ...Array.from(values)];
  }, [articles]);

  const codeBlocks = useMemo(() => extractCodeBlocks(selectedArticle?.content), [selectedArticle?.content]);
  const checklistItems = useMemo(
    () => extractChecklistItems(selectedArticle?.content),
    [selectedArticle?.content],
  );
  const checklistCompleted = checklistItems.filter((_, idx) => checklistState[idx]).length;
  const checklistProgress = checklistItems.length
    ? Math.round((checklistCompleted / checklistItems.length) * 100)
    : 0;

  return (
    <div className="panel" style={{ animation: "slideUp 0.6s cubic-bezier(0.2, 0, 0, 1) both" }}>
      <div className="panel-header">
        <div>
          <h2>Knowledge Base</h2>
          <p>Search SOPs, FAQs, and troubleshooting guides.</p>
        </div>
        <div className="kb-density-toggle" role="group" aria-label="Density mode">
          <button
            type="button"
            className={`btn ghost ${!compactMode ? "active" : ""}`}
            onClick={() => setCompactMode(false)}
          >
            Comfortable
          </button>
          <button
            type="button"
            className={`btn ghost ${compactMode ? "active" : ""}`}
            onClick={() => setCompactMode(true)}
          >
            Compact
          </button>
        </div>
      </div>

      <div className="kb-global-search-wrap">
        <input
          className="kb-global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the knowledge base instantly (ex: wifi, VPN, email)..."
        />
      </div>

      <div className="kb-filter-grid">
        {isPrivileged && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="all">All Status</option>
          </select>
        )}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categoryOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "all" ? "All Categories" : opt}
            </option>
          ))}
        </select>
        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
          {PRODUCT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "all" ? "All Products" : opt}
            </option>
          ))}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "all" ? "All Roles" : opt}
            </option>
          ))}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          {LOCATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "all" ? "All Locations" : opt}
            </option>
          ))}
        </select>
        <select value={lastUpdatedFilter} onChange={(e) => setLastUpdatedFilter(e.target.value)}>
          {LAST_UPDATED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="kb-filter-chips">
          {activeFilterChips.map((chip) => (
            <button key={chip.key} type="button" className="kb-chip" onClick={() => removeChip(chip.key)}>
              {chip.label} x
            </button>
          ))}
        </div>
      )}

      {error && <div className="inline-error">{error}</div>}

      <div className={`kb-layout ${compactMode ? "compact" : ""}`}>
        <div className="kb-list">
          {loading && <div className="panel muted">Loading articles...</div>}
          {!loading && !articles.length && <div className="empty-state">No articles found.</div>}
          {articles.map((article) => (
            <button
              key={article.article_id}
              className={`kb-card cascade-item hover-lift ${selectedId === article.article_id ? "active" : ""}`}
              type="button"
              onClick={() => loadArticle(article.article_id)}
            >
              <div className="kb-card-main">
                <h3>{article.title}</h3>
                <p>{article.summary || "No summary provided."}</p>
              </div>
              <div className="kb-meta">
                <span>{article.category}</span>
                <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                {isPrivileged && <span>{article.status}</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="kb-detail">
          {detailLoading && <div className="panel muted">Loading...</div>}
          {!detailLoading && detailError && <div className="panel error">{detailError}</div>}
          {!detailLoading && !detailError && !selectedArticle && (
            <div className="empty-state">Select an article to view details.</div>
          )}
          {!detailLoading && selectedArticle && (
            <div className="kb-detail-card" style={{ animation: "fadeIn 0.4s ease-out" }}>
              <div className="kb-detail-header">
                <div>
                  <h3>{selectedArticle.title}</h3>
                  <p className="muted">
                    {selectedArticle.category} · {selectedArticle.status}
                  </p>
                </div>
                {isPrivileged && (
                  <button className="btn ghost" type="button" onClick={() => setEditMode((prev) => !prev)}>
                    {editMode ? "Cancel" : "Edit"}
                  </button>
                )}
              </div>

              {!editMode && (
                <div className={`kb-detail-body ${compactMode ? "compact" : ""}`}>
                  <p>{selectedArticle.summary || "No summary provided."}</p>
                  <div className="kb-content">
                    {compactMode
                      ? String(selectedArticle.content || "").split("\n").slice(0, 10).join("\n")
                      : selectedArticle.content}
                  </div>
                  {compactMode && String(selectedArticle.content || "").split("\n").length > 10 && (
                    <p className="muted" style={{ marginTop: 0 }}>Compact mode: showing first 10 lines.</p>
                  )}

                  {codeBlocks.length > 0 && (
                    <div className="kb-action-block">
                      <h4>Command / Code Blocks</h4>
                      {codeBlocks.map((block, idx) => (
                        <div key={`code-${idx}`} className="kb-code-block">
                          <div className="kb-code-header">
                            <span>{block.language}</span>
                            <button type="button" className="btn ghost" onClick={() => handleCopy(block.code)}>
                              Copy
                            </button>
                          </div>
                          <pre>{block.code}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {checklistItems.length > 0 && (
                    <div className="kb-action-block">
                      <h4>Troubleshooting Checklist</h4>
                      <p className="muted">Progress: {checklistCompleted}/{checklistItems.length} ({checklistProgress}%)</p>
                      <div className="kb-checklist">
                        {checklistItems.map((item, idx) => (
                          <label key={`chk-${idx}`} className="kb-check-item">
                            <input
                              type="checkbox"
                              checked={Boolean(checklistState[idx] ?? item.checked)}
                              onChange={(e) =>
                                setChecklistState((prev) => ({
                                  ...prev,
                                  [idx]: e.target.checked,
                                }))
                              }
                            />
                            <span>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editMode && (
                <div className="kb-edit-form">
                  <label className="field">
                    <span>Title</span>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      rows={3}
                      value={editForm.summary}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, summary: e.target.value }))}
                    />
                  </label>
                  <div className="kb-edit-grid">
                    <label className="field">
                      <span>Category</span>
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Tags</span>
                      <input
                        value={editForm.tags}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Content</span>
                    <textarea
                      rows={10}
                      value={editForm.content}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Change Summary</span>
                    <input
                      value={editForm.change_summary}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, change_summary: e.target.value }))}
                      placeholder="What changed?"
                    />
                  </label>
                  {detailError && <div className="panel error">{detailError}</div>}
                  <div className="form-actions">
                    <button className="btn ghost" type="button" onClick={() => setEditMode(false)}>
                      Cancel
                    </button>
                    <button className="btn primary" type="button" onClick={handleUpdate} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="kb-mobile-actions">
        <button type="button" className="btn ghost" onClick={() => fetchArticles({ includeQuery: true })}>
          Search
        </button>
        <button type="button" className="btn primary" onClick={() => navigate("/new-ticket")}>
          Create Ticket
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBasePage;
