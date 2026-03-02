import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  hasMaxLength,
  hasMinLength,
  isBlank,
  stripHtml,
} from "../utils/validation";

const steps = ["Issue Details", "Impact", "Attachments"];
const DEFAULT_TICKET_TYPE = "incident";

const categories = [
  "Hardware",
  "Software",
  "Access Request",
  "Account Creation",
  "Network",
  "Other",
];

const locations = ["Philippines", "US", "Indonesia", "China", "Other"];
const priorities = ["P1", "P2", "P3", "P4"];
const ticketTypes = [
  { value: "incident", label: "Incident" },
  { value: "request", label: "Request" },
];
const categoryGuidance = {
  Hardware: {
    checklist: ["Device model", "Serial/asset tag", "Power/cable status", "Error lights/sounds"],
    template:
      "Device model:\nAsset tag:\nIssue observed:\nWhen it started:\nTroubleshooting already tried:\n",
  },
  Software: {
    checklist: ["Application name", "Version/build", "Error message", "Affected user count"],
    template:
      "Application:\nVersion/build:\nExact error message:\nFrequency:\nRecent changes before issue:\n",
  },
  Network: {
    checklist: ["Connection type", "VPN status", "Sites/services affected", "Time of occurrence"],
    template:
      "Connection type (LAN/WiFi/VPN):\nAffected systems/sites:\nLocation:\nTime issue started:\n",
  },
  "Access Request": {
    checklist: ["System name", "Role/access level", "Business justification", "Target date needed"],
    template:
      "System/application:\nAccess level requested:\nBusiness justification:\nDate needed by:\nApprover:\n",
  },
  "Account Creation": {
    checklist: ["User full name", "Department", "Start date", "Required systems"],
    template:
      "New user full name:\nDepartment:\nStart date:\nRequired systems:\nManager/approver:\n",
  },
  Other: {
    checklist: ["What happened", "Who is affected", "When it started", "Business impact"],
    template:
      "Issue summary:\nUsers affected:\nStart time/date:\nBusiness impact:\n",
  },
};

const hasMeaningfulDraftContent = ({ form = {}, step = 0, selectedTemplateId = "", selectedAssetId = "" }) => {
  const descriptionText = stripHtml(form.description || "").trim();
  return Boolean(
    (form.title || "").trim() ||
    (form.category || "").trim() ||
    (form.priority || "").trim() ||
    descriptionText ||
    (form.business_impact || "").trim() ||
    (form.tags || "").trim() ||
    selectedAssetId ||
    selectedTemplateId ||
    step > 0 ||
    form.ticket_type !== DEFAULT_TICKET_TYPE
  );
};

const NewTicketPage = ({ onCreated, user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [duplicates, setDuplicates] = useState([]);
  const [duplicateConflict, setDuplicateConflict] = useState(null);
  const confirmDuplicateRef = useRef(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    priority: "",
    ticket_type: DEFAULT_TICKET_TYPE,
    description: "",
    business_impact: "",
    tags: "",
  });
  const [files, setFiles] = useState([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [kbSuggestions, setKbSuggestions] = useState([]);
  const [searchingKbSuggestions, setSearchingKbSuggestions] = useState(false);
  const [kbHasSearched, setKbHasSearched] = useState(false);
  const [selectedKbArticle, setSelectedKbArticle] = useState(null);
  const [loadingKbArticle, setLoadingKbArticle] = useState(false);
  const [slaPreview, setSlaPreview] = useState(null);
  const [loadingSlaPreview, setLoadingSlaPreview] = useState(false);
  const [draftRecoveredAt, setDraftRecoveredAt] = useState("");
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const searchTimeoutRef = useRef(null);
  const kbSearchTimeoutRef = useRef(null);
  const slaPreviewTimeoutRef = useRef(null);

  const location = useLocation();
  const draftStorageKey = `new-ticket-draft:${user?.user_id || "anon"}`;
  const emptyForm = {
    title: "",
    category: "",
    location: "",
    priority: "",
    ticket_type: DEFAULT_TICKET_TYPE,
    description: "",
    business_impact: "",
    tags: "",
  };

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const res = await apiClient.get("/assets");
        setAssets(res.data.data.assets || []);
      } catch (err) {
        setAssets([]);
      }
    };

    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await apiClient.get("/ticket-templates");
        setTemplates(res.data.data?.templates || []);
      } catch (err) {
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadAssets();
    loadTemplates();

    // Pre-fill location from user profile
    if (user?.location) {
      setForm((prev) => ({ ...prev, location: user.location }));
    }

    // Pre-fill ticket type from query param
    const params = new URLSearchParams(location.search);
    const typeParam = params.get("type");
    const templateParam = params.get("template") || params.get("template_id");
    if (typeParam && ["incident", "request"].includes(typeParam)) {
      setForm((prev) => ({ ...prev, ticket_type: typeParam }));
    }

    // If a template ID was provided in the URL, select it so it will be applied
    if (templateParam) {
      setSelectedTemplateId(templateParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user?.location) return;
    setForm((prev) => {
      if (prev.location === user.location) return prev;
      return { ...prev, location: user.location };
    });
  }, [user?.location]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.form) return;
      if (!hasMeaningfulDraftContent(draft)) {
        localStorage.removeItem(draftStorageKey);
        return;
      }
      setPendingDraft(draft);
      if (draft?.saved_at) {
        setDraftRecoveredAt(draft.saved_at);
      }
      setShowDraftNotice(true);
    } catch (err) {
      // Ignore malformed local drafts
    }
  }, [draftStorageKey, user?.location]);

  useEffect(() => {
    if (showDraftNotice) return;

    const draft = {
      form,
      step,
      selectedTemplateId,
      selectedAssetId,
      saved_at: new Date().toISOString(),
    };
    const shouldPersist = hasMeaningfulDraftContent(draft);
    try {
      if (!shouldPersist) {
        localStorage.removeItem(draftStorageKey);
        setDraftSavedAt("");
        return;
      }
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setDraftSavedAt(draft.saved_at);
    } catch (err) {
      // Ignore storage quota issues
    }
  }, [draftStorageKey, form, step, selectedTemplateId, selectedAssetId, showDraftNotice]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Text inputs are autosaved; only warn when file attachments would be lost.
      if (files.length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [files.length]);

  const discardDraft = () => {
    setForm({
      ...emptyForm,
      location: user?.location || "",
    });
    setStep(0);
    setSelectedTemplateId("");
    setSelectedAssetId("");
    setFiles([]);
    setDuplicates([]);
    setDuplicateConflict(null);
    setDraftRecoveredAt("");
    setDraftSavedAt("");
    setShowDraftNotice(false);
    setPendingDraft(null);
    localStorage.removeItem(draftStorageKey);
  };

  const keepDraft = () => {
    if (!pendingDraft?.form) {
      setShowDraftNotice(false);
      return;
    }
    setForm((prev) => ({
      ...prev,
      ...pendingDraft.form,
      // Keep profile-enforced location authoritative when available.
      location: user?.location || pendingDraft.form.location || prev.location,
    }));
    if (typeof pendingDraft?.step === "number") {
      setStep(Math.max(0, Math.min(2, pendingDraft.step)));
    }
    if (typeof pendingDraft?.selectedTemplateId === "string") {
      setSelectedTemplateId(pendingDraft.selectedTemplateId);
    }
    if (typeof pendingDraft?.selectedAssetId === "string") {
      setSelectedAssetId(pendingDraft.selectedAssetId);
    }
    if (pendingDraft?.saved_at) {
      setDraftSavedAt(pendingDraft.saved_at);
    }
    setShowDraftNotice(false);
    setPendingDraft(null);
  };

  const openExistingTicket = (ticketId) => {
    if (!ticketId) return;
    navigate(`/tickets/${ticketId}`);
  };

  const applyTemplate = React.useCallback((template) => {
    if (!template) return;
    // Apply ALL template values IMMEDIATELY - use functional update to preserve other fields
    setForm((prev) => ({
      ...prev,
      title: template.title || "",
      category: template.category || "",
      description: template.description || "",
      business_impact: template.business_impact || "",
      priority: template.priority || "",
    }));

    // Show instant success feedback
    const filledFields = [];
    if (template.title) filledFields.push("Title");
    if (template.category) filledFields.push("Category");
    if (template.priority) filledFields.push("Priority");
    if (template.description) filledFields.push("Description");
    if (template.business_impact) filledFields.push("Business Impact");

    if (filledFields.length > 0) {
      setSuccess(`✓ Template "${template.name}" applied! Fields filled: ${filledFields.join(", ")}`);
      setTimeout(() => setSuccess(""), 3000);
    }
  }, []);

  // Safety net: Apply template when templates load if one was already selected
  // (Edge case: user selects template before templates finish loading)
  useEffect(() => {
    if (!selectedTemplateId || templates.length === 0) return;
    const template = templates.find(
      (item) => String(item.template_id) === String(selectedTemplateId),
    );
    if (template) {
      // Only apply if form doesn't match template (templates just loaded)
      const needsApply =
        form.title !== (template.title || "") ||
        form.category !== (template.category || "");
      if (needsApply) {
        applyTemplate(template);
      }
    }
  }, [templates]); // Trigger when templates array is populated

  useEffect(() => {
    if (form.title.trim().length < 4) {
      setDuplicates([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingDuplicates(true);
      try {
        const res = await apiClient.get("/tickets/check-duplicates", {
          params: { title: form.title.trim() }
        });
        setDuplicates(res.data.data.duplicates || []);
      } catch (err) {
        console.error("Duplicate check failed", err);
      } finally {
        setSearchingDuplicates(false);
      }
    }, 600);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [form.title]);

  useEffect(() => {
    const titleSeed = form.title.trim();
    const descriptionSeed = stripHtml(form.description).trim();
    const querySeed = `${titleSeed} ${descriptionSeed}`.trim();
    const shouldSearch = titleSeed.length >= 4 || descriptionSeed.length >= 8;

    if (!shouldSearch) {
      setKbSuggestions([]);
      setKbHasSearched(false);
      return;
    }

    if (kbSearchTimeoutRef.current) {
      clearTimeout(kbSearchTimeoutRef.current);
    }

    kbSearchTimeoutRef.current = setTimeout(async () => {
      setSearchingKbSuggestions(true);
      try {
        const res = await apiClient.get("/kb/search", { params: { q: querySeed } });
        setKbSuggestions((res.data.data.results || []).slice(0, 3));
        setKbHasSearched(true);
      } catch (err) {
        setKbSuggestions([]);
        setKbHasSearched(true);
      } finally {
        setSearchingKbSuggestions(false);
      }
    }, 700);

    return () => {
      if (kbSearchTimeoutRef.current) {
        clearTimeout(kbSearchTimeoutRef.current);
      }
    };
  }, [form.title, form.description]);

  useEffect(() => {
    const effectiveLocation = form.location || user?.location || "";
    if (!form.category || !effectiveLocation) {
      setSlaPreview(null);
      return;
    }

    if (slaPreviewTimeoutRef.current) {
      clearTimeout(slaPreviewTimeoutRef.current);
    }

    slaPreviewTimeoutRef.current = setTimeout(async () => {
      setLoadingSlaPreview(true);
      try {
        const res = await apiClient.get("/tickets/sla-preview", {
          params: {
            category: form.category,
            location: effectiveLocation,
            priority: form.priority || "",
            description: stripHtml(form.description || ""),
            business_impact: form.business_impact || "",
          },
        });
        setSlaPreview(res.data?.data?.preview || null);
      } catch (err) {
        setSlaPreview(null);
      } finally {
        setLoadingSlaPreview(false);
      }
    }, 500);

    return () => {
      if (slaPreviewTimeoutRef.current) {
        clearTimeout(slaPreviewTimeoutRef.current);
      }
    };
  }, [
    form.category,
    form.location,
    form.priority,
    form.description,
    form.business_impact,
    user?.location,
  ]);

  const validateIssueDetails = () => {
    const title = form.title.trim();
    const descriptionText = stripHtml(form.description);
    const missing = [];
    if (!hasMinLength(title, 5)) missing.push("Ticket title (at least 5 characters)");
    if (!hasMaxLength(title, 255)) return "Ticket title must be 255 characters or less.";
    if (isBlank(form.category)) missing.push("Category");
    if (isBlank(form.location)) missing.push("Location");
    if (!hasMinLength(descriptionText, 10)) missing.push("Description (at least 10 characters)");
    if (missing.length > 0) {
      return `Please fill in: ${missing.join(", ")}`;
    }
    return "";
  };

  const validateImpact = () => {
    if (!hasMinLength(form.business_impact, 10)) {
      return "Business impact must be at least 10 characters.";
    }
    return "";
  };

  const validateStep = () => {
    if (step === 0) return !validateIssueDetails();
    if (step === 1) return !validateImpact();
    return true;
  };

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const valid = [];
    for (const file of selected) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File too large (10MB max): ${file.name}`);
        continue;
      }
      valid.push(file);
    }

    const combined = [...files, ...valid];
    const combinedSize = combined.reduce((sum, file) => sum + file.size, 0);
    if (combinedSize > 50 * 1024 * 1024) {
      setError("Total attachments must be below 50MB.");
      return;
    }

    setFiles(combined);
    setError("");
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    const issueError = validateIssueDetails();
    const impactError = validateImpact();
    if (issueError || impactError) {
      setError(issueError || impactError);
      return;
    }
    setError("");
    setSuccess("");
    setDuplicateConflict(null);
    setLoading(true);

    const confirmDuplicate = confirmDuplicateRef.current;
    confirmDuplicateRef.current = false;

    const idempotencyKey = `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const headers = { "X-Idempotency-Key": idempotencyKey };

    try {
      let ticket;
      if (files.length > 0) {
        const formData = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v != null && v !== "") formData.append(k, v);
        });
        if (confirmDuplicate) formData.append("confirm_duplicate", "true");
        files.forEach((file) => formData.append("files", file));
        const res = await apiClient.post("/tickets/with-attachments", formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
        ticket = res.data.data.ticket;
        setDuplicates(res.data.data.possible_duplicates || []);
      } else {
        const payload = { ...form };
        if (confirmDuplicate) payload.confirm_duplicate = true;
        const res = await apiClient.post("/tickets", payload, { headers });
        ticket = res.data.data.ticket;
        setDuplicates(res.data.data.possible_duplicates || []);
      }

      if (selectedAssetId) {
        try {
          await apiClient.post(`/assets/${selectedAssetId}/link-ticket`, {
            ticket_id: ticket.ticket_id,
          });
        } catch (err) {
          setError(
            err.response?.data?.message ||
            "Ticket created, but asset link failed",
          );
        }
      }

      setSuccess(`Ticket created: ${ticket.ticket_number}`);
      setForm({
        ...emptyForm,
        location: user?.location || "",
      });
      setSelectedTemplateId("");
      setFiles([]);
      setSelectedAssetId("");
      setStep(0);
      setDraftSavedAt("");
      setDraftRecoveredAt("");
      setShowDraftNotice(false);
      localStorage.removeItem(draftStorageKey);
      if (onCreated) onCreated(ticket);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.possible_duplicates) {
        setDuplicateConflict(err.response.data.possible_duplicates);
        setError(err.response?.data?.message || "Possible duplicate ticket.");
      } else {
        setError(err.response?.data?.message || "Failed to create ticket");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnyway = () => {
    confirmDuplicateRef.current = true;
    setError("");
    setDuplicateConflict(null);
    handleSubmit();
  };

  const handleOpenKbArticle = async (articleId) => {
    if (!articleId) return;
    setLoadingKbArticle(true);
    try {
      const res = await apiClient.get(`/kb/articles/${articleId}`);
      setSelectedKbArticle(res.data?.data?.article || null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to open article");
    } finally {
      setLoadingKbArticle(false);
    }
  };

  const handleKbSolved = () => {
    setSelectedKbArticle(null);
    setError("");
    setSuccess("Great. If this solved your issue, you can skip submitting this ticket.");
  };

  const selectedKbBody =
    selectedKbArticle?.content ||
    selectedKbArticle?.summary ||
    "No article content available.";
  const selectedKbBodyHasHtml = /<[^>]+>/.test(selectedKbBody);
  const selectedCategoryGuide = categoryGuidance[form.category] || null;

  const applyGuidedTemplate = () => {
    if (!selectedCategoryGuide) return;
    const currentPlain = stripHtml(form.description || "")
      .replace(/\r/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const normalizedTemplate = selectedCategoryGuide.template
      .replace(/\r/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const templateLines = selectedCategoryGuide.template
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const templateKeys = templateLines
      .map((line) => line.replace(/[:：]\s*$/, "").toLowerCase().trim())
      .filter((line) => line.length >= 3);
    const matchedKeys = templateKeys.filter((key) => currentPlain.includes(key)).length;

    // Prevent repeated inserts even if Quill reformats line breaks/HTML.
    if (
      currentPlain.includes(normalizedTemplate) ||
      matchedKeys >= Math.max(2, Math.ceil(templateKeys.length * 0.6))
    ) {
      setSuccess("Guided template already inserted for this category.");
      setTimeout(() => setSuccess(""), 2000);
      return;
    }

    const guideHtml = templateLines.join("<br/>");
    if (currentPlain.length > 0) {
      setForm((prev) => ({
        ...prev,
        description: `${prev.description}<br/><br/>${guideHtml}`,
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      description: guideHtml,
    }));
  };

  return (
    <div className="panel new-ticket-mobile-polish" style={{ animation: 'slideUp 0.6s cubic-bezier(0.2, 0, 0, 1) both' }}>
      <div className="panel-header">
        <div>
          <h2>Create Ticket</h2>
          <p>Submit an issue or request and we will route it automatically.</p>
        </div>
      </div>

      <div className="steps">
        {steps.map((label, index) => (
          <div key={label} className={`step ${index <= step ? "active" : ""}`}>
            <span>{index + 1}</span>
            <p>{label}</p>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: "0.5rem", marginBottom: "1rem", fontSize: "12px" }}>
        Draft autosaves locally while you type.
        {draftSavedAt ? ` Last saved: ${new Date(draftSavedAt).toLocaleString()}` : ""}
      </p>
      {showDraftNotice && (
        <div className="panel" style={{ marginBottom: "12px", border: "1px solid rgba(14,165,233,0.35)" }}>
          <strong>Saved draft found.</strong>
          {draftRecoveredAt ? ` Last saved: ${new Date(draftRecoveredAt).toLocaleString()}.` : ""}
          <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" className="btn ghost" onClick={keepDraft}>
              Keep Draft
            </button>
            <button type="button" className="btn ghost" onClick={discardDraft}>
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="panel error">
          {error}
          {duplicateConflict && duplicateConflict.length > 0 && (
            <div className="attachment-list" style={{ marginTop: 12 }}>
              <strong>Similar tickets:</strong>
              {duplicateConflict.map((dup) => (
                <div key={dup.ticket_id} className="attachment-item">
                  <span>{dup.ticket_number}</span>
                  <span>{dup.title}</span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => openExistingTicket(dup.ticket_id)}
                    style={{ marginLeft: "8px" }}
                  >
                    Open
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn primary"
                style={{ marginTop: 8 }}
                onClick={handleSubmitAnyway}
                disabled={loading}
              >
                Submit anyway
              </button>
            </div>
          )}
        </div>
      )}
      {step === 0 && selectedTemplateId && !validateStep() && (
        <div className="panel" style={{ background: "#1a3a5c", border: "1px solid #3a5a7a", padding: "12px", borderRadius: "4px", marginBottom: "16px" }}>
          <strong style={{ color: "#ffd700" }}>⚠ Missing required fields:</strong>
          <div style={{ marginTop: "8px", fontSize: "14px" }}>
            {(() => {
              const validationMsg = validateIssueDetails();
              if (validationMsg) {
                return <span style={{ color: "#ffd700" }}>{validationMsg}</span>;
              }
              return null;
            })()}
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#a0c0e0" }}>
            Template applied. Please fill in the missing fields above to continue.
          </div>
        </div>
      )}
      {success && (
        <div className="panel success">
          {success}
          {duplicates.length > 0 && (
            <div className="attachment-list" style={{ marginTop: 12 }}>
              <strong>Possible duplicates:</strong>
              {duplicates.map((dup) => (
                <div key={dup.ticket_id} className="attachment-item">
                  <span>{dup.ticket_number}</span>
                  <span>{dup.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedKbArticle && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedKbArticle(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1400,
            padding: "1rem",
          }}
        >
          <div
            className="modal"
            style={{
              width: "min(960px, 94vw)",
              maxHeight: "85vh",
              background: "rgba(15, 23, 42, 0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              padding: "1.1rem",
              boxShadow: "0 12px 36px rgba(2,6,23,0.65)",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, lineHeight: 1.2 }}>{selectedKbArticle.title}</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
              Category: {selectedKbArticle.category || "General"}
            </p>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "0.9rem 0",
                color: "#e2e8f0",
                lineHeight: 1.7,
                fontSize: "0.95rem",
                overflowY: "auto",
                maxHeight: "58vh",
              }}
            >
              {selectedKbBodyHasHtml ? (
                <div dangerouslySetInnerHTML={{ __html: selectedKbBody }} />
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }}>{selectedKbBody}</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={handleKbSolved}
                style={{ marginRight: "0.5rem" }}
              >
                This solved my issue
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSelectedKbArticle(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="form-grid">
          <label className="field">
            <span>Template (optional)</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedTemplateId(id);
                setError(""); // Clear any previous errors

                // Apply template IMMEDIATELY when selected
                if (id) {
                  const template = templates.find(
                    (t) => String(t.template_id) === String(id),
                  );
                  if (template) {
                    // Apply template synchronously - no delay
                    applyTemplate(template);
                  } else {
                    setError("Template not found. Please refresh the page.");
                  }
                } else {
                  // Clear success message when deselected
                  setSuccess("");
                }
              }}
              disabled={templatesLoading}
            >
              <option value="">
                {templatesLoading ? "Loading templates..." : "Select template"}
              </option>
              {templates.map((template) => (
                <option key={template.template_id} value={template.template_id}>
                  {template.name}
                  {template.category ? ` (${template.category})` : ""}
                </option>
              ))}
            </select>
            {selectedTemplateId && (() => {
              const selectedTemplate = templates.find(
                (t) => String(t.template_id) === String(selectedTemplateId),
              );
              if (!selectedTemplate) return null;
              const filled = [];
              if (selectedTemplate.title) filled.push("Title");
              if (selectedTemplate.category) filled.push("Category");
              if (selectedTemplate.priority) filled.push("Priority");
              if (selectedTemplate.description) filled.push("Description");
              if (selectedTemplate.business_impact) filled.push("Business Impact");
              return (
                <small className="muted" style={{ color: "#4ade80", fontWeight: "500" }}>
                  ✓ Template applied: {filled.length > 0 ? filled.join(", ") : "No fields to fill"}
                  {filled.length > 0 && " - You can edit any field"}
                </small>
              );
            })()}
          </label>
          <label className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ticket Title</span>
              {searchingDuplicates && <small className="muted" style={{ fontSize: '10px' }}>Checking for duplicates...</small>}
            </div>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief summary of the issue"
            />
            {duplicates.length > 0 && (
              <div className="duplicates-suggestion" style={{
                marginTop: '8px',
                background: 'rgba(255, 215, 0, 0.05)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#ffd700', fontSize: '12px', fontWeight: '700' }}>
                  <span style={{ fontSize: '16px' }}>⚠</span>
                  <span>SIMILAR TICKETS FOUND</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {duplicates.map(dup => (
                    <div key={dup.ticket_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--slate-300)', padding: '4px 0' }}>
                      <span style={{ fontWeight: '600', color: 'var(--cyan-300)' }}>{dup.ticket_number}</span>
                      <span style={{ flex: 1, margin: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dup.title}</span>
                      <span className={`status-pill ${dup.status.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '9px', padding: '2px 8px' }}>{dup.status}</span>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ marginLeft: "8px", minHeight: "28px", padding: "4px 8px", fontSize: "10px" }}
                        onClick={() => openExistingTicket(dup.ticket_id)}
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '10px', color: 'var(--slate-500)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  Please check if your issue is already being handled to avoid duplicate tickets.
                </p>
              </div>
            )}
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Location</span>
            {user?.location ? (
              <div className="locked-location">
                <span className="locked-location-value">📍 {user.location}</span>
                <small className="muted" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                  Set from your profile • <a href="/profile" style={{ color: 'var(--cyan-300)' }}>Change in Profile Settings</a>
                </small>
              </div>
            ) : (
              <select
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="field">
            <span>Ticket Type</span>
            <select
              value={form.ticket_type}
              onChange={(e) =>
                setForm({ ...form, ticket_type: e.target.value })
              }
            >
              {ticketTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <small className="muted">
              Incident = unplanned interruption. Request = formal request from a user for something to be provided.
            </small>
          </label>
          <label className="field">
            <span>Priority (optional)</span>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="">Auto</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            {selectedCategoryGuide && (
              <div style={{ marginTop: "8px", border: "1px solid rgba(59,130,246,0.28)", borderRadius: "10px", padding: "8px" }}>
                <small className="muted" style={{ display: "block", marginBottom: "6px" }}>
                  Smart checklist: {selectedCategoryGuide.checklist.join(" • ")}
                </small>
                <button type="button" className="btn ghost" onClick={applyGuidedTemplate}>
                  Insert guided description template
                </button>
              </div>
            )}
          </label>
          <div className="field full">
            <span>SLA Estimate</span>
            <div
              style={{
                marginTop: "8px",
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              {loadingSlaPreview && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate-300)" }}>
                  Computing SLA estimate...
                </p>
              )}
              {!loadingSlaPreview && !slaPreview && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate-500)" }}>
                  Select category and location to preview response and resolution targets.
                </p>
              )}
              {!loadingSlaPreview && slaPreview && (
                <div style={{ display: "grid", gap: "6px" }}>
                  <div style={{ fontSize: "12px", color: "var(--slate-300)" }}>
                    Priority: <strong style={{ color: "var(--slate-100)" }}>{slaPreview.final_priority}</strong>
                    {slaPreview.applied_priority_override ? " (routed override)" : ""}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--slate-300)" }}>
                    Response target: <strong style={{ color: "var(--slate-100)" }}>{new Date(slaPreview.sla_response_due).toLocaleString()}</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--slate-300)" }}>
                    Resolution target: <strong style={{ color: "var(--slate-100)" }}>{new Date(slaPreview.sla_due_date).toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
          <label className="field">
            <span>Related Asset (optional)</span>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              <option value="">Select your asset</option>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.asset_tag} ({asset.asset_type})
                </option>
              ))}
            </select>
            {assets.length === 0 && (
              <small className="muted">
                No assets assigned to your account.
              </small>
            )}
          </label>
          <label className="field">
            <span>Tags (optional)</span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Example: vpn, urgent, onboarding"
            />
          </label>
          <label className="field full">
            <span>Detailed Description</span>
            <ReactQuill
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
              className="editor"
            />
          </label>
          <div className="field full">
            <span>Helpful Articles</span>
            <div className="duplicates-suggestion" style={{
              marginTop: "8px",
              background: "rgba(14, 165, 233, 0.06)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              borderRadius: "12px",
              padding: "12px"
            }}>
              {searchingKbSuggestions && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate-300)" }}>
                  Searching related knowledge base articles...
                </p>
              )}
              {!searchingKbSuggestions && kbSuggestions.length === 0 && !kbHasSearched && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate-500)" }}>
                  Add more detail in title/description to get suggested fixes before submitting.
                </p>
              )}
              {!searchingKbSuggestions && kbSuggestions.length === 0 && kbHasSearched && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate-500)" }}>
                  No matching helpful articles found yet.
                </p>
              )}
              {!searchingKbSuggestions && kbSuggestions.length > 0 && (
                <div style={{ display: "grid", gap: "8px" }}>
                  {kbSuggestions.map((article) => (
                    <button
                      key={article.article_id}
                      type="button"
                      onClick={() => handleOpenKbArticle(article.article_id)}
                      disabled={loadingKbArticle}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "var(--slate-100)",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--cyan-300)" }}>
                        {article.title}
                      </div>
                      {article.category && (
                        <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>
                          Category: {article.category}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="form-grid">
          <label className="field full">
            <span>Business Impact</span>
            <textarea
              rows={5}
              value={form.business_impact}
              onChange={(e) =>
                setForm({ ...form, business_impact: e.target.value })
              }
              placeholder="Describe the impact on operations, users, or deadlines."
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="form-grid">
          <label className="field full">
            <span>Attachments (optional)</span>
            <input type="file" multiple onChange={handleFileChange} />
            <small>
              Any file type. Max 10MB each, 50MB total.
            </small>
          </label>
          <div className="attachment-list">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="attachment-item">
                <div>
                  <span>{file.name}</span>
                </div>
                <div className="attachment-actions">
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => handleRemoveFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {files.length > 0 && (
              <div className="attachment-total">
                Total: {(totalSize / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button
          className="btn ghost"
          type="button"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            className="btn primary btn-press"
            type="button"
            onClick={() => {
              const validationMessage =
                step === 0 ? validateIssueDetails() : validateImpact();
              if (validationMessage) {
                setError(validationMessage);
                return;
              }
              setError("");
              setStep(step + 1);
            }}
            style={{
              opacity: !validateStep() ? 0.6 : 1,
              cursor: !validateStep() ? "not-allowed" : "pointer",
            }}
            title={!validateStep() ? (step === 0 ? validateIssueDetails() || "Please fill all required fields" : validateImpact() || "Please fill all required fields") : ""}
          >
            Next
          </button>
        ) : (
          <button
            className="btn primary btn-press"
            type="button"
            disabled={!validateStep() || loading}
            onClick={handleSubmit}
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
        )}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .new-ticket-mobile-polish .btn {
            min-height: 48px;
            padding: 12px 16px;
            font-size: 15px;
          }
          .new-ticket-mobile-polish input,
          .new-ticket-mobile-polish select,
          .new-ticket-mobile-polish textarea {
            min-height: 46px;
            font-size: 16px;
          }
          .new-ticket-mobile-polish .ql-toolbar button {
            min-width: 36px;
            min-height: 36px;
          }
          .new-ticket-mobile-polish .form-actions {
            position: sticky;
            bottom: 8px;
            z-index: 8;
            margin-top: 10px;
            padding: 10px;
            border-radius: 12px;
            background: linear-gradient(to top, rgba(2, 6, 23, 0.94), rgba(2, 6, 23, 0.45));
            backdrop-filter: blur(8px);
          }
          .new-ticket-mobile-polish .form-actions .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default NewTicketPage;


