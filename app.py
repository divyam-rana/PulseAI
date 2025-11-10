import streamlit as st
from google.cloud import bigquery
from google.oauth2 import service_account
import pandas as pd
import os
from pathlib import Path
import pyarrow as pa
import plotly.express as px
import plotly.graph_objects as go



st.set_page_config(
    page_title="PulseAI Newsletter Hub", 
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'About': "PulseAI Newsletter Hub - AI-Powered Content Discovery"
    }
)

# --- Modern Dark Theme (No Hero Header) ---
st.markdown(
    """
    <style>
    /* Dark Theme Base */
    .stApp {
        background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    }
    
    /* Modern Card Styling */
    .metric-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        margin: 10px 0;
    }
    
    /* Glassmorphism Effect */
    .glass-panel {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 30px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    
    /* Header Gradient */
    .hero-header {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
        border-radius: 20px;
        margin-bottom: 30px;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
    }
    
    .hero-title {
        font-size: 48px;
        font-weight: 800;
        background: linear-gradient(120deg, #ffffff 0%, #e0e0ff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        letter-spacing: -1px;
    }
    
    .hero-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 18px;
        margin-top: 10px;
        font-weight: 300;
    }
    
    /* Modern Search Box */
    .search-container {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        margin: 20px 0;
    }
    
    /* Tabs Styling - Compact */
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px;
        border-radius: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
        font-size: 14px;
        padding: 8px 16px;
        transition: all 0.3s;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }
    
    /* Button Styling */
    .stButton>button {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 32px;
        font-weight: 600;
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    
    /* Input Fields */
    .stTextInput>div>div>input,
    .stSelectbox>div>div>div,
    .stMultiSelect>div>div>div {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        color: white;
    }
    
    /* Metric Cards */
    [data-testid="stMetricValue"] {
        font-size: 32px;
        font-weight: 700;
        color: #667eea;
    }
    
    /* DataFrame Styling */
    .stDataFrame {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 10px;
    }
    
    /* Expander */
    .streamlit-expanderHeader {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        color: white;
        font-weight: 600;
    }
    
    /* Icons and Emojis */
    .icon-badge {
        display: inline-block;
        padding: 8px 16px;
        background: rgba(102, 126, 234, 0.2);
        border-radius: 20px;
        margin-right: 10px;
        font-size: 20px;
    }
    
    /* Stats Cards */
    .stat-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin: 10px 0;
    }
    
    /* Text Colors */
    h1, h2, h3, h4, h5, h6, p, label, span {
        color: white !important;
    }
    
    /* Sidebar */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }
    
    ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
    }
    
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
        border-radius: 5px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #764ba2 0%, #667eea 100%);
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Simple Title
st.markdown("""
    <div style='text-align: center; padding: 20px 0 10px 0;'>
        <h1 style='margin: 0; font-size: 42px; font-weight: 800; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
            🚀 PulseAI Newsletter Hub
        </h1>
        <p style='margin: 10px 0 0 0; color: rgba(255,255,255,0.7); font-size: 16px;'>
            AI-Powered Content Discovery & Analytics
        </p>
    </div>
""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Configuration: service account filename and target table
SERVICE_ACCOUNT_FILENAME = "pulseai-team3-ba882-fall25-23668f55c014.json"
PROJECT_ID = "pulseai-team3-ba882-fall25"
# Dataset to enumerate tables from
DATASET_NAME = "pulseai_main_db"
# default table (if present)
DEFAULT_TABLE_ID = "fact_paper"

# UI defaults
DEFAULT_PAGE_SIZE = 50




def _list_rows_to_pandas(list_rows_obj):
    """Convert a BigQuery RowIterator (from list_rows) to a pandas DataFrame using Arrow."""
    try:
        arrow_table = list_rows_obj.to_arrow()
        return arrow_table.to_pandas()
    except Exception:
        # As a final fallback, try to_dataframe (may require db-dtypes) and surface errors upstream
        return list_rows_obj.to_dataframe()


def _query_result_to_pandas(query_job):
    """Convert a BigQuery QueryJob result to pandas using Arrow first, fallback to to_dataframe."""
    try:
        # prefer Arrow path
        arrow_tbl = query_job.result().to_arrow()
        return arrow_tbl.to_pandas()
    except Exception:
        return query_job.result().to_dataframe()




def find_service_account_file(filename: str) -> str:
    """Try to find the service account file in several common locations and return its path.

    Search order:
    - Absolute path if provided
    - Current working directory
    - Directory of this script
    - Parent directory of script
    """
    # Absolute path
    if os.path.isabs(filename) and os.path.exists(filename):
        return filename

    # CWD
    cwd_path = Path(os.getcwd()) / filename
    if cwd_path.exists():
        return str(cwd_path)

    # Script dir
    script_dir = Path(__file__).resolve().parent
    script_path = script_dir / filename
    if script_path.exists():
        return str(script_path)

    # Parent of script dir
    parent_path = script_dir.parent / filename
    if parent_path.exists():
        return str(parent_path)

    # Not found
    return ""


sa_path = find_service_account_file(SERVICE_ACCOUNT_FILENAME)
if not sa_path:
    st.error(f"Service account file '{SERVICE_ACCOUNT_FILENAME}' not found. Place it in the app folder or parent folder.")
    st.stop()

try:
    credentials = service_account.Credentials.from_service_account_file(sa_path)
except Exception as e:
    st.error(f"Failed to load service account: {e}")
    st.stop()

client = bigquery.Client(credentials=credentials, project=PROJECT_ID)

# List tables in the dataset and show a dropdown to pick one
dataset_ref = f"{PROJECT_ID}.{DATASET_NAME}"
try:
    table_items = list(client.list_tables(dataset_ref))
    tables = [t.table_id for t in table_items]
except Exception as e:
    st.error(f"Failed to list tables in {dataset_ref}: {e}")
    st.stop()

if not tables:
    st.error(f"No tables found in dataset {dataset_ref}")
    st.stop()

default_index = tables.index(DEFAULT_TABLE_ID) if DEFAULT_TABLE_ID in tables else 0
# Sidebar controls
with st.sidebar:
    st.markdown("""
        <div style='text-align:center; padding:20px 0;'>
            <div style='font-size:28px; font-weight:800; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                ⚙️ Settings
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown("### 🔌 Connection")
    st.info(f"**Project:** {PROJECT_ID}")
    st.info(f"**Dataset:** {DATASET_NAME}")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown("### 📊 Table Selection")
    selected_table = st.selectbox(
        "Choose a table",
        tables,
        index=default_index,
        help="Select which table to explore"
    )
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown("### ⚡ View Options")
    page_size = st.slider(
        "Rows per page",
        min_value=10,
        max_value=500,
        value=DEFAULT_PAGE_SIZE,
        step=10,
        help="Number of rows to display per page"
    )
    fetch_all = st.checkbox(
        "🚀 Fetch all rows",
        value=False,
        help="⚠️ Warning: May load large datasets"
    )
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Quick Stats
    st.markdown("### 📈 Quick Info")
    try:
        temp_table = client.get_table(f"{PROJECT_ID}.{DATASET_NAME}.{selected_table}")
        st.metric("Total Rows", f"{temp_table.num_rows:,}")
        st.metric("Size", f"{temp_table.num_bytes / (1024**2):.2f} MB")
    except:
        pass
    
    st.markdown("<br><br>", unsafe_allow_html=True)
    
    st.markdown("""
        <div style='background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 10px; border-left: 4px solid #667eea;'>
            <div style='font-size: 12px; color: rgba(255,255,255,0.8);'>
                💡 <strong>Pro Tip:</strong><br>
                Use the <strong>Search</strong> tab for advanced filtering and the <strong>Dashboard</strong> for visualizations.
            </div>
        </div>
    """, unsafe_allow_html=True)

full_table_id = f"{PROJECT_ID}.{DATASET_NAME}.{selected_table}"

st.markdown(f"""
    <div class='metric-card'>
        <div style='font-size: 14px; color: rgba(255,255,255,0.7);'>Current Table</div>
        <div style='font-size: 18px; font-weight: 600; color: #667eea; margin-top: 5px;'>{full_table_id}</div>
    </div>
""", unsafe_allow_html=True)

with st.spinner("Loading table metadata..."):
    try:
        table = client.get_table(full_table_id)
    except Exception as e:
        st.exception(e)
        st.stop()

# Create schema dataframe for use in Schema tab (don't display here)
schema_df = pd.DataFrame([
    {"name": f.name, "type": f.field_type, "mode": f.mode, "description": f.description}
    for f in table.schema
])

# Tabs for a cleaner experience
tab_table, tab_schema, tab_search, tab_dashboard = st.tabs(["Table", "Schema", "Search", "Dashboard"])

def detect_columns_by_type(schema):
    text_cols = [f.name for f in schema if f.field_type.upper() in ("STRING", "BYTES")]
    date_cols = [f.name for f in schema if f.field_type.upper() in ("TIMESTAMP", "DATE", "DATETIME")]
    num_cols = [f.name for f in schema if f.field_type.upper() in ("INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC")]
    tags_col = next((f.name for f in schema if "tag" in f.name.lower()), None)
    return text_cols, date_cols, num_cols, tags_col

text_cols, date_cols, num_cols, tags_col = detect_columns_by_type(table.schema)

# Enable search for ALL tables
search_df = None
with tab_search:
    # Modern Search Header
    st.markdown("""
        <div class='glass-panel' style='padding: 15px;'>
            <h3 style='margin:0; font-size: 20px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                🔍 Advanced Search
            </h3>
            <p style='color: rgba(255,255,255,0.7); margin-top: 5px; font-size: 13px;'>
                Powerful multi-filter search across your content library
            </p>
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Filters section
    with st.expander("⚡ Advanced Filters", expanded=True):
        col1, col2, col3 = st.columns(3)
        
        with col1:
            # Tag filter
            selected_tags = []
            if tags_col:
                st.markdown(f"<div class='icon-badge'>🏷️</div> **{tags_col.upper()}**", unsafe_allow_html=True)
                # Get unique tags from the table - handle ARRAY type
                try:
                    # UNNEST the array to get individual tags
                    tags_query = f"""
                        SELECT DISTINCT tag 
                        FROM `{full_table_id}`, 
                        UNNEST(`{tags_col}`) as tag 
                        WHERE tag IS NOT NULL 
                        ORDER BY tag
                    """
                    tags_job = client.query(tags_query)
                    tags_result = _query_result_to_pandas(tags_job)
                    if not tags_result.empty and 'tag' in tags_result.columns:
                        available_tags = tags_result['tag'].dropna().unique().tolist()
                        selected_tags = st.multiselect(
                            "Select tags to filter",
                            available_tags,
                            help="Filter content by specific tags"
                        )
                except Exception as e:
                    st.warning(f"Tags filter unavailable: {str(e)[:100]}")
        
        with col2:
            # Date filter
            use_date_filter = False
            start_date = None
            end_date = None
            if date_cols:
                st.markdown(f"<div class='icon-badge'>📅</div> **DATE RANGE**", unsafe_allow_html=True)
                use_date_filter = st.checkbox("Enable date filter", help="Filter by publication date")
                if use_date_filter:
                    date_col_choice = st.selectbox("Date column", date_cols)
                    col_d1, col_d2 = st.columns(2)
                    with col_d1:
                        start_date = st.date_input("From", help="Start date")
                    with col_d2:
                        end_date = st.date_input("To", help="End date")
        
        with col3:
            # Additional filters
            st.markdown(f"<div class='icon-badge'>⚙️</div> **OPTIONS**", unsafe_allow_html=True)
            result_limit = st.number_input(
                "Max results",
                min_value=10,
                max_value=10000,
                value=100,
                step=10,
                help="Maximum number of results to return"
            )
            sort_order = st.selectbox(
                "Sort by",
                ["Relevance", "Newest First", "Oldest First"],
                help="Result ordering"
            )
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Search section with modern styling
    st.markdown("""
        <div class='search-container'>
            <h3 style='margin-top:0;'>🎯 Search Query</h3>
        </div>
    """, unsafe_allow_html=True)
    
    col_search1, col_search2 = st.columns([3, 1])
    with col_search1:
        search_term = st.text_input(
            "Enter search keywords",
            placeholder="e.g., artificial intelligence, machine learning, neural networks...",
            label_visibility="collapsed"
        )
    with col_search2:
        search_btn = st.button("🔎 Search", use_container_width=True, type="primary")
    
    # detect likely text columns
    likely_cols = [f.name for f in table.schema if f.field_type.upper() in ("STRING", "BYTES") and f.name.lower() in ("title", "abstract", "content", "body", "text", "selftext", "summary", "description")]
    if not likely_cols:
        likely_cols = [f.name for f in table.schema if f.field_type.upper() in ("STRING", "BYTES")]

    col_choice = st.multiselect(
        "🔎 Search in columns",
        likely_cols or [f.name for f in table.schema],
        default=likely_cols[:3] if likely_cols else None,
        help="Select which columns to search within"
    )


    if search_btn and search_term:
        if not col_choice:
            st.warning("⚠️ Please select one or more columns to search.")
        else:
            with st.spinner("🔄 Searching..."):
                # build WHERE using selected columns
                where_clauses = [" OR ".join([f"`{c}` LIKE @search" for c in col_choice])]
                query_params = [bigquery.ScalarQueryParameter("search", "STRING", f"%{search_term}%")]
                
                # Add tag filter - handle ARRAY type
                if selected_tags and tags_col:
                    # Use EXISTS with UNNEST to check if any tag in the array matches
                    tag_conditions = " OR ".join([f"tag = @tag{i}" for i in range(len(selected_tags))])
                    where_clauses.append(f"EXISTS(SELECT 1 FROM UNNEST(`{tags_col}`) as tag WHERE {tag_conditions})")
                    for i, tag in enumerate(selected_tags):
                        query_params.append(bigquery.ScalarQueryParameter(f"tag{i}", "STRING", tag))
                
                # Add date filter
                if use_date_filter and start_date and end_date:
                    where_clauses.append(f"`{date_col_choice}` BETWEEN @start_date AND @end_date")
                    query_params.append(bigquery.ScalarQueryParameter("start_date", "DATE", start_date))
                    query_params.append(bigquery.ScalarQueryParameter("end_date", "DATE", end_date))
                
                where_sql = " AND ".join([f"({clause})" for clause in where_clauses])
                
                # Add sorting
                order_by = ""
                if sort_order == "Newest First" and date_cols:
                    order_by = f" ORDER BY `{date_cols[0]}` DESC"
                elif sort_order == "Oldest First" and date_cols:
                    order_by = f" ORDER BY `{date_cols[0]}` ASC"
                
                query_sql = f"SELECT * FROM `{full_table_id}` WHERE {where_sql}{order_by} LIMIT @max_rows"
                query_params.append(bigquery.ScalarQueryParameter("max_rows", "INT64", int(result_limit)))
                
                job_config = bigquery.QueryJobConfig(query_parameters=query_params)

                try:
                    job = client.query(query_sql, job_config=job_config)
                    # convert via Arrow to pandas
                    search_df = _query_result_to_pandas(job)
                    
                    # Display results with modern cards
                    st.markdown(f"""
                        <div class='metric-card'>
                            <h3 style='margin:0;'>✨ Search Results</h3>
                            <p style='color: rgba(255,255,255,0.7); margin:5px 0 0 0;'>
                                Found <strong>{len(search_df)}</strong> matching items
                            </p>
                        </div>
                    """, unsafe_allow_html=True)
                    
                    st.dataframe(search_df, use_container_width=True, height=600)
                    
                    col_dl1, col_dl2, col_dl3 = st.columns([1, 1, 2])
                    with col_dl1:
                        csv = search_df.to_csv(index=False)
                        st.download_button(
                            "📥 Download CSV",
                            csv,
                            file_name=f"{selected_table}_search_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv",
                            mime="text/csv",
                            use_container_width=True
                        )
                    with col_dl2:
                        json_data = search_df.to_json(orient='records', indent=2)
                        st.download_button(
                            "📄 Download JSON",
                            json_data,
                            file_name=f"{selected_table}_search_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.json",
                            mime="application/json",
                            use_container_width=True
                        )
                except Exception as e:
                    st.error(f"❌ Search failed: {str(e)}")
                    st.exception(e)


# -------------------- Table tab: paginated view --------------------
with tab_table:
    st.markdown("""
        <div class='glass-panel' style='padding: 15px;'>
            <h3 style='margin:0; font-size: 20px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                📋 Browse: {table_name}
            </h3>
        </div>
    """.format(table_name=selected_table), unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Tag filter for browsing
    browse_selected_tags = []
    if tags_col:
        with st.expander("🏷️ Filter by Tags", expanded=False):
            try:
                # UNNEST the array to get individual tags
                tags_query = f"""
                    SELECT DISTINCT tag 
                    FROM `{full_table_id}`, 
                    UNNEST(`{tags_col}`) as tag 
                    WHERE tag IS NOT NULL 
                    ORDER BY tag
                """
                tags_job = client.query(tags_query)
                tags_result = _query_result_to_pandas(tags_job)
                if not tags_result.empty and 'tag' in tags_result.columns:
                    available_tags = tags_result['tag'].dropna().unique().tolist()
                    browse_selected_tags = st.multiselect(
                        "Select tags to filter table",
                        available_tags,
                        key="browse_tags",
                        help="Filter rows by specific tags"
                    )
            except Exception as e:
                st.warning(f"Tag filter unavailable: {str(e)[:100]}")
    
    # pagination state
    if "start_index" not in st.session_state:
        st.session_state.start_index = 0

    col_a, col_b, col_c = st.columns([1, 1, 2])
    with col_a:
        if st.button("⬅️ Previous", use_container_width=True):
            st.session_state.start_index = max(0, st.session_state.start_index - page_size)
    with col_b:
        if st.button("Next ➡️", use_container_width=True):
            st.session_state.start_index = st.session_state.start_index + page_size
    with col_c:
        st.info(f"📄 Rows {st.session_state.start_index + 1} to {st.session_state.start_index + page_size}")
    
    # allow selecting visible columns
    visible_cols = st.multiselect(
        "📊 Select columns to display",
        [f.name for f in table.schema],
        default=[f.name for f in table.schema][:10],
        help="Choose which columns to show in the table"
    )

    with st.spinner("🔄 Loading data..."):
        try:
            if browse_selected_tags and tags_col:
                # Use query with tag filter instead of list_rows
                tag_conditions = " OR ".join([f"tag = @tag{i}" for i in range(len(browse_selected_tags))])
                filter_query = f"""
                    SELECT * FROM `{full_table_id}`
                    WHERE EXISTS(SELECT 1 FROM UNNEST(`{tags_col}`) as tag WHERE {tag_conditions})
                    LIMIT @page_size OFFSET @offset
                """
                query_params = [
                    bigquery.ScalarQueryParameter("page_size", "INT64", int(page_size)),
                    bigquery.ScalarQueryParameter("offset", "INT64", st.session_state.start_index)
                ]
                for i, tag in enumerate(browse_selected_tags):
                    query_params.append(bigquery.ScalarQueryParameter(f"tag{i}", "STRING", tag))
                
                job_config = bigquery.QueryJobConfig(query_parameters=query_params)
                page_job = client.query(filter_query, job_config=job_config)
                page = _query_result_to_pandas(page_job)
            else:
                # list_rows supports start_index and max_results; use Arrow conversion
                page_rows = client.list_rows(table, start_index=st.session_state.start_index, max_results=int(page_size))
                page = _list_rows_to_pandas(page_rows)
            
            if visible_cols:
                page = page[[c for c in visible_cols if c in page.columns]]
            
            st.dataframe(page, use_container_width=True, height=500)
            
            col_dl1, col_dl2 = st.columns(2)
            with col_dl1:
                st.download_button(
                    "📥 Download Page CSV",
                    page.to_csv(index=False),
                    file_name=f"{selected_table}_page_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv",
                    use_container_width=True
                )
            with col_dl2:
                st.download_button(
                    "📄 Download Page JSON",
                    page.to_json(orient='records', indent=2),
                    file_name=f"{selected_table}_page_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json",
                    use_container_width=True
                )
        except Exception as e:
            st.error(f"❌ Failed to load data: {str(e)}")
            st.exception(e)

    st.markdown("---")

with tab_schema:
    st.header("Schema")
    st.dataframe(schema_df)

# -------------------- Dashboard tab: auto charts --------------------
with tab_dashboard:
    st.markdown("""
        <div class='glass-panel' style='padding: 15px;'>
            <h3 style='margin:0; font-size: 20px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                📊 Analytics Dashboard
            </h3>
            <p style='color: rgba(255,255,255,0.7); margin-top: 5px; font-size: 13px;'>
                Real-time insights and visualizations from your content
            </p>
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Filters section for dashboard
    with st.expander("🎯 Dashboard Filters", expanded=False):
        dashboard_selected_tags = []
        dashboard_use_date_filter = False
        dashboard_start_date = None
        dashboard_end_date = None
        dashboard_date_col_choice = None
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Tag filter
            if tags_col:
                st.markdown(f"<div class='icon-badge'>🏷️</div> **{tags_col.upper()}**", unsafe_allow_html=True)
                try:
                    # UNNEST the array to get individual tags
                    tags_query = f"""
                        SELECT DISTINCT tag 
                        FROM `{full_table_id}`, 
                        UNNEST(`{tags_col}`) as tag 
                        WHERE tag IS NOT NULL 
                        ORDER BY tag
                    """
                    tags_job = client.query(tags_query)
                    tags_result = _query_result_to_pandas(tags_job)
                    if not tags_result.empty and 'tag' in tags_result.columns:
                        available_tags = tags_result['tag'].dropna().unique().tolist()
                        dashboard_selected_tags = st.multiselect("Select tags for dashboard", available_tags, key="dashboard_tags")
                except Exception as e:
                    st.warning(f"Tags filter unavailable: {str(e)[:100]}")
        
        with col2:
            # Date filter
            if date_cols:
                st.markdown(f"<div class='icon-badge'>📅</div> **DATE RANGE**", unsafe_allow_html=True)
                dashboard_use_date_filter = st.checkbox("Filter dashboard by date", key="dashboard_date_filter")
                if dashboard_use_date_filter:
                    dashboard_date_col_choice = st.selectbox("Date column", date_cols, key="dashboard_date_col")
                    col_d1, col_d2 = st.columns(2)
                    with col_d1:
                        dashboard_start_date = st.date_input("Start date", key="dashboard_start")
                    with col_d2:
                        dashboard_end_date = st.date_input("End date", key="dashboard_end")
    
    # Build WHERE clause for dashboard queries
    dashboard_where_clauses = []
    dashboard_query_params = []
    
    if dashboard_selected_tags and tags_col:
        # Use EXISTS with UNNEST to check if any tag in the array matches
        tag_conditions = " OR ".join([f"tag = @dtag{i}" for i in range(len(dashboard_selected_tags))])
        dashboard_where_clauses.append(f"EXISTS(SELECT 1 FROM UNNEST(`{tags_col}`) as tag WHERE {tag_conditions})")
        for i, tag in enumerate(dashboard_selected_tags):
            dashboard_query_params.append(bigquery.ScalarQueryParameter(f"dtag{i}", "STRING", tag))
    
    if dashboard_use_date_filter and dashboard_start_date and dashboard_end_date and dashboard_date_col_choice:
        dashboard_where_clauses.append(f"`{dashboard_date_col_choice}` BETWEEN @dstart_date AND @dend_date")
        dashboard_query_params.append(bigquery.ScalarQueryParameter("dstart_date", "DATE", dashboard_start_date))
        dashboard_query_params.append(bigquery.ScalarQueryParameter("dend_date", "DATE", dashboard_end_date))
    
    # Helper function to add WHERE clause
    def build_where_sql(additional_conditions=None):
        all_conditions = dashboard_where_clauses.copy()
        if additional_conditions:
            if isinstance(additional_conditions, list):
                all_conditions.extend(additional_conditions)
            else:
                all_conditions.append(additional_conditions)
        return " WHERE " + " AND ".join(all_conditions) if all_conditions else ""
    
    dashboard_job_config = bigquery.QueryJobConfig(query_parameters=dashboard_query_params) if dashboard_query_params else None

    # total rows metric
    # total rows metric with modern card
    col_metric1, col_metric2, col_metric3 = st.columns(3)
    
    with col_metric1:
        try:
            total_q = f"SELECT COUNT(1) as cnt FROM `{full_table_id}`{build_where_sql()}"
            if dashboard_job_config:
                total_df = _query_result_to_pandas(client.query(total_q, job_config=dashboard_job_config))
            else:
                total_df = _query_result_to_pandas(client.query(total_q))
            total = total_df.iloc[0, 0]
            st.markdown(f"""
                <div class='stat-card'>
                    <div style='font-size: 14px; color: rgba(255,255,255,0.7);'>Total Items</div>
                    <div style='font-size: 36px; font-weight: 700; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                        {int(total):,}
                    </div>
                    <div style='font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 5px;'>
                        {'Filtered' if dashboard_where_clauses else 'All records'}
                    </div>
                </div>
            """, unsafe_allow_html=True)
        except Exception:
            st.error("Failed to compute total")
    
    with col_metric2:
        if date_cols:
            try:
                # Get latest date
                latest_q = f"SELECT MAX(`{date_cols[0]}`) as latest FROM `{full_table_id}`{build_where_sql()}"
                if dashboard_job_config:
                    latest_df = _query_result_to_pandas(client.query(latest_q, job_config=dashboard_job_config))
                else:
                    latest_df = _query_result_to_pandas(client.query(latest_q))
                latest_date = latest_df.iloc[0, 0]
                st.markdown(f"""
                    <div class='stat-card'>
                        <div style='font-size: 14px; color: rgba(255,255,255,0.7);'>Latest Content</div>
                        <div style='font-size: 24px; font-weight: 600; color: #667eea; margin-top: 10px;'>
                            {pd.to_datetime(latest_date).strftime('%b %d, %Y') if latest_date else 'N/A'}
                        </div>
                    </div>
                """, unsafe_allow_html=True)
            except Exception:
                pass
    
    with col_metric3:
        if tags_col:
            try:
                # Count unique tags
                unique_tags_q = f"""
                    SELECT COUNT(DISTINCT tag) as cnt 
                    FROM `{full_table_id}`, 
                    UNNEST(`{tags_col}`) as tag
                    {build_where_sql()}
                """
                if dashboard_job_config:
                    unique_tags_df = _query_result_to_pandas(client.query(unique_tags_q, job_config=dashboard_job_config))
                else:
                    unique_tags_df = _query_result_to_pandas(client.query(unique_tags_q))
                unique_tag_count = unique_tags_df.iloc[0, 0]
                st.markdown(f"""
                    <div class='stat-card'>
                        <div style='font-size: 14px; color: rgba(255,255,255,0.7);'>Unique Tags</div>
                        <div style='font-size: 36px; font-weight: 700; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                            {int(unique_tag_count):,}
                        </div>
                    </div>
                """, unsafe_allow_html=True)
            except Exception:
                pass
    
    st.markdown("<br>", unsafe_allow_html=True)

    # Tag distribution visualization
    if tags_col:
        st.markdown("""
            <div class='glass-panel' style='padding: 12px;'>
                <h4 style='margin:0; font-size: 16px; color: white;'>📊 Tag Distribution</h4>
            </div>
        """, unsafe_allow_html=True)
        try:
            # UNNEST the array for tag distribution
            tag_dist_q = f"""
                SELECT tag, COUNT(1) as cnt 
                FROM `{full_table_id}`, 
                UNNEST(`{tags_col}`) as tag
                {build_where_sql('tag IS NOT NULL')}
                GROUP BY tag 
                ORDER BY cnt DESC 
                LIMIT 20
            """
            if dashboard_job_config:
                tag_dist_df = _query_result_to_pandas(client.query(tag_dist_q, job_config=dashboard_job_config))
            else:
                tag_dist_df = _query_result_to_pandas(client.query(tag_dist_q))
            if not tag_dist_df.empty:
                # Use plotly for better visualization
                import plotly.express as px
                fig = px.bar(
                    tag_dist_df,
                    x='cnt',
                    y='tag',
                    orientation='h',
                    title='Top 20 Tags by Frequency',
                    labels={'cnt': 'Count', 'tag': 'Tag'},
                    color='cnt',
                    color_continuous_scale='Viridis'
                )
                fig.update_layout(
                    plot_bgcolor='rgba(0,0,0,0)',
                    paper_bgcolor='rgba(0,0,0,0)',
                    font=dict(color='white'),
                    height=500,
                    showlegend=False
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No tag data available.")
        except Exception as e:
            st.warning(f"Tag distribution unavailable: {str(e)[:150]}")

    # time series if date column exists
    if date_cols:
        date_col = date_cols[0]
        st.markdown("""
            <div class='glass-panel' style='padding: 12px;'>
                <h4 style='margin:0; font-size: 16px; color: white;'>📈 Time Series Trends</h4>
            </div>
        """, unsafe_allow_html=True)
        try:
            ts_q = f"SELECT DATE(`{date_col}`) as day, COUNT(1) as cnt FROM `{full_table_id}`{build_where_sql()} GROUP BY day ORDER BY day DESC LIMIT 365"
            if dashboard_job_config:
                ts_df = _query_result_to_pandas(client.query(ts_q, job_config=dashboard_job_config))
            else:
                ts_df = _query_result_to_pandas(client.query(ts_q))
            if not ts_df.empty:
                ts_df = ts_df.sort_values("day")
                import plotly.graph_objects as go
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=ts_df['day'],
                    y=ts_df['cnt'],
                    mode='lines+markers',
                    name='Content Count',
                    line=dict(color='#667eea', width=3),
                    marker=dict(size=6, color='#764ba2'),
                    fill='tozeroy',
                    fillcolor='rgba(102, 126, 234, 0.2)'
                ))
                fig.update_layout(
                    plot_bgcolor='rgba(0,0,0,0)',
                    paper_bgcolor='rgba(0,0,0,0)',
                    font=dict(color='white'),
                    xaxis_title='Date',
                    yaxis_title='Count',
                    height=400,
                    hovermode='x unified'
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No time-series data available.")
        except Exception as e:
            st.warning(f"Time series chart unavailable: {str(e)[:150]}")

    # top categories for text-like categorical columns
    if text_cols:
        # choose best candidate for category
        candidates = [c for c in text_cols if c.lower() in ("subreddit", "category", "source", "journal", "venue", "author")]
        if not candidates and text_cols:
            candidates = text_cols[:1]
        if candidates:
            cat = candidates[0]
            st.markdown(f"""
                <div class='glass-panel' style='padding: 12px;'>
                    <h4 style='margin:0; font-size: 16px; color: white;'>📊 Top {cat.title()}</h4>
                </div>
            """, unsafe_allow_html=True)
            try:
                cat_q = f"SELECT `{cat}` as value, COUNT(1) as cnt FROM `{full_table_id}`{build_where_sql(f'`{cat}` IS NOT NULL')} GROUP BY value ORDER BY cnt DESC LIMIT 15"
                if dashboard_job_config:
                    cat_df = _query_result_to_pandas(client.query(cat_q, job_config=dashboard_job_config))
                else:
                    cat_df = _query_result_to_pandas(client.query(cat_q))
                if not cat_df.empty:
                    import plotly.express as px
                    fig = px.bar(
                        cat_df,
                        x='value',
                        y='cnt',
                        title=f'Top 15 {cat.title()}',
                        labels={'cnt': 'Count', 'value': cat.title()},
                        color='cnt',
                        color_continuous_scale='Purples'
                    )
                    fig.update_layout(
                        plot_bgcolor='rgba(0,0,0,0)',
                        paper_bgcolor='rgba(0,0,0,0)',
                        font=dict(color='white'),
                        height=450,
                        showlegend=False,
                        xaxis_tickangle=-45
                    )
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No category data available.")
            except Exception as e:
                st.warning(f"Category chart unavailable: {str(e)[:150]}")

    # numeric summaries
    if num_cols:
        st.markdown("""
            <div class='glass-panel' style='padding: 12px;'>
                <h4 style='margin:0; font-size: 16px; color: white;'>📊 Numeric Insights</h4>
            </div>
        """, unsafe_allow_html=True)
        
        cols_num = st.columns(min(3, len(num_cols)))
        for idx, n in enumerate(num_cols[:3]):
            with cols_num[idx]:
                try:
                    num_q = f"SELECT COUNT(1) as cnt, AVG(`{n}`) as avg, MIN(`{n}`) as min, MAX(`{n}`) as max FROM `{full_table_id}`{build_where_sql()}"
                    if dashboard_job_config:
                        num_df = _query_result_to_pandas(client.query(num_q, job_config=dashboard_job_config))
                    else:
                        num_df = _query_result_to_pandas(client.query(num_q))
                    if not num_df.empty:
                        row = num_df.iloc[0]
                        st.markdown(f"""
                            <div class='stat-card'>
                                <div style='font-size: 16px; font-weight: 600; color: white; margin-bottom: 10px;'>{n}</div>
                                <div style='font-size: 12px; color: rgba(255,255,255,0.6);'>Avg: <span style='color: #667eea; font-weight: 600;'>{row['avg']:.2f}</span></div>
                                <div style='font-size: 12px; color: rgba(255,255,255,0.6);'>Min: {row['min']} | Max: {row['max']}</div>
                                <div style='font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 5px;'>Count: {int(row['cnt']):,}</div>
                            </div>
                        """, unsafe_allow_html=True)
                except Exception as e:
                    st.warning(f"Numeric summary unavailable for {n}")

    st.markdown("---")

    try:
        if fetch_all:
            rows_iter = client.list_rows(table)
        else:
            rows_iter = client.list_rows(table, max_results=int(page_size))
        rows = _list_rows_to_pandas(rows_iter)

    except ValueError:
        # to_dataframe may require db-dtypes; try Arrow fallback
        # st.warning("Encountered ValueError while converting to pandas. Trying Arrow-based fallback (requires `pyarrow`).")
        try:
            if fetch_all:
                arrow_table = client.list_rows(table).to_arrow()
            else:
                arrow_table = client.list_rows(table, max_results=int(page_size)).to_arrow()
            rows = arrow_table.to_pandas()
            st.info("Loaded table via Arrow fallback.")
        except Exception as e2:
            st.error("Failed to load table via Arrow fallback. Please install the 'db-dtypes' package in the Python environment running Streamlit and restart the app.")
            st.code("pip install db-dtypes")
            st.exception(e2)
            st.stop()
    except Exception as e:
        st.exception(e)
        st.stop()

    # show the loaded rows
    st.write(f"Loaded rows: {len(rows)} — columns: {len(rows.columns)}")
    st.dataframe(rows)

    csv = rows.to_csv(index=False)
    st.download_button("Download CSV", csv, file_name=f"{selected_table}.csv", mime="text/csv")

