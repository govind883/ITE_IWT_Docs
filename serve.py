#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = "public"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        # If path is /, redirect to index.html
        if self.path == '/' or self.path == '':
            self.path = '/index.html'
        return super().do_GET()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"✅ Server running at http://localhost:{PORT}")
    print(f"📁 Serving from: {os.path.join(os.getcwd(), DIRECTORY)}")
    print(f"🌐 Visit: http://localhost:{PORT}")
    print(f"\nPress Ctrl+C to stop")
    httpd.serve_forever()
