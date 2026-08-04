#!/usr/bin/env python3
"""
Local HTTP server with Basic Authentication for testing.
Usage: python3 auth-server.py
"""

import http.server
import socketserver
import base64
import os
from pathlib import Path

PORT = 3000
USERNAME = os.getenv('BASIC_AUTH_USERNAME', 'admin')
PASSWORD = os.getenv('BASIC_AUTH_PASSWORD', 'password')

class AuthHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="public", **kwargs)

    def do_GET(self):
        # Allow login.html and robots.txt without auth
        if self.path in ['/login.html', '/robots.txt', '/']:
            # Redirect root to login
            if self.path == '/':
                self.send_response(302)
                self.send_header('Location', '/login.html')
                self.end_headers()
                return
            super().do_GET()
            return

        # For all other pages, check authorization
        auth_header = self.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Basic '):
            self.send_response(401)
            self.send_header('WWW-Authenticate', 'Basic realm="IWT & ITE Documentation"')
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>401 Unauthorized</h1><p>Please login first.</p></body></html>')
            return

        # Decode and validate credentials
        try:
            encoded_credentials = auth_header[6:]
            decoded = base64.b64decode(encoded_credentials).decode('ascii')
            username, password = decoded.split(':', 1)

            if username != USERNAME or password != PASSWORD:
                self.send_response(401)
                self.send_header('WWW-Authenticate', 'Basic realm="IWT & ITE Documentation"')
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(b'<html><body><h1>401 Unauthorized</h1><p>Invalid credentials.</p></body></html>')
                return
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>400 Bad Request</h1></body></html>')
            return

        # Auth successful, serve the file
        super().do_GET()

    def end_headers(self):
        # Add security headers
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'public, max-age=3600')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom logging
        print(f'[{self.log_date_time_string()}] {format % args}')

if __name__ == '__main__':
    handler = AuthHTTPRequestHandler

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"""
╔════════════════════════════════════════════════════════════════╗
║  IWT & ITE Documentation - Local Auth Server                   ║
╠════════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:{PORT}                        ║
║                                                                ║
║  Default credentials:                                          ║
║  Username: {USERNAME:<48} ║
║  Password: {PASSWORD:<48} ║
║                                                                ║
║  Test with curl:                                               ║
║  curl -u {USERNAME}:{PASSWORD} http://localhost:{PORT}              ║
║                                                                ║
║  Press Ctrl+C to stop                                          ║
╚════════════════════════════════════════════════════════════════╝
""")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
