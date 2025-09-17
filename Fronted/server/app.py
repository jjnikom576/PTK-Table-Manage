import json
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from uuid import uuid4
from datetime import datetime, timedelta
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'school_schedule.db')

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def open_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    conn.execute('PRAGMA foreign_keys = ON;')
    return conn

def json_response(handler, status, data):
    body = json.dumps(data).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    handler.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    handler.end_headers()
    handler.wfile.write(body)

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        # Health check endpoint
        if parsed.path == '/api/health':
            return json_response(self, 200, {
                'ok': True,
                'service': 'admin-api',
                'db_path': os.path.basename(DB_PATH),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
        if parsed.path.startswith('/api/admin/users/') and parsed.path.endswith('/hash'):
            # GET /api/admin/users/:username/hash
            parts = parsed.path.split('/')
            if len(parts) >= 6:
                username = parts[4]
                try:
                    conn = open_db()
                    cur = conn.cursor()
                    cur.execute('SELECT id, username, password_hash, role, is_active FROM admin_users WHERE username = ?', (username,))
                    row = cur.fetchone()
                    conn.close()
                    if not row:
                        return json_response(self, 404, { 'ok': False, 'error': 'User not found' })
                    return json_response(self, 200, { 'ok': True, 'data': row })
                except Exception as e:
                    return json_response(self, 500, { 'ok': False, 'error': str(e) })
        return json_response(self, 404, { 'ok': False, 'error': 'Not found' })

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length) if length else b'{}'
        try:
            data = json.loads(body.decode('utf-8'))
        except Exception:
            data = {}

        if parsed.path == '/api/admin/login':
            # Minimal login: supports default admin/admin123 check
            username = str(data.get('username') or '').strip()
            password = str(data.get('password') or '')
            try:
                conn = open_db()
                cur = conn.cursor()
                cur.execute('SELECT id, username, password_hash, role, is_active FROM admin_users WHERE username = ?', (username,))
                user = cur.fetchone()
                if not user:
                    conn.close()
                    return json_response(self, 401, { 'ok': False, 'error': 'Invalid credentials' })
                # Preview check: allow default admin/admin123 without bcrypt on server
                if username == 'admin' and password == 'admin123' and user.get('is_active', 1):
                    token = uuid4().hex
                    expires_at = (datetime.utcnow() + timedelta(days=1)).isoformat() + 'Z'
                    cur.execute('INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                                (user['id'], token, expires_at, self.client_address[0], self.headers.get('User-Agent', '')))
                    conn.commit()
                    conn.close()
                    return json_response(self, 200, { 'ok': True, 'token': token, 'expires_at': expires_at, 'user': { 'id': user['id'], 'username': user['username'], 'role': user['role'] } })
                conn.close()
                # For non-default users, require client-side bcrypt compare via /users/:username/hash
                return json_response(self, 401, { 'ok': False, 'error': 'Server-side bcrypt not available in preview' })
            except Exception as e:
                return json_response(self, 500, { 'ok': False, 'error': str(e) })

        if parsed.path == '/api/admin/session':
            # Create session (used after client-side verify)
            username = str(data.get('username') or '').strip()
            try:
                conn = open_db()
                cur = conn.cursor()
                cur.execute('SELECT id, username, role, is_active FROM admin_users WHERE username = ?', (username,))
                user = cur.fetchone()
                if not user or not user.get('is_active', 1):
                    conn.close()
                    return json_response(self, 401, { 'ok': False, 'error': 'User not active or not found' })
                token = uuid4().hex
                expires_at = (datetime.utcnow() + timedelta(days=1)).isoformat() + 'Z'
                cur.execute('INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                            (user['id'], token, expires_at, self.client_address[0], self.headers.get('User-Agent', '')))
                conn.commit()
                conn.close()
                return json_response(self, 200, { 'ok': True, 'token': token, 'expires_at': expires_at, 'user': { 'id': user['id'], 'username': user['username'], 'role': user['role'] } })
            except Exception as e:
                return json_response(self, 500, { 'ok': False, 'error': str(e) })

        return json_response(self, 404, { 'ok': False, 'error': 'Not found' })

def run(host='127.0.0.1', port=8080):
    httpd = HTTPServer((host, port), Handler)
    print(f"Admin API running at http://{host}:{port}/api ...")
    httpd.serve_forever()

if __name__ == '__main__':
    host = os.environ.get('ADMIN_API_HOST', '127.0.0.1')
    try:
        port = int(os.environ.get('ADMIN_API_PORT', '8080'))
    except ValueError:
        port = 8080
    run(host=host, port=port)
