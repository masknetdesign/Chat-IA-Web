'''
Código gerado para: script para uma pagina de login/cadastro em html e css e javascript
'''

# app.py
# Este script implementa um servidor web básico usando Flask.
# Ele serve uma página para login e cadastro e processa os dados submetidos pelos usuários.

from flask import Flask, request, jsonify, render_template
import os
import hashlib
import json

app = Flask(__name__)

# Caminho do arquivo de armazenamento (simulando um "banco de dados" simples)
USER_DATA_FILE = 'users.json'


def initialize_storage():
    """
    Inicializa o arquivo de armazenamento para simular a persistência de dados.
    Cria o arquivo vazio se ele ainda não existir.
    """
    if not os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, 'w') as f:
            json.dump({}, f)  # Arquivo começa como um dicionário vazio


def hash_password(password):
    """
    Gera um hash para a senha do usuário.
    Essa prática é importante para não armazenar senhas em texto puro.

    Args:
        password (str): Senha em texto puro.

    Returns:
        str: Hash hexadecimal da senha.
    """
    return hashlib.sha256(password.encode()).hexdigest()


def load_users():
    """
    Carrega os usuários registrados do arquivo JSON.

    Returns:
        dict: Dicionário de usuários (email como chave, hash da senha como valor).
    """
    with open(USER_DATA_FILE, 'r') as f:
        return json.load(f)


def save_users(users):
    """
    Salva o dicionário de usuários no arquivo JSON.

    Args:
        users (dict): Dicionário com dados dos usuários.
    """
    with open(USER_DATA_FILE, 'w') as f:
        json.dump(users, f)


@app.route('/')
def home():
    """
    Renderiza a página HTML principal.
    """
    return render_template('index.html')


@app.route('/register', methods=['POST'])
def register():
    """
    Endpoint para registrar um novo usuário.
    """
    try:
        # Obtém os dados enviados pelo cliente
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'status': 'error', 'message': 'Email e senha são obrigatórios!'}), 400

        users = load_users()

        if email in users:
            return jsonify({'status': 'error', 'message': 'Este email já está registrado!'}), 400

        # Registra o novo usuário
        users[email] = hash_password(password)
        save_users(users)

        return jsonify({'status': 'success', 'message': 'Usuário registrado com sucesso!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Erro ao registrar: {str(e)}'}), 500


@app.route('/login', methods=['POST'])
def login():
    """
    Endpoint para autenticar um usuário.
    """
    try:
        # Obtém os dados enviados pelo cliente
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'status': 'error', 'message': 'Email e senha são obrigatórios!'}), 400

        users = load_users()

        if email not in users or users[email] != hash_password(password):
            return jsonify({'status': 'error', 'message': 'Credenciais inválidas!'}), 401

        return jsonify({'status': 'success', 'message': 'Login bem-sucedido!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Erro ao fazer login: {str(e)}'}), 500


if __name__ == '__main__':
    initialize_storage()
    app.run(debug=True)