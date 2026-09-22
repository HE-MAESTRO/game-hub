import http.server
import socketserver
import os

PORT = 8088
DIRECTORY = "/root/webhub"

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Access-Control-Allow-Origin", "*")
        # Aggressive caching so user doesn't download 350MB every refresh
        self.send_header("Cache-Control", "public, max-age=86400, immutable")
        super().end_headers()

if __name__ == "__main__":
    with ThreadedTCPServer(("", PORT), Handler) as httpd:
        print(f"Serving threaded at http://0.0.0.0:{PORT}")
        httpd.serve_forever()
