import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize BigQuery client
// Uses service account key file if GOOGLE_APPLICATION_CREDENTIALS is set
// Otherwise falls back to default credentials (useful for Cloud Run with service account)
const bigqueryConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
};

// Use keyFilename if GOOGLE_APPLICATION_CREDENTIALS is set and file exists
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  // Resolve relative paths relative to backend directory
  const resolvedPath = path.isAbsolute(keyPath) 
    ? keyPath 
    : path.join(__dirname, keyPath);
  
  if (fs.existsSync(resolvedPath)) {
    bigqueryConfig.keyFilename = resolvedPath;
    console.log(`Using service account key file: ${resolvedPath}`);
  } else {
    console.warn(`Service account key file not found at: ${resolvedPath}`);
    console.log('Falling back to default credentials (service account or Application Default Credentials)');
  }
} else {
  console.log('No GOOGLE_APPLICATION_CREDENTIALS set, using default credentials');
}

const bigquery = new BigQuery(bigqueryConfig);

const dataset = bigquery.dataset(process.env.BIGQUERY_DATASET);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes - MUST come before static file serving

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Get newsletters data
app.get('/api/newsletters', async (req, res) => {
  try {
    const { limit = 100, tag, startDate, endDate, search } = req.query;
    
    let query = `
      SELECT 
        tag,
        TIMESTAMP(window_start) as window_start,
        TIMESTAMP(window_end) as window_end,
        \`Newsletter Content\` as content,
        TIMESTAMP(created_at) as created_at
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.combined_newsletter\`
    `;
    
    const whereClauses = [];
    
    if (tag) {
      whereClauses.push(`tag = '${tag}'`);
    }
    
    if (startDate) {
      whereClauses.push(`window_end >= TIMESTAMP('${startDate}')`);
    }
    
    if (endDate) {
      whereClauses.push(`window_end <= TIMESTAMP('${endDate}')`);
    }
    
    if (search) {
      whereClauses.push(`LOWER(\`Newsletter Content\`) LIKE '%${search.toLowerCase()}%'`);
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    query += ` ORDER BY window_end DESC LIMIT ${limit}`;

    const [rows] = await bigquery.query({ query });
    
    // Format timestamps for frontend
    const formattedRows = rows.map(row => ({
      tag: row.tag,
      window_start: row.window_start?.value || row.window_start,
      window_end: row.window_end?.value || row.window_end,
      content: row.content,
      created_at: row.created_at?.value || row.created_at
    }));
    
    res.json({ data: formattedRows, count: formattedRows.length });
  } catch (error) {
    console.error('Error querying BigQuery:', error);
    res.status(500).json({ error: error.message });
  }
});

// Example: Get specific table data with filters
app.post('/api/query', async (req, res) => {
  try {
    const { tableName, filters, limit = 100 } = req.body;
    
    let query = `SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.${tableName}\``;
    
    if (filters && Object.keys(filters).length > 0) {
      const whereClause = Object.entries(filters)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    query += ` LIMIT ${limit}`;

    const [rows] = await bigquery.query({ query });
    res.json({ data: rows, count: rows.length });
  } catch (error) {
    console.error('Error querying BigQuery:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all tables in the dataset
app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await dataset.getTables();
    const tableNames = tables.map(table => table.id);
    res.json({ tables: tableNames });
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unique tags
app.get('/api/tags', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT tag
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.combined_newsletter\`
      WHERE tag IS NOT NULL
      ORDER BY tag
    `;
    
    const [rows] = await bigquery.query({ query });
    const tags = rows.map(row => row.tag);
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics/stats
app.get('/api/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_newsletters,
        COUNT(DISTINCT tag) as total_tags,
        MIN(window_end) as earliest_date,
        MAX(window_end) as latest_date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.combined_newsletter\`
    `;
    
    const tagDistQuery = `
      SELECT tag, COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.combined_newsletter\`
      GROUP BY tag
      ORDER BY count DESC
    `;
    
    const [statsRows] = await bigquery.query({ query: statsQuery });
    const [tagDistRows] = await bigquery.query({ query: tagDistQuery });
    
    const stats = statsRows[0];
    res.json({
      total_newsletters: parseInt(stats.total_newsletters),
      total_tags: parseInt(stats.total_tags),
      earliest_date: stats.earliest_date?.value || stats.earliest_date,
      latest_date: stats.latest_date?.value || stats.latest_date,
      tag_distribution: tagDistRows.map(row => ({
        tag: row.tag,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Semantic search for arxiv papers
app.post('/api/semantic-search', async (req, res) => {
  try {
    const { query: searchText, limit = 5, distanceThreshold = 0.6, daysBack = 7 } = req.body;

    if (!searchText) {
      return res.status(400).json({ error: 'Search text is required' });
    }

    const query = `
      WITH search_results AS (
          SELECT 
              base.title,
              base.summary,
              base.pdf_url,
              base.published_date,
              ML.DISTANCE(
                  (SELECT ml_generate_embedding_result 
                   FROM ML.GENERATE_EMBEDDING(
                     MODEL \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.embedding_model\`,
                     (SELECT ? AS content)
                   )), 
                  base.title_embedding, 
                  'COSINE'
              ) AS distance
          FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.arxiv_paper_embeddings\` AS base
          WHERE base.published_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ? DAY)
      )
      SELECT * FROM search_results
      WHERE distance < ?
      ORDER BY distance ASC
      LIMIT ?
    `;

    const options = {
      query: query,
      params: [
        searchText,
        parseInt(daysBack),
        parseFloat(distanceThreshold),
        parseInt(limit)
      ]
    };

    const [rows] = await bigquery.query(options);

    res.json({
      query: searchText,
      results: rows.map(row => ({
        title: row.title,
        summary: row.summary,
        pdf_url: row.pdf_url,
        published_date: row.published_date?.value || row.published_date,
        distance: parseFloat(row.distance)
      })),
      count: rows.length,
      parameters: {
        distanceThreshold: parseFloat(distanceThreshold),
        daysBack: parseInt(daysBack),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error performing semantic search:', error);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get browse analytics (papers, articles, reddit)
app.get('/api/browse-analytics', async (req, res) => {
  try {
    // Get arxiv papers stats
    const papersStatsQuery = `
      SELECT 
        COUNT(*) as total_papers,
        COUNT(DISTINCT category_sk) as total_categories
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.arxiv_papers_tagged\`
    `;
    
    const papersTagDistQuery = `
      SELECT tag, COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.arxiv_papers_tagged\`,
      UNNEST(tags) as tag
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 50
    `;

    // Get news articles stats
    const articlesStatsQuery = `
      SELECT 
        COUNT(*) as total_articles,
        COUNT(DISTINCT source_sk) as total_sources
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.news_articles_tagged\`
    `;
    
    const articlesTagDistQuery = `
      SELECT tag, COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.news_articles_tagged\`,
      UNNEST(tags) as tag
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 50
    `;

    // Get reddit posts stats
    const postsStatsQuery = `
      SELECT 
        COUNT(*) as total_posts,
        COUNT(DISTINCT author_sk) as total_authors
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.reddit_posts_tagged\`
    `;
    
    const postsTagDistQuery = `
      SELECT tag, COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.reddit_posts_tagged\`,
      UNNEST(tags) as tag
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 50
    `;

    // Execute all queries
    const [papersStats] = await bigquery.query({ query: papersStatsQuery });
    const [papersTagDist] = await bigquery.query({ query: papersTagDistQuery });
    const [articlesStats] = await bigquery.query({ query: articlesStatsQuery });
    const [articlesTagDist] = await bigquery.query({ query: articlesTagDistQuery });
    const [postsStats] = await bigquery.query({ query: postsStatsQuery });
    const [postsTagDist] = await bigquery.query({ query: postsTagDistQuery });

    res.json({
      papers: {
        total: parseInt(papersStats[0].total_papers),
        categories: parseInt(papersStats[0].total_categories),
        tag_distribution: papersTagDist.map(row => ({
          tag: row.tag,
          count: parseInt(row.count)
        }))
      },
      articles: {
        total: parseInt(articlesStats[0].total_articles),
        sources: parseInt(articlesStats[0].total_sources),
        tag_distribution: articlesTagDist.map(row => ({
          tag: row.tag,
          count: parseInt(row.count)
        }))
      },
      posts: {
        total: parseInt(postsStats[0].total_posts),
        authors: parseInt(postsStats[0].total_authors),
        tag_distribution: postsTagDist.map(row => ({
          tag: row.tag,
          count: parseInt(row.count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching browse analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get arxiv papers with tags
app.get('/api/arxiv-papers', async (req, res) => {
  try {
    const { limit = 50, tag, search } = req.query;
    
    let query = `
      SELECT 
        paper_id,
        title,
        abstract,
        category_sk,
        TIMESTAMP(published_at) as published_at,
        TIMESTAMP(updated_at) as updated_at,
        TIMESTAMP(_loaded_at) as _loaded_at,
        tags
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.arxiv_papers_tagged\`
    `;
    
    const conditions = [];
    
    if (tag) {
      conditions.push(`'${tag}' IN UNNEST(tags)`);
    }
    
    if (search) {
      conditions.push(`(LOWER(title) LIKE '%${search.toLowerCase()}%' OR LOWER(abstract) LIKE '%${search.toLowerCase()}%')`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY published_at DESC LIMIT ${parseInt(limit)}`;
    
    const [rows] = await bigquery.query(query);
    
    // Format timestamps for frontend
    const formattedRows = rows.map(row => ({
      paper_id: row.paper_id,
      title: row.title,
      abstract: row.abstract,
      category_sk: row.category_sk,
      published_at: row.published_at?.value || row.published_at,
      updated_at: row.updated_at?.value || row.updated_at,
      _loaded_at: row._loaded_at?.value || row._loaded_at,
      tags: row.tags || []
    }));
    
    res.json({
      papers: formattedRows,
      count: formattedRows.length
    });
  } catch (error) {
    console.error('Error fetching arxiv papers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get news articles with tags
app.get('/api/news-articles', async (req, res) => {
  try {
    const { limit = 50, tag, search } = req.query;
    
    let query = `
      SELECT 
        id,
        title,
        description,
        content,
        url,
        image,
        source_sk,
        TIMESTAMP(published_at) as published_at,
        TIMESTAMP(_loaded_at) as _loaded_at,
        tags
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.news_articles_tagged\`
    `;
    
    const conditions = [];
    
    if (tag) {
      conditions.push(`'${tag}' IN UNNEST(tags)`);
    }
    
    if (search) {
      conditions.push(`(LOWER(title) LIKE '%${search.toLowerCase()}%' OR LOWER(description) LIKE '%${search.toLowerCase()}%')`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY published_at DESC LIMIT ${parseInt(limit)}`;
    
    const [rows] = await bigquery.query(query);
    
    // Format timestamps for frontend
    const formattedRows = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      content: row.content,
      url: row.url,
      image: row.image,
      source_sk: row.source_sk,
      published_at: row.published_at?.value || row.published_at,
      _loaded_at: row._loaded_at?.value || row._loaded_at,
      tags: row.tags || []
    }));
    
    res.json({
      articles: formattedRows,
      count: formattedRows.length
    });
  } catch (error) {
    console.error('Error fetching news articles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reddit posts with tags
app.get('/api/reddit-posts', async (req, res) => {
  try {
    const { limit = 50, tag, search } = req.query;
    
    let query = `
      SELECT 
        post_id,
        title,
        author_sk,
        date_sk,
        TIMESTAMP(created_utc) as created_utc,
        TIMESTAMP(_loaded_at) as _loaded_at,
        tags
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.reddit_posts_tagged\`
    `;
    
    const conditions = [];
    
    if (tag) {
      conditions.push(`'${tag}' IN UNNEST(tags)`);
    }
    
    if (search) {
      conditions.push(`LOWER(title) LIKE '%${search.toLowerCase()}%'`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY created_utc DESC LIMIT ${parseInt(limit)}`;
    
    const [rows] = await bigquery.query(query);
    
    // Format timestamps for frontend
    const formattedRows = rows.map(row => ({
      post_id: row.post_id,
      title: row.title,
      author_sk: row.author_sk,
      date_sk: row.date_sk,
      created_utc: row.created_utc?.value || row.created_utc,
      _loaded_at: row._loaded_at?.value || row._loaded_at,
      tags: row.tags || []
    }));
    
    res.json({
      posts: formattedRows,
      count: formattedRows.length
    });
  } catch (error) {
    console.error('Error fetching reddit posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Connected to BigQuery project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  console.log(`📁 Using dataset: ${process.env.BIGQUERY_DATASET}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`📦 Serving frontend from: ${path.join(__dirname, '../frontend/dist')}`);
  }
});
