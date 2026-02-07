import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const steps = ["Issue Details", "Impact", "Attachments"];

const categories = [
  "Hardware",
  "Software",
  "Access Request",
  "Account Creation",
  "Network",
  "Other",
];

const locations = ["Philippines", "US", "Indonesia", "Other"];

const allowedExtensions = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".xlsx",
  ".docx",
  ".msg",
];

const NewTicketPage = ({ onCreated }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
    business_impact: "",
  });
  const [files, setFiles] = useState([]);

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

    loadAssets();
  }, []);

  const validateStep = () => {
    if (step === 0) {
      return form.title && form.category && form.location && form.description;
    }
    if (step === 1) {
      return form.business_impact;
    }
    return true;
  };

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const valid = [];
    for (const file of selected) {
      const ext = `.${file.name.split(".").pop()}`.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setError(`Unsupported file type: ${file.name}`);
        continue;
      }
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

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiClient.post("/tickets", form);
      const ticket = res.data.data.ticket;

      if (files.length) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        await apiClient.post(
          `/tickets/${ticket.ticket_id}/attachments`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
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
        title: "",
        category: "",
        location: "",
        description: "",
        business_impact: "",
      });
      setFiles([]);
      setSelectedAssetId("");
      setStep(0);
      if (onCreated) onCreated(ticket);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
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

      {error && <div className="panel error">{error}</div>}
      {success && <div className="panel success">{success}</div>}

      {step === 0 && (
        <div className="form-grid">
          <label className="field">
            <span>Ticket Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief summary of the issue"
            />
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
          </label>
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
          <label className="field full">
            <span>Detailed Description</span>
            <ReactQuill
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
              className="editor"
            />
          </label>
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
              Max 10MB each, 50MB total. Supported:{" "}
              {allowedExtensions.join(", ")}
            </small>
          </label>
          <div className="attachment-list">
            {files.map((file) => (
              <div key={file.name} className="attachment-item">
                <span>{file.name}</span>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
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
            className="btn primary"
            type="button"
            disabled={!validateStep()}
            onClick={() => setStep(step + 1)}
          >
            Next
          </button>
        ) : (
          <button
            className="btn primary"
            type="button"
            disabled={!validateStep() || loading}
            onClick={handleSubmit}
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
        )}
      </div>
    </div>
  );
};

export default NewTicketPage;
