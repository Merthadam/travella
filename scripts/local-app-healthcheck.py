from urllib.request import urlopen

ENDPOINTS = (
    "http://127.0.0.1:8000/health",
    "http://127.0.0.1:8001/ready",
    "http://127.0.0.1:8002/health",
    "http://127.0.0.1:5173/",
)

for endpoint in ENDPOINTS:
    with urlopen(endpoint, timeout=2):
        pass
