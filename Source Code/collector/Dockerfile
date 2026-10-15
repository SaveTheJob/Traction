# Offerward collector as a container (Cloud Run Job, Docker, Podman).
# The systemd install in deploy/ doesn't use this; both run the same code.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TRACTION_COLLECTOR_CONFIG=/etc/traction-collector/config.yaml

RUN useradd --system --uid 10001 --home-dir /var/lib/traction-collector traction \
 && install -d -o traction -g traction -m 700 /var/lib/traction-collector

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY collector ./collector
COPY profiles ./profiles

USER traction
VOLUME /var/lib/traction-collector
ENTRYPOINT ["python", "-m", "collector"]
CMD ["run"]
