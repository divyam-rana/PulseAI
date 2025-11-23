# functions/summarize-arxiv-weekly-v2/main.py

import functions_framework
from google.cloud import bigquery
from langchain_google_vertexai import ChatVertexAI
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
import json
from datetime import datetime, timedelta

# Configuration
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'pulseai_main_db'
table_id = 'arxiv_papers'

class NewsletterState(TypedDict):
    papers: List[dict]
    paper_chunks: List[List[dict]]
    chunk_summaries: List[str]
    final_newsletter: str
    error: str
    metadata: dict

def fetch_weekly_papers(start_date: str, end_date: str):
    """Fetch papers from BigQuery for the specified date range"""
    client = bigquery.Client(project=project_id)
    
    query = f"""
    SELECT 
        p.paper_id,
        p.title,
        p.abstract,
        p.published_at,
        c.category_bk as category
    FROM `{project_id}.{dataset_id}.{table_id}` p
    LEFT JOIN `{project_id}.{dataset_id}.arxiv_categories` c
        ON p.category_sk = c.category_sk
    WHERE DATE(p.published_at) BETWEEN '{start_date}' AND '{end_date}'
    ORDER BY p.published_at DESC
    """
    
    results = client.query(query).result()
    papers = []
    
    for row in results:
        papers.append({
            'paper_id': row.paper_id,
            'title': row.title,
            'abstract': row.abstract,
            'published_at': row.published_at.isoformat() if row.published_at else None,
            'category': row.category
        })
    
    return papers

def chunk_papers_by_count(state: NewsletterState) -> NewsletterState:
    """
    Divide papers into chunks of manageable size for summarization.
    Each chunk will be ~15 papers to stay within token limits.
    """
    papers = state['papers']
    chunk_size = 15
    
    chunks = []
    for i in range(0, len(papers), chunk_size):
        chunks.append(papers[i:i + chunk_size])
    
    state['paper_chunks'] = chunks
    state['metadata'] = {
        'total_papers': len(papers),
        'num_chunks': len(chunks),
        'chunk_size': chunk_size
    }
    
    print(f"Divided {len(papers)} papers into {len(chunks)} chunks")
    return state

def summarize_chunk(papers: List[dict], llm, chunk_index: int, total_chunks: int) -> str:
    """
    Summarize a single chunk of papers.
    Focus on extracting key themes, innovations, and trends.
    """
    
    papers_text = "\n\n".join([
        f"Title: {p['title']}\nAbstract: {p['abstract'][:500]}..."  # Limit abstract length
        for p in papers
    ])
    
    prompt = f"""You are an AI research analyst summarizing recent papers for a weekly newsletter.
    
This is chunk {chunk_index + 1} of {total_chunks} covering {len(papers)} papers.

Your task: Extract and summarize the KEY THEMES, INNOVATIONS, and TRENDS from these papers.
Focus on:
1. What problems are being addressed
2. Novel approaches or methodologies
3. Significant results or breakthroughs
4. Common patterns across papers

Write 2-3 concise paragraphs that capture the essence of these papers.
DO NOT list papers individually - synthesize the information into coherent themes.

Papers:
{papers_text}

Summary:"""
    
    response = llm.invoke(prompt)
    return response.content

def generate_chunk_summaries(state: NewsletterState) -> NewsletterState:
    """Generate summaries for each chunk of papers using LLM"""
    llm = ChatVertexAI(
        model_name="gemini-1.5-pro",
        project=project_id,
        temperature=0.7,
        max_output_tokens=2048
    )
    
    paper_chunks = state.get('paper_chunks', [])
    summaries = []
    
    for i, chunk in enumerate(paper_chunks):
        try:
            print(f"Summarizing chunk {i + 1}/{len(paper_chunks)} ({len(chunk)} papers)")
            summary = summarize_chunk(chunk, llm, i, len(paper_chunks))
            summaries.append(summary)
        except Exception as e:
            print(f"Error summarizing chunk {i}: {e}")
            state['error'] = str(e)
            return state
    
    state['chunk_summaries'] = summaries
    return state

def create_final_newsletter(state: NewsletterState) -> NewsletterState:
    """
    Synthesize chunk summaries into a cohesive final newsletter.
    This is the key step that creates the polished output.
    """
    llm = ChatVertexAI(
        model_name="gemini-1.5-pro",
        project=project_id,
        temperature=0.7,
        max_output_tokens=4096
    )
    
    chunk_summaries = state.get('chunk_summaries', [])
    metadata = state.get('metadata', {})
    total_papers = metadata.get('total_papers', 0)
    
    # Combine all chunk summaries
    all_summaries = "\n\n---\n\n".join([
        f"Section {i+1}:\n{summary}"
        for i, summary in enumerate(chunk_summaries)
    ])
    
    prompt = f"""You are the editor-in-chief of PulseAI Weekly, a newsletter covering AI research.

You have {len(chunk_summaries)} section summaries covering {total_papers} papers from this week.
Your task is to synthesize these into a compelling, cohesive newsletter.

Create a newsletter with:

1. **INTRODUCTION (2-3 sentences)**
   - Hook the reader with the week's most exciting development
   - Set context for what's covered

2. **MAIN THEMES (4-6 paragraphs)**
   - Identify 3-5 major themes/trends across all the summaries
   - For each theme, explain:
     * What's being explored
     * Why it matters
     * Notable approaches or findings
   - Make connections between different papers/ideas
   - Use smooth transitions between themes

3. **KEY INNOVATIONS (2-3 paragraphs)**
   - Highlight the most significant breakthroughs or novel approaches
   - Explain potential impact

4. **CONCLUSION (2-3 sentences)**
   - Synthesis: What does this week's research tell us about where AI is heading?
   - Forward-looking statement

STYLE GUIDELINES:
- Professional yet accessible (imagine writing for AI practitioners and enthusiasts)
- Use clear, concrete language
- Avoid listing individual papers
- Focus on synthesis and insight
- Use markdown formatting (##, bold, etc.)
- Aim for ~800-1000 words total

Section Summaries to Synthesize:
{all_summaries}

Write the complete newsletter:"""
    
    response = llm.invoke(prompt)
    state['final_newsletter'] = response.content
    return state

def save_newsletter(state: NewsletterState, start_date: str, end_date: str) -> NewsletterState:
    """Save newsletter to BigQuery"""
    client = bigquery.Client(project=project_id)
    
    metadata = state.get('metadata', {})
    
    newsletter_data = {
        'newsletter_id': f"weekly_{start_date}_{end_date}",
        'start_date': start_date,
        'end_date': end_date,
        'content': state['final_newsletter'],
        'paper_count': metadata.get('total_papers', 0),
        'generated_at': datetime.utcnow().isoformat(),
        'version': 'v2_no_categories',
        'chunk_count': metadata.get('num_chunks', 0)
    }
    
    table_ref = f"{project_id}.{dataset_id}.weekly_newsletters"
    
    try:
        errors = client.insert_rows_json(table_ref, [newsletter_data])
        if errors:
            state['error'] = f"BigQuery insert errors: {errors}"
        else:
            print(f"Newsletter saved successfully: {newsletter_data['newsletter_id']}")
    except Exception as e:
        state['error'] = f"Error saving newsletter: {str(e)}"
    
    return state

def build_newsletter_graph():
    """Build the LangGraph workflow"""
    workflow = StateGraph(NewsletterState)
    
    # Add nodes
    workflow.add_node("chunk_papers", chunk_papers_by_count)
    workflow.add_node("generate_chunk_summaries", generate_chunk_summaries)
    workflow.add_node("create_final_newsletter", create_final_newsletter)
    
    # Define edges
    workflow.set_entry_point("chunk_papers")
    workflow.add_edge("chunk_papers", "generate_chunk_summaries")
    workflow.add_edge("generate_chunk_summaries", "create_final_newsletter")
    workflow.add_edge("create_final_newsletter", END)
    
    return workflow.compile()

@functions_framework.http
def task(request):
    """Main entry point for the Cloud Function"""
    
    # Get date range from request
    end_date = request.args.get("end_date")
    start_date = request.args.get("start_date")
    
    # Default to last 7 days if not specified
    if not end_date:
        end_date = datetime.utcnow().strftime('%Y-%m-%d')
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    print(f"Generating newsletter for {start_date} to {end_date}")
    
    try:
        # Fetch papers
        papers = fetch_weekly_papers(start_date, end_date)
        
        if len(papers) == 0:
            return {
                "message": "No papers found for date range",
                "start_date": start_date,
                "end_date": end_date
            }, 200
        
        print(f"Found {len(papers)} papers")
        
        # Initialize state
        initial_state = {
            'papers': papers,
            'paper_chunks': [],
            'chunk_summaries': [],
            'final_newsletter': '',
            'error': '',
            'metadata': {}
        }
        
        # Run the graph
        graph = build_newsletter_graph()
        final_state = graph.invoke(initial_state)
        
        # Check for errors during processing
        if final_state.get('error'):
            return {
                "error": final_state['error'],
                "status": "failed"
            }, 500
        
        # Save newsletter
        final_state = save_newsletter(final_state, start_date, end_date)
        
        if final_state.get('error'):
            return {
                "error": final_state['error'],
                "status": "failed"
            }, 500
        
        return {
            "newsletter_id": f"weekly_{start_date}_{end_date}",
            "paper_count": len(papers),
            "chunk_count": final_state['metadata'].get('num_chunks', 0),
            "start_date": start_date,
            "end_date": end_date,
            "version": "v2_no_categories",
            "status": "success",
            "preview": final_state['final_newsletter'][:500] + "..."  # First 500 chars
        }, 200
        
    except Exception as e:
        print(f"Error generating newsletter: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "error": str(e),
            "status": "failed"
        }, 500
```

**requirements.txt:**
```
functions-framework==3.*
google-cloud-bigquery==3.*
langchain-google-vertexai==1.*
langgraph==0.2.*
