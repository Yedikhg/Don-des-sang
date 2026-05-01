# Read the doc: https://huggingface.co/docs/hub/spaces-sdks-docker
# you will also find guides on how best to write your Dockerfile

FROM python:3.11

# Add a user to avoid permission issues
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy requirements and install
COPY --chown=user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy all the app files
COPY --chown=user . /app

# Expose port 7860 (required by Hugging Face Spaces)
EXPOSE 7860

# Start the Flask app using Gunicorn for production
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]