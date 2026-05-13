FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir mcp[cli] httpx
COPY main.py .
EXPOSE 8014
CMD ["python", "main.py"]
