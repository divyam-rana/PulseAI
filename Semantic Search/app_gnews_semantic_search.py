import streamlit as st
from google.cloud import bigquery
import pandas as pd

st.title("News Semantic Search (BigQuery + Streamlit)")

# Initialize BigQuery client
# Assumes the environment is authenticated (e.g., via service account or application default credentials)
client = bigquery.Client()

# User input
query_text = st.text_input("Enter your search text", "Apple expands AI integration beyond ChatGPT")

if st.button("Search"):
    with st.spinner("Fetching results from BigQuery..."):
        # The corrected query uses a subquery structure for VECTOR_SEARCH
        # and correctly removes the invalid 'PARTITION BY' clause.
        query = """
        SELECT
          vs.base.id               AS id,
          vs.base.title            AS title,
          vs.base.url              AS url,
          vs.base.content          AS content,
          vs.base.published_at     AS published_at,
          vs.base.ingest_timestamp AS ingest_timestamp,
          vs.distance              AS distance
        FROM
          VECTOR_SEARCH(
            (
              SELECT *
              FROM `pulseai-team3-ba882-fall25.raw_gnews.gnews_embeddings`
              WHERE DATE(ingest_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            ),
            'content_vector',
            (
              SELECT ml_generate_embedding_result
              FROM ML.GENERATE_EMBEDDING(
                MODEL `pulseai-team3-ba882-fall25.raw_gnews.gnews_embedding_model`,
                (SELECT @content AS content)
              )
            ),
            top_k => 50,              -- Increased to provide more candidates
            distance_type => 'COSINE'
          ) AS vs
        WHERE
          vs.distance <= 0.6          -- Filter out low-similarity results
        ORDER BY
          vs.distance ASC
        LIMIT 10;                      -- Final limit for UI
        """
        

        # Configure job to pass the user input as a query parameter
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("content", "STRING", query_text),
            ]
        )
        
        try:
            # Execute the query and convert results to a Pandas DataFrame
            df = client.query(query, job_config=job_config).result().to_dataframe()

            if df.empty:
                # MODIFIED: Updated warning text to reflect the 7-day window
                st.warning("No results found for your query in the last 7 days.")
            else:
                st.subheader(f"Top {len(df)} Semantic Search Results")
                # Display results with columns relevant to the user
                st.dataframe(
                    df[['title', 'distance', 'published_at', 'url', 'content']],
                    column_config={
                        "title": "Title",
                        "distance": st.column_config.NumberColumn(
                            "Distance (Lower is closer)", format="%.4f"
                        ),
                        "published_at": "Published At",
                        "url": st.column_config.LinkColumn("Source URL"),
                        "content": "Content Snippet",
                    },
                    hide_index=True
                )

        except Exception as e:
            st.error(f"An error occurred while executing the BigQuery job: {e}")
            st.code(query, language="sql")
