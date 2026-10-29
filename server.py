#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ระบบจองห้องประชุมออนไลน์ - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
Local Development Server with Python
"""

import http.server
import socketserver
import os
import webbrowser
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS headers so it works smoothly with modern browser APIs
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), CustomHTTPHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 70)
        print("🏛️  ระบบจองห้องประชุมออนไลน์ - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์")
        print(f"🚀 เซิร์ฟเวอร์ทำงานที่: {url}")
        print(f"📁 โฟลเดอร์โปรเจกต์: {DIRECTORY}")
        print("=" * 70)
        print("กด Ctrl+C ในหน้าต่างนี้เพื่อหยุดการทำงานเซิร์ฟเวอร์\n")
        
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nปิดเซิร์ฟเวอร์เรียบร้อยแล้ว ขอบคุณครับ")
            sys.exit(0)

if __name__ == "__main__":
    run_server()
