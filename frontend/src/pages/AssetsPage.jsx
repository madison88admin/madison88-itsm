import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { hasMinLength, isUuid } from "../utils/validation";

const assetTypes = [
  "laptop",
  "desktop",
  "monitor",
  "printer",
  "server",
  "network_device",
  "projector",
  "docking_station",
  "ups",
  "other",
];

const assetStatus = ["active", "inactive", "retired", "for_repair"];

const AssetsPage = ({ user }) => {
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [linkTicketId, setLinkTicketId] = useState("");
  const [form, setForm] = useState({
    asset_tag: "",
    serial_number: "",
    asset_type: "laptop",
    model: "",
    manufacturer: "",
    assigned_user_id: "",
    location: "",
    purchase_date: "",
    warranty_expiration: "",
    cost: "",
    status: "active",
  });

  const canManage = useMemo(
    () => ["it_manager", "system_admin"].includes(user?.role),
    [user?.role],
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/assets");
      setAssets(res.data.data.assets || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (assetId) => {
    setError("");
    try {
      const res = await apiClient.get(`/assets/${assetId}`);
      setSelected(res.data.data.asset);
      setTickets(res.data.data.tickets || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load asset details");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!hasMinLength(form.asset_tag, 3)) {
      setError("Asset tag must be at least 3 characters.");
      return;
    }
    if (form.assigned_user_id && !isUuid(form.assigned_user_id)) {
      setError("Assigned user must be a valid UUID.");
      return;
    }
    if (form.cost && Number(form.cost) < 0) {
      setError("Cost must be a positive number.");
      return;
    }
    try {
      await apiClient.post("/assets", {
        ...form,
        assigned_user_id: form.assigned_user_id || null,
        purchase_date: form.purchase_date || null,
        warranty_expiration: form.warranty_expiration || null,
        cost: form.cost ? Number(form.cost) : null,
      });
      setMessage("Asset added.");
      setForm({
        asset_tag: "",
        serial_number: "",
        asset_type: "laptop",
        model: "",
        manufacturer: "",
        assigned_user_id: "",
        location: "",
        purchase_date: "",
        warranty_expiration: "",
        cost: "",
        status: "active",
      });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create asset");
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setError("");
    setMessage("");
    if (selected.assigned_user_id && !isUuid(selected.assigned_user_id)) {
      setError("Assigned user must be a valid UUID.");
      return;
    }
    try {
      await apiClient.patch(`/assets/${selected.asset_id}`, {
        status: selected.status,
        assigned_user_id: selected.assigned_user_id || null,
        location: selected.location || null,
        warranty_expiration: selected.warranty_expiration || null,
      });
      setMessage("Asset updated.");
      loadDetails(selected.asset_id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update asset");
    }
  };

  const handleLinkTicket = async () => {
    if (!selected || !linkTicketId) return;
    setError("");
    if (!isUuid(linkTicketId)) {
      setError("Ticket ID must be a valid UUID.");
      return;
    }
    try {
      await apiClient.post(`/assets/${selected.asset_id}/link-ticket`, {
        ticket_id: linkTicketId,
      });
      setLinkTicketId("");
      loadDetails(selected.asset_id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to link ticket");
    }
  };

  return (
    <div className="tickets-layout">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Assets</h2>
            <p>Track hardware ownership, warranty, and ticket history.</p>
          </div>
        </div>
        {error && <div className="panel error">{error}</div>}
        {message && <div className="panel success">{message}</div>}
        {loading ? (
          <div className="muted">Loading assets...</div>
        ) : (
          <div className="ticket-list">
            {assets.map((asset) => (
              <button
                key={asset.asset_id}
                className={`ticket-card ${
                  selected?.asset_id === asset.asset_id ? "active" : ""
                }`}
                onClick={() => loadDetails(asset.asset_id)}
              >
                <div>
                  <div className="ticket-title">{asset.asset_tag}</div>
                  <div className="ticket-meta">
                    <span>{asset.asset_type}</span>
                    <span>•</span>
                    <span>{asset.manufacturer || "Unknown"}</span>
                    <span>•</span>
                    <span>{asset.status}</span>
                  </div>
                </div>
                <div className="ticket-badges">
                  <span className="badge">{asset.location || "N/A"}</span>
                  <span
                    className={`badge health-badge ${
                      asset.health_label ? `health-${asset.health_label}` : ""
                    }`}
                  >
                    Health {asset.health_score ?? "-"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel detail-panel">
        {!selected && (
          <div className="muted">Select an asset to view details.</div>
        )}
        {selected && (
          <>
            <div className="detail-header">
              <div>
                <h2>{selected.asset_tag}</h2>
                <p>{selected.asset_type}</p>
              </div>
            </div>
            <div className="detail-grid">
              <div>
                <span>Status</span>
                <strong>{selected.status}</strong>
              </div>
              <div>
                <span>Assigned User</span>
                <strong>{selected.assigned_user_id || "Unassigned"}</strong>
              </div>
              <div>
                <span>Serial</span>
                <strong>{selected.serial_number || "N/A"}</strong>
              </div>
              <div>
                <span>Health Score</span>
                <strong>{selected.health_score ?? "-"}</strong>
              </div>
              <div>
                <span>Warranty</span>
                <strong>
                  {selected.warranty_expiration
                    ? new Date(
                        selected.warranty_expiration,
                      ).toLocaleDateString()
                    : "N/A"}
                </strong>
              </div>
            </div>

            {canManage && (
              <div className="detail-update">
                <label className="field">
                  <span>Status</span>
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      setSelected({ ...selected, status: e.target.value })
                    }
                  >
                    {assetStatus.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Assigned User (UUID)</span>
                  <input
                    value={selected.assigned_user_id || ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        assigned_user_id: e.target.value,
                      })
                    }
                    placeholder="Paste user_id"
                  />
                </label>
                <label className="field">
                  <span>Location</span>
                  <input
                    value={selected.location || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, location: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Warranty Expiration</span>
                  <input
                    type="date"
                    value={selected.warranty_expiration?.slice(0, 10) || ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        warranty_expiration: e.target.value,
                      })
                    }
                  />
                </label>
                <button className="btn primary" onClick={handleUpdate}>
                  Save
                </button>
              </div>
            )}

            <div className="detail-section">
              <h3>Linked Tickets</h3>
              {tickets.length === 0 && (
                <p className="muted">No linked tickets.</p>
              )}
              {tickets.map((ticket) => (
                <div key={ticket.ticket_id} className="ticket-meta">
                  <span>{ticket.ticket_number}</span>
                  <span>•</span>
                  <span>{ticket.title}</span>
                  <span>•</span>
                  <span>{ticket.status}</span>
                </div>
              ))}
              <div className="comment-form">
                <input
                  value={linkTicketId}
                  onChange={(e) => setLinkTicketId(e.target.value)}
                  placeholder="Link ticket by UUID"
                />
                <button className="btn ghost" onClick={handleLinkTicket}>
                  Link Ticket
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {canManage && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Add Asset</h2>
              <p>Register new equipment for tracking.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleCreate}>
            <label className="field">
              <span>Asset Tag</span>
              <input
                value={form.asset_tag}
                onChange={(e) =>
                  setForm({ ...form, asset_tag: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Serial Number</span>
              <input
                value={form.serial_number}
                onChange={(e) =>
                  setForm({ ...form, serial_number: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Asset Type</span>
              <select
                value={form.asset_type}
                onChange={(e) =>
                  setForm({ ...form, asset_type: e.target.value })
                }
              >
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Manufacturer</span>
              <input
                value={form.manufacturer}
                onChange={(e) =>
                  setForm({ ...form, manufacturer: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Model</span>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Assigned User (UUID)</span>
              <input
                value={form.assigned_user_id}
                onChange={(e) =>
                  setForm({ ...form, assigned_user_id: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Location</span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Purchase Date</span>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) =>
                  setForm({ ...form, purchase_date: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Warranty Expiration</span>
              <input
                type="date"
                value={form.warranty_expiration}
                onChange={(e) =>
                  setForm({ ...form, warranty_expiration: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Cost</span>
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {assetStatus.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="field full">
              <button className="btn primary" type="submit">
                Add Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AssetsPage;
