import functions_framework
from google.cloud import bigquery
from langchain_google_vertexai import ChatVertexAI
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
import json
from datetime import datetime, timedelta

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'pulseai_main_db'
table_id = 'arxiv_papers'

class NewsletterState(TypedDict):
    papers: List[dict]
    summaries: List[str]
    final_newsletter: str
    error: str

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

def chunk_papers(state: NewsletterState) -> NewsletterState:
    """Group papers by category for better summarization"""
    papers = state['papers']
    
    # Group by category
    categorized = {}
    for paper in papers:
        category = paper.get('category', 'Other')
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(paper)
    
    state['categorized_papers'] = categorized
    return state

def summarize_category(category: str, papers: List[dict], llm) -> str:
    """Summarize papers in a single category"""
    
    papers_text = "\n\n".join([
        f"Title: {p['title']}\nAbstract: {p['abstract']}"
        for p in papers[:10]  # Limit to avoid token limits
    ])
    
    prompt = f"""You are an AI research newsletter writer. Summarize the following {len(papers)} papers 
    from the category '{category}' into a cohesive 2-3 paragraph summary that highlights:
    1. Main themes and trends
    2. Notable breakthroughs or innovations
    3. Potential implications
    
    Keep the tone professional but accessible. Focus on the big picture rather than individual papers.
    
    Papers:
    {papers_text}
    
    Summary:"""
    
    response = llm.invoke(prompt)
    return response.content

def generate_category_summaries(state: NewsletterState) -> NewsletterState:
    """Generate summaries for each category using LLM"""
    llm = ChatVertexAI(
        model_name="gemini-1.5-pro",
        project=project_id,
        temperature=0.7,
        max_output_tokens=2048
    )
    
    categorized_papers = state.get('categorized_papers', {})
    summaries = []
    
    for category, papers in categorized_papers.items():
        try:
            summary = summarize_category(category, papers, llm)
            summaries.append({
                'category': category,
                'summary': summary,
                'paper_count': len(papers)
            })
        except Exception as e:
            print(f"Error summarizing category {category}: {e}")
            state['error'] = str(e)
    
    state['summaries'] = summaries
    return state

def create_newsletter(state: NewsletterState) -> NewsletterState:
    """Combine category summaries into final newsletter"""
    llm = ChatVertexAI(
        model_name="gemini-1.5-pro",
        project=project_id,
        temperature=0.7,
        max_output_tokens=4096
    )
    
    summaries = state.get('summaries', [])
    total_papers = sum(s['paper_count'] for s in summaries)
    
    # Build the category summaries text
    category_text = "\n\n".join([
        f"## {s['category']} ({s['paper_count']} papers)\n{s['summary']}"
        for s in summaries
    ])
    
    prompt = f"""You are creating the final version of the PulseAI Weekly Newsletter. 
    You have summaries for {len(summaries)} categories covering {total_papers} papers total.
    
    Create a polished newsletter with:
    1. An engaging introduction (2-3 sentences) that captures the week's key highlights
    2. The category summaries (already provided below)
    3. A brief conclusion highlighting cross-cutting themes or future directions
    
    Make it engaging and informative. Use markdown formatting.
    
    Category Summaries:
    {category_text}
    
    Create the complete newsletter:"""
    
    response = llm.invoke(prompt)
    state['final_newsletter'] = response.content
    return state

def save_newsletter(state: NewsletterState, start_date: str, end_date: str) -> NewsletterState:
    """Save newsletter to BigQuery"""
    client = bigquery.Client(project=project_id)
    
    newsletter_data = {
        'newsletter_id': f"weekly_{start_date}_{end_date}",
        'start_date': start_date,
        'end_date': end_date,
        'content': state['final_newsletter'],
        'paper_count': len(state['papers']),
        'category_count': len(state['summaries']),
        'generated_at': datetime.utcnow().isoformat(),
        'version': 'v1_categorized'
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
    workflow.add_node("chunk_papers", chunk_papers)
    workflow.add_node("generate_summaries", generate_category_summaries)
    workflow.add_node("create_newsletter", create_newsletter)
    
    # Define edges
    workflow.set_entry_point("chunk_papers")
    workflow.add_edge("chunk_papers", "generate_summaries")
    workflow.add_edge("generate_summaries", "create_newsletter")
    workflow.add_edge("create_newsletter", END)
    
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
            'summaries': [],
            'final_newsletter': '',
            'error': ''
        }
        
        # Run the graph
        graph = build_newsletter_graph()
        final_state = graph.invoke(initial_state)
        
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
            "category_count": len(final_state['summaries']),
            "start_date": start_date,
            "end_date": end_date,
            "version": "v1_categorized",
            "status": "success"
        }, 200
        
    except Exception as e:
        print(f"Error generating newsletter: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "error": str(e),
            "status": "failed"
        }, 500
