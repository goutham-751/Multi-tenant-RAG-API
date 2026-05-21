FROM python:3.11-slim

# Set up a non-root user for HuggingFace Spaces (UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies globally
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories and assign ownership to the non-root user
RUN mkdir -p /app/chroma_store $HF_HOME && \
    chown -R user:user /app $HOME

# Switch to the non-root user (required by HuggingFace Spaces)
USER user

# Pre-download the embedding model at build time (faster cold starts)
# This will now download into the user's HF_HOME cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY --chown=user:user . .

# Expose port (HuggingFace Spaces requires 7860)
EXPOSE 7860

# Run the API
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
