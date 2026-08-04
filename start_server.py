#!/usr/bin/env python3
import http.server
import socketserver
import os

# Must run from public directory
public_dir = os.path.join(os.path.dirname(__file__), 'public')
os.chdir(public_dir)

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '':
            # Read index.html and serve it
            try:
                with open('index.html', 'r', encoding='utf-8') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content.encode())
                return
            except:
                pass
        super().do_GET()

print(f"\n✅ Starting server...")
print(f"📁 Directory: {os.getcwd()}")
print(f"🌐 URL: http://localhost:{PORT}")
print(f"⏹️  Press Ctrl+C to stop\n")

httpd = socketserver.TCPServer(("", PORT), Handler)
httpd.serve_forever()
