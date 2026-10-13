#!/usr/bin/env python3
"""
Gamezin - Servidor Web Seguro & Proxy Local para DeepSeek AI
Este servidor atua como um intermediário seguro (proxy) para a API DeepSeek:
1. Serve apenas arquivos estáticos públicos do jogo (HTML, JS, CSS, PNG, JSON, min.js).
2. Bloqueia estritamente o acesso a arquivos confidenciais (.env, .git, scripts .py/.bat/.ps1).
3. Intercepta requisições para '/api/chat' e '/api/status'.
4. Valida origens (apenas localhost/127.0.0.1 são permitidos - bloqueia ataques Cross-Origin externos).
5. Lê a chave DEEPSEEK_API_KEY com segurança do arquivo '.env' local no servidor.
6. NUNCA expõe a chave de API ao navegador cliente, ao log ou a origens externas.
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse, unquote
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
HOST = '127.0.0.1'

if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        PORT = 8080

# Rate limiting em memória: timestamps de requisições recentes
RATE_LIMIT_WINDOW_SEC = 60
RATE_LIMIT_MAX_REQUESTS = 15
_recent_chat_timestamps = []

def load_env():
    """Carrega variáveis do arquivo .env local sem expor ou versionar."""
    env_vars = {}
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#') or '=' not in line:
                        continue
                    key, val = line.split('=', 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key:
                        env_vars[key] = val
        except Exception as e:
            print(f"[Aviso] Falha ao ler .env: {e}")
    return env_vars

def is_allowed_origin(origin):
    """Verifica se a origem da requisição é local e confiável."""
    if not origin:
        return True
    origin_clean = origin.strip().lower()
    if origin_clean in ('null', 'file://'):
        return True
    try:
        parsed = urlparse(origin_clean)
        hostname = (parsed.hostname or '').lower()
        if hostname in ('localhost', '127.0.0.1', '::1'):
            return True
    except Exception:
        pass
    return False

def check_rate_limit():
    """Implementa janela deslizante simples para limitar requisições ao chat da IA."""
    global _recent_chat_timestamps
    now = time.time()
    _recent_chat_timestamps = [t for t in _recent_chat_timestamps if now - t < RATE_LIMIT_WINDOW_SEC]
    if len(_recent_chat_timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    _recent_chat_timestamps.append(now)
    return True

class SecureGamezinHandler(SimpleHTTPRequestHandler):
    def check_origin(self):
        origin = self.headers.get('Origin')
        if origin and not is_allowed_origin(origin):
            self.send_error(403, "Origem não permitida (Cross-Origin Protection)")
            return False
        return True

    def set_cors_headers(self):
        origin = self.headers.get('Origin')
        if origin and is_allowed_origin(origin):
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        if not self.check_origin():
            return
        self.send_response(204)
        self.set_cors_headers()
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        # 1. Bloqueio de arquivos confidenciais e dotfiles
        clean_path = unquote(self.path.split('?')[0].split('#')[0])
        parts = clean_path.replace('\\', '/').split('/')

        # Se qualquer segmento do caminho iniciar com ponto (ex: /.env, /.git) ou for arquivo de script confidencial
        for part in parts:
            if part.startswith('.') and part != '.' and part != '..':
                self.send_error(403, "Acesso proibido a arquivos confidenciais")
                return

        lower_path = clean_path.lower()
        forbidden_exact = ['.env', '.env.example', '.gitignore', 'server.py', 'jogar.bat', 'generate_template.ps1']
        for item in forbidden_exact:
            if lower_path == f'/{item}' or f'/{item}/' in lower_path:
                self.send_error(403, "Acesso proibido a arquivos confidenciais")
                return

        if lower_path.endswith('.py') or lower_path.endswith('.bat') or lower_path.endswith('.ps1') or '__pycache__' in lower_path:
            self.send_error(403, "Acesso proibido")
            return

        # 2. Endpoint de status da IA (/api/status)
        if clean_path in ('/api/status', '/api/status/'):
            if not self.check_origin():
                return
            env = load_env()
            api_key = env.get('DEEPSEEK_API_KEY') or os.environ.get('DEEPSEEK_API_KEY') or ''
            has_key = bool(api_key.strip() and not api_key.startswith('your_') and not api_key.startswith('SEU_'))
            model = env.get('DEEPSEEK_MODEL') or os.environ.get('DEEPSEEK_MODEL') or 'deepseek-chat'

            response_data = {
                "ok": True,
                "server": "gamezin-proxy",
                "has_env_key": has_key,
                "model": model
            }
            body = json.dumps(response_data).encode('utf-8')
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 3. Serve arquivos estáticos normalmente
        return super().do_GET()

    def do_HEAD(self):
        clean_path = unquote(self.path.split('?')[0].split('#')[0])
        parts = clean_path.replace('\\', '/').split('/')
        for part in parts:
            if part.startswith('.') and part != '.' and part != '..':
                self.send_error(403, "Acesso proibido")
                return
        return super().do_HEAD()

    def do_POST(self):
        if not self.check_origin():
            return

        clean_path = unquote(self.path.split('?')[0])
        if clean_path in ('/api/chat', '/api/chat/'):
            self.handle_ai_chat()
        else:
            self.send_error(404, "Endpoint não encontrado")

    def handle_ai_chat(self):
        # Proteção contra flooding/abuso local de tokens
        if not check_rate_limit():
            err_data = {
                "ok": False,
                "status": 429,
                "error": "rate_limit",
                "message": "Limite de requisições excedido. Aguarde alguns segundos."
            }
            body = json.dumps(err_data).encode('utf-8')
            self.send_response(429)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        env = load_env()
        api_key = env.get('DEEPSEEK_API_KEY') or os.environ.get('DEEPSEEK_API_KEY') or ''
        model = env.get('DEEPSEEK_MODEL') or os.environ.get('DEEPSEEK_MODEL') or 'deepseek-chat'

        if not api_key or api_key.startswith('your_') or api_key.startswith('SEU_') or api_key.strip() == '':
            response_data = {
                "ok": False,
                "error": "no_api_key",
                "message": "Nenhuma chave configurada no .env. Ativando sabedoria offline nativa."
            }
            body = json.dumps(response_data).encode('utf-8')
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 65536: # Max 64KB por requisição
                self.send_error(413, "Payload muito grande")
                return
            post_body = self.rfile.read(content_length)
            client_payload = json.loads(post_body.decode('utf-8'))
        except Exception as e:
            self.send_error(400, f"JSON inválido: {e}")
            return

        raw_messages = client_payload.get('messages', [])
        if not isinstance(raw_messages, list) or not raw_messages:
            self.send_error(400, "Parâmetro 'messages' deve ser uma lista não-vazia")
            return

        # Higienização de mensagens para prevenir estouramento de tokens
        sanitized_messages = []
        for m in raw_messages[-8:]: # No máximo 8 turnos
            if isinstance(m, dict) and 'role' in m and 'content' in m:
                role = str(m['role'])[:20]
                content = str(m['content'])[:2000]
                sanitized_messages.append({"role": role, "content": content})

        try:
            max_tokens = min(max(int(client_payload.get('max_tokens', 220)), 50), 300)
        except (ValueError, TypeError):
            max_tokens = 220

        try:
            temp = float(client_payload.get('temperature', 0.7))
            temp = min(max(temp, 0.0), 1.5)
        except (ValueError, TypeError):
            temp = 0.7

        deepseek_payload = {
            "model": model,
            "messages": sanitized_messages,
            "max_tokens": max_tokens,
            "temperature": temp
        }

        req = urllib.request.Request(
            'https://api.deepseek.com/chat/completions',
            data=json.dumps(deepseek_payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'User-Agent': 'Gamezin-Proxy/1.0'
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                resp_data = response.read()
                self.send_response(response.status)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(resp_data)))
                self.end_headers()
                self.wfile.write(resp_data)
        except urllib.error.HTTPError as http_err:
            err_body = http_err.read().decode('utf-8', errors='ignore')
            print(f"[DeepSeek HTTP {http_err.code}] {err_body}")

            error_msg = f"DeepSeek retornou status {http_err.code}"
            error_code = "upstream_error"
            if http_err.code == 401:
                error_msg = "Chave de API DeepSeek inválida ou revogada."
                error_code = "invalid_api_key"
            elif http_err.code == 402:
                error_msg = "Saldo da conta DeepSeek esgotado."
                error_code = "insufficient_balance"
            elif http_err.code == 429:
                error_msg = "Limite de requisições DeepSeek atingido."
                error_code = "rate_limit"

            error_response = {
                "ok": False,
                "status": http_err.code,
                "error": error_code,
                "message": error_msg,
                "detail": err_body
            }
            body = json.dumps(error_response).encode('utf-8')
            self.send_response(200) # 200 com payload para fallback resiliente no cliente
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as net_err:
            print(f"[DeepSeek NetError] {net_err}")
            error_response = {
                "ok": False,
                "error": "network_error",
                "message": str(net_err)
            }
            body = json.dumps(error_response).encode('utf-8')
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

def main():
    env = load_env()
    api_key = env.get('DEEPSEEK_API_KEY') or os.environ.get('DEEPSEEK_API_KEY') or ''
    has_key = bool(api_key.strip() and not api_key.startswith('your_') and not api_key.startswith('SEU_'))

    print("=" * 60)
    print("           GAMEZIN - SERVIDOR WEB SEGURO")
    print("=" * 60)
    print(f" Servidor iniciado em: http://{HOST}:{PORT}")
    if has_key:
        print(" [Segurança] Proxy DeepSeek ativo com chave configurada em .env")
    else:
        print(" [Segurança] Nenhuma chave no .env -> Modo Sabedoria Offline ativo")
    print(" [Segurança] A chave NUNCA é enviada para o navegador ou exposta via HTTP.")
    print(" [Segurança] Acesso a .env e arquivos confidenciais está ESTRITAMENTE BLOQUEADO.")
    print(" Pressione Ctrl+C para encerrar o servidor.")
    print("=" * 60)

    server = HTTPServer((HOST, PORT), SecureGamezinHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado com sucesso.")
        server.server_close()

if __name__ == '__main__':
    main()
