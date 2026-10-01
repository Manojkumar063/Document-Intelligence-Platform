"""Prompt templates for the RAG workflow."""

RAG_SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided context documents.

Instructions:
- Answer the question using ONLY the information from the context below.
- If the context does not contain enough information, say so clearly.
- Be concise and accurate.
- Cite the source document filename when referencing specific information.

Context:
{context}
"""

RAG_HUMAN_TEMPLATE = "{question}"
