const db = require('../config/database');

const KB_SYNONYMS = {
  wifi: ['wireless', 'network', 'internet'],
  vpn: ['remote access', 'network'],
  printer: ['printing', 'print'],
  mail: ['email', 'outlook'],
  login: ['signin', 'sign in', 'access'],
};

function buildSearchTerms(rawQuery = '') {
  const base = String(rawQuery || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ');
  const tokens = base.split(/\s+/).filter(Boolean);
  const terms = new Set(tokens);

  for (const token of tokens) {
    const mapped = KB_SYNONYMS[token];
    if (mapped?.length) {
      mapped.forEach((syn) => terms.add(syn));
    }

    // Lightweight typo tolerance: also search by the token prefix.
    if (token.length >= 4) {
      terms.add(token.slice(0, token.length - 1));
    }
  }

  // Keep deterministic ordering and avoid excessive query expansion.
  return Array.from(terms).slice(0, 12);
}

function normalizeQuery(rawQuery = '') {
  return String(rawQuery || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const KnowledgeBaseModel = {
  async listArticles({ category, status, product, role, location, last_updated, page, limit }) {
    const filters = { category, status, product, role, location, last_updated, page, limit };
    const where = [];
    const values = [];

    if (category) {
      values.push(category);
      where.push(`category = $${values.length}`);
    }
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    if (product) {
      values.push(`%${product}%`);
      where.push(`COALESCE(tags, '') ILIKE $${values.length}`);
    }
    if (role) {
      values.push(`%${role}%`);
      where.push(`COALESCE(tags, '') ILIKE $${values.length}`);
    }
    if (location) {
      values.push(`%${location}%`);
      where.push(`COALESCE(tags, '') ILIKE $${values.length}`);
    }
    if (last_updated) {
      values.push(last_updated);
      where.push(`updated_at >= NOW() - (($${values.length}::int) * INTERVAL '1 day')`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await db.query(`SELECT COUNT(*) FROM knowledge_base_articles ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const result = await db.query(
      `SELECT article_id, title, slug, summary, category, tags, author_id, status, views, created_at, updated_at, published_at
       FROM knowledge_base_articles ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return { articles: result.rows, pagination: { page, limit, total } };
  },

  async getArticleById(id) {
    const result = await db.query('SELECT * FROM knowledge_base_articles WHERE article_id = $1', [id]);
    return result.rows[0];
  },

  async getArticleBySlug(slug) {
    const result = await db.query('SELECT * FROM knowledge_base_articles WHERE slug = $1', [slug]);
    return result.rows[0];
  },

  async incrementViews(id) {
    await db.query('UPDATE knowledge_base_articles SET views = views + 1 WHERE article_id = $1', [id]);
  },

  async createArticle(data) {
    const result = await db.query(
      `INSERT INTO knowledge_base_articles
        (title, slug, content, summary, category, tags, author_id, status, created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),$9)
       RETURNING *`,
      [
        data.title,
        data.slug,
        data.content,
        data.summary || null,
        data.category,
        data.tags || null,
        data.author_id,
        data.status,
        data.status === 'published' ? new Date() : null,
      ]
    );
    return result.rows[0];
  },

  async createVersion({ article_id, content, version_number, changed_by, change_summary }) {
    const result = await db.query(
      `INSERT INTO kb_article_versions (article_id, content, version_number, changed_by, change_summary)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [article_id, content, version_number, changed_by, change_summary || null]
    );
    return result.rows[0];
  },

  async updateArticle(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const result = await db.query(
      `UPDATE knowledge_base_articles SET ${setClause}, updated_at = NOW() WHERE article_id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  },

  async searchArticles({ q, category, status, product, role, location, last_updated, page, limit }) {
    const filters = { q, category, status, product, role, location, last_updated, page, limit };
    const where = [];
    const values = [];
    const termParamIndexes = [];

    const terms = buildSearchTerms(q);
    if (!terms.length) {
      return { results: [], pagination: { page, limit, total: 0 } };
    }

    const termClauses = [];
    for (const term of terms) {
      values.push(`%${term}%`);
      const index = values.length;
      termParamIndexes.push(index);
      termClauses.push(`(
        title ILIKE $${index}
        OR summary ILIKE $${index}
        OR content ILIKE $${index}
        OR category ILIKE $${index}
        OR COALESCE(tags, '') ILIKE $${index}
      )`);
    }
    where.push(`(${termClauses.join(' OR ')})`);

    if (category) {
      values.push(category);
      where.push(`category = $${values.length}`);
    }

    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    if (product) {
      values.push(`%${product}%`);
      where.push(`COALESCE(tags, '') ILIKE $${values.length}`);
    }
    if (role) {
      values.push(`%${role}%`);
      where.push(`COALESCE(tags, '') ILIKE $${values.length}`);
    }
    if (location) {
      values.push(`%${location}%`);
      where.push(`COALESCE(tags, '') ILIKE $${values.length}`);
    }
    if (last_updated) {
      values.push(last_updated);
      where.push(`updated_at >= NOW() - (($${values.length}::int) * INTERVAL '1 day')`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await db.query(`SELECT COUNT(*) FROM knowledge_base_articles ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const normalizedQ = normalizeQuery(q);
    values.push(normalizedQ);
    const exactIndex = values.length;
    values.push(`${normalizedQ}%`);
    const prefixIndex = values.length;

    const weightedTermScore = termParamIndexes
      .map(
        (index) => `(
          CASE WHEN title ILIKE $${index} THEN 20 ELSE 0 END
          + CASE WHEN summary ILIKE $${index} THEN 10 ELSE 0 END
          + CASE WHEN category ILIKE $${index} THEN 12 ELSE 0 END
          + CASE WHEN COALESCE(tags, '') ILIKE $${index} THEN 8 ELSE 0 END
          + CASE WHEN content ILIKE $${index} THEN 4 ELSE 0 END
        )`
      )
      .join(' + ');
    const relevanceScoreExpr = `(
      ${weightedTermScore || '0'}
      + CASE WHEN LOWER(title) = $${exactIndex} THEN 100 ELSE 0 END
      + CASE WHEN LOWER(title) LIKE $${prefixIndex} THEN 35 ELSE 0 END
      + CASE WHEN LOWER(category) = $${exactIndex} THEN 25 ELSE 0 END
    )`;

    values.push(limit, offset);
    const result = await db.query(
      `SELECT article_id, title, slug, summary, category, tags, status, views, created_at, updated_at, ${relevanceScoreExpr} AS relevance_score
       FROM knowledge_base_articles ${whereClause}
       ORDER BY relevance_score DESC, updated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return { results: result.rows, pagination: { page, limit, total } };
  },
};

module.exports = KnowledgeBaseModel;
