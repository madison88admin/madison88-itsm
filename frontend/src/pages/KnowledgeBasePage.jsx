import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

const KnowledgeBasePage = () => {
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState("");

  const fetchArticles = async () => {
    const res = await apiClient.get("/kb/articles");
    setArticles(res.data.data.articles || []);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) return fetchArticles();
    const res = await apiClient.get("/kb/search", { params: { q: query } });
    setArticles(res.data.data.results || []);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Knowledge Base</h2>
          <p>Search SOPs, FAQs, and troubleshooting guides.</p>
        </div>
        <form className="kb-search" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles"
          />
          <button className="btn ghost" type="submit">
            Search
          </button>
        </form>
      </div>
      <div className="kb-list">
        {articles.map((article) => (
          <div key={article.article_id} className="kb-card">
            <h3>{article.title}</h3>
            <p>{article.summary || "No summary provided."}</p>
            <span>{article.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeBasePage;
