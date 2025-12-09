import streamlit as st
from google.cloud import bigquery
import pandas as pd

st.title("Arxiv Semantic Search (Exact)")

# Initialize BigQuery client
client = bigquery.Client()

# User input
query_text = st.text_input("Enter your search text", "neural networks for dynamical systems")

if st.button("Search"):
    with st.spinner("Fetching results from BigQuery..."):
        # SQL query with filters for last 7 days and distance threshold
        query = """
        WITH search_results AS (
            SELECT 
                base.title,
                base.summary,
                base.pdf_url,
                base.published_date,
                ML.DISTANCE(
                    (SELECT ml_generate_embedding_result 
                     FROM ML.GENERATE_EMBEDDING(
                       MODEL `pulseai-team3-ba882-fall25.pulseai_main_db.embedding_model`,
                       (SELECT @content AS content)
                     )), 
                    base.title_embedding, 
                    'COSINE'
                ) AS distance
            FROM `pulseai-team3-ba882-fall25.pulseai_main_db.arxiv_paper_embeddings` AS base
            WHERE base.published_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        )
        SELECT * FROM search_results
        WHERE distance < 0.6
        ORDER BY distance ASC
        LIMIT 5
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
                st.warning("No results found for your query in the last 7 days with distance < 0.6.")
            else:
                st.subheader(f"Top {len(df)} Semantic Search Results")
                # Display results
                st.dataframe(
                    df[['title', 'distance', 'published_date', 'pdf_url', 'summary']],
                    column_config={
                        "title": "Title",
                        "distance": st.column_config.NumberColumn(
                            "Distance (Lower is closer)", format="%.4f"
                        ),
                        "published_date": "Published Date",
                        "pdf_url": st.column_config.LinkColumn("PDF URL"),
                        "summary": "Summary",
                    },
                    hide_index=True
                )

        except Exception as e:
            st.error(f"An error occurred while executing the BigQuery job: {e}")
            st.code(query, language="sql")
