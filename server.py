#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# Change to public directory
os.chdir(os.path.join(os.path.dirname(__file__), 'public'))

PORT = 8000

class IndexHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Redirect / to index.html
        if self.path == '/':
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return http.server.SimpleHTTPRequestHandler.end_headers(self)

try:
    with socketserver.TCPServer(("", PORT), IndexHandler) as httpd:
        print(f"\n✅ Server is running!")
        print(f"📁 Serving from: {os.getcwd()}")
        print(f"🌐 Visit: http://localhost:{PORT}")
        print(f"\n⏹️  Press Ctrl+C to stop\n")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n\n✅ Server stopped!")
