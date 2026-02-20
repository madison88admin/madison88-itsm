import React, { useState, useRef, useEffect } from "react";
import apiClient from "../../api/client";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/api\/?$/, "");

const TicketConversation = ({ ticketId, comments, audit = [], onCommentAdded }) => {
    const [newComment, setNewComment] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    const cannedResponses = [
        "Hello, I'm looking into your issue and will update you shortly.",
        "Could you please provide more details or a screenshot?",
        "I have resolved this ticket. Please let me know if you need anything else.",
        "This ticket is being escalated to the relevant team.",
        "Please try restarting your device and checking again."
    ];

    const handleCannedResponse = (e) => {
        const val = e.target.value;
        if (!val) return;
        setNewComment(prev => prev ? prev + "\n" + val : val);
        e.target.value = ""; // Reset select
    };

    const timeline = comments.map(c => ({
        ...c,
        type: 'comment',
        timestamp: new Date(c.created_at)
    })).sort((a, b) => a.timestamp - b.timestamp);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [timeline]);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;
        setSelectedImages(prev => [...prev, ...imageFiles].slice(0, 5));
        // Reset so the same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeImage = (index) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() && selectedImages.length === 0) return;

        try {
            setSubmitting(true);

            let res;
            if (selectedImages.length > 0) {
                // Use FormData for multipart upload
                const formData = new FormData();
                formData.append('comment_text', newComment);
                formData.append('is_internal', isInternal);
                for (const img of selectedImages) {
                    formData.append('images', img);
                }
                res = await apiClient.post(`/tickets/${ticketId}/comments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                // Standard JSON
                res = await apiClient.post(`/tickets/${ticketId}/comments`, {
                    comment_text: newComment,
                    is_internal: isInternal,
                });
            }

            setNewComment("");
            setSelectedImages([]);
            if (onCommentAdded) onCommentAdded(res.data.data.comment);
        } catch (err) {
            console.error("Failed to post comment:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const buildAttachmentUrl = (filePath) => {
        if (!filePath) return '';
        if (filePath.startsWith('http')) return filePath;
        const clean = filePath.replace(/^\/+/, '');
        return `${API_BASE}/${clean}`;
    };

    const [lightboxImg, setLightboxImg] = useState(null);

    return (
        <div className="ticket-conversation glass">
            <div className="conversation-header">
                <h3>ACTIVITY STREAM</h3>
            </div>

            <div className="comments-list" ref={scrollRef}>
                {timeline.length === 0 ? (
                    <div className="empty-state">No activity yet.</div>
                ) : (
                    timeline.map((item) => (
                        <div
                            key={`comment-${item.comment_id}`}
                            className={`comment-bubble ${item.is_internal ? 'internal' : 'public'}`}
                        >
                            <div className="comment-meta">
                                <strong>{item.full_name}</strong>
                                <span className="role-badge">{item.role?.replace('_', ' ')}</span>
                                <span className="timestamp">
                                    {item.timestamp.toLocaleString()}
                                </span>
                                {item.is_internal && <span className="internal-badge">INTERNAL NOTE</span>}
                            </div>
                            <div className="comment-body">
                                {item.comment_text}
                            </div>
                            {/* Inline images */}
                            {item.attachments && item.attachments.length > 0 && (
                                <div className="comment-images">
                                    {item.attachments
                                        .filter(att => att.file_type && att.file_type.startsWith('image/'))
                                        .map((att) => (
                                            <img
                                                key={att.attachment_id}
                                                src={buildAttachmentUrl(att.file_path)}
                                                alt={att.file_name}
                                                className="comment-image-thumb"
                                                onClick={() => setLightboxImg(buildAttachmentUrl(att.file_path))}
                                            />
                                        ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="comment-input-area">
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={isInternal ? "Add an internal note (visible only to IT staff)..." : "Reply to customer..."}
                            disabled={submitting}
                        />
                        <div className="input-overlay">
                            <label className={`toggle-btn ${isInternal ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                />
                                <span>{isInternal ? '🔒 INTERNAL' : '🌍 PUBLIC'}</span>
                            </label>
                            <select className="canned-select" onChange={handleCannedResponse} defaultValue="">
                                <option value="" disabled>RESPONSES...</option>
                                {cannedResponses.map((res, i) => (
                                    <option key={i} value={res}>{res.substring(0, 30)}...</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Image Preview Strip */}
                    {selectedImages.length > 0 && (
                        <div className="image-preview-strip">
                            {selectedImages.map((img, idx) => (
                                <div key={idx} className="preview-thumb-wrap">
                                    <img src={URL.createObjectURL(img)} alt={`preview-${idx}`} className="preview-thumb" />
                                    <button type="button" className="remove-thumb" onClick={() => removeImage(idx)}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="action-row">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleImageSelect}
                        />
                        <button
                            type="button"
                            className="attach-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submitting}
                        >
                            📎 ATTACH IMAGE
                        </button>
                        <button type="submit" className="send-btn" disabled={submitting || (!newComment.trim() && selectedImages.length === 0)}>
                            {submitting ? 'SENDING...' : 'SEND MESSAGE'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Lightbox */}
            {lightboxImg && (
                <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
                    <img src={lightboxImg} alt="Full size" className="lightbox-image" />
                    <button className="lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
                </div>
            )}

            <style>{`
        .ticket-conversation {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
            background: transparent;
        }

        .conversation-header {
            padding: 1.2rem 2rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            background: rgba(15, 23, 42, 0.2);
        }

        .comments-list {
            flex: 1;
            overflow-y: auto;
            padding: 2.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .comment-bubble {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            padding: 1.5rem;
            border-radius: 20px;
            max-width: 90%;
            position: relative;
            transition: transform 0.2s;
        }
        .comment-bubble:hover { transform: scale(1.01); }
        
        .comment-bubble.internal {
            background: rgba(245, 158, 11, 0.05);
            border-color: rgba(245, 158, 11, 0.2);
            align-self: flex-end;
            border-bottom-right-radius: 4px;
        }
        .comment-bubble.public {
            align-self: flex-start;
            border-bottom-left-radius: 4px;
        }

        .comment-meta {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1rem;
            font-size: 0.8rem;
        }
        .comment-meta strong { color: #f1f5f9; font-weight: 700; }
        .role-badge { 
            background: rgba(255,255,255,0.05); 
            padding: 0.1rem 0.5rem; 
            border-radius: 4px; 
            font-size: 0.6rem; 
            font-weight: 800;
            text-transform: uppercase; 
            color: #64748b;
            letter-spacing: 0.05em;
        }
        .timestamp { color: #475569; font-weight: 500; margin-left: auto; }
        .internal-badge {
            color: #f59e0b;
            font-weight: 900;
            font-size: 0.6rem;
            letter-spacing: 0.05em;
        }

        .comment-body {
            color: #d1d5db;
            line-height: 1.7;
            white-space: pre-wrap;
            font-size: 1rem;
        }

        /* Comment inline images */
        .comment-images {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        .comment-image-thumb {
            width: 120px;
            height: 90px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: all 0.2s;
        }
        .comment-image-thumb:hover {
            transform: scale(1.05);
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }

        /* Image preview strip */
        .image-preview-strip {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.8rem;
            flex-wrap: wrap;
        }
        .preview-thumb-wrap {
            position: relative;
            display: inline-block;
        }
        .preview-thumb {
            width: 64px;
            height: 64px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid rgba(59,130,246,0.3);
        }
        .remove-thumb {
            position: absolute;
            top: -6px;
            right: -6px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }

        /* Lightbox */
        .lightbox-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        .lightbox-image {
            max-width: 90vw;
            max-height: 90vh;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .lightbox-close {
            position: absolute;
            top: 1.5rem; right: 1.5rem;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            font-size: 1.2rem;
            border-radius: 50%;
            width: 36px; height: 36px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }

        .comment-input-area {
            padding: 2.5rem;
            background: rgba(15, 23, 42, 0.4);
            border-top: 1px solid rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
        }

        .input-group {
            position: relative;
            margin-bottom: 1.2rem;
            width: 100%;
        }

        .input-overlay {
            position: absolute;
            top: 0.6rem;
            right: 0.6rem;
            display: flex;
            gap: 0.5rem;
            align-items: center;
            z-index: 5;
        }
        
        .toggle-btn {
            font-size: 0.6rem;
            font-weight: 900;
            color: #475569;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255,255,255,0.05);
            transition: all 0.2s;
            letter-spacing: 0.05em;
            white-space: nowrap;
        }
        .toggle-btn:hover { background: rgba(255,255,255,0.06); }
        .toggle-btn.active { 
            color: #f59e0b; 
            background: rgba(245, 158, 11, 0.15); 
            border-color: rgba(245, 158, 11, 0.3);
        }
        .toggle-btn input { display: none; }

        .canned-select {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255,255,255,0.05);
            color: #64748b;
            border-radius: 4px;
            padding: 0.2rem 0.4rem;
            font-size: 0.6rem;
            font-weight: 900;
            cursor: pointer;
            letter-spacing: 0.05em;
            max-width: 120px;
        }
        .canned-select:hover { border-color: #3b82f6; color: #cbd5e1; }
        .canned-select option { background: #0f172a; color: #cbd5e1; }

        textarea {
            width: 100%;
            height: 140px;
            background: rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            color: #f8fafc;
            padding: 1.5rem;
            padding-top: 3.5rem; /* Space for overlay */
            font-family: inherit;
            resize: none;
            font-size: 1rem;
            transition: all 0.3s;
            box-sizing: border-box;
        }
        textarea:focus { 
            outline: none; 
            border-color: rgba(59, 130, 246, 0.4); 
            background: rgba(0,0,0,0.35);
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .action-row {
            display: flex;
            justify-content: space-between;
        }

        .attach-btn {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            color: #64748b;
            padding: 0.5rem 1.2rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: 700;
            transition: all 0.2s;
        }
        .attach-btn:hover:not(:disabled) { border-color: rgba(59,130,246,0.4); color: #60a5fa; background: rgba(59,130,246,0.05); }
        .attach-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .send-btn {
            background: linear-gradient(to bottom right, #3b82f6, #2563eb);
            color: white;
            border: none;
            padding: 0.6rem 2rem;
            border-radius: 8px;
            font-weight: 800;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            letter-spacing: 0.05em;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4); }

        .empty-state {
            text-align: center;
            color: #334155;
            font-size: 0.7rem;
            font-weight: 600;
            margin-top: 2rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        @media (max-width: 1100px) {
            .ticket-conversation {
                height: auto !important;
                overflow: visible !important;
            }
            .comments-list {
                padding: 1rem !important;
                max-height: 500px !important;
            }
            .comment-input-area {
                padding: 1rem !important;
                position: static !important;
                backdrop-filter: none !important;
            }
            .comment-bubble {
                max-width: 95% !important;
            }
        }
      `}</style>
        </div>
    );
};

export default TicketConversation;
