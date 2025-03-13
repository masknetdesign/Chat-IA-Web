from openai import OpenAI
import os
import sys
from typing import List, Dict
import json
from datetime import datetime

API_KEY = "ddc-z0o1XNbLShKJgTlQEMbAcCT68TDQwgliDn9bJSmVjqtvOHP68W"
BASE_URL = "https://beta.sree.shop/v1"

# Diretório para salvar os scripts
SCRIPTS_DIR = "scripts_gerados"

def criar_cliente():
    """
    Cria e retorna um cliente OpenAI configurado
    """
    return OpenAI(
        api_key=API_KEY,
        base_url=BASE_URL
    )

def fazer_pergunta(pergunta, modelo="Provider-5/gpt-4o", stream=False, sistema="You are a helpful assistant.", historico: List[Dict] = None):
    """
    Faz uma pergunta para a IA e retorna a resposta
    
    Args:
        pergunta (str): A pergunta a ser feita
        modelo (str): O modelo a ser usado
        stream (bool): Se True, retorna resposta em streaming
        sistema (str): Mensagem de sistema/contexto
        historico (List[Dict]): Histórico de mensagens anteriores
    """
    client = criar_cliente()
    
    messages = [{"role": "system", "content": sistema}]
    
    # Adiciona histórico se existir
    if historico:
        messages.extend(historico)
    
    # Adiciona pergunta atual
    messages.append({"role": "user", "content": pergunta})
    
    try:
        completion = client.chat.completions.create(
            model=modelo,
            messages=messages,
            stream=stream
        )
        
        if stream:
            print("\nResposta (streaming):")
            resposta_completa = []
            try:
                for chunk in completion:
                    if not chunk or not hasattr(chunk, 'choices') or len(chunk.choices) == 0:
                        continue
                        
                    choice = chunk.choices[0]
                    if not hasattr(choice, 'delta'):
                        continue
                        
                    delta = choice.delta
                    if hasattr(delta, 'content') and delta.content:
                        print(delta.content, end="", flush=True)
                        resposta_completa.append(delta.content)
                        
            except Exception as e:
                print(f"\nErro durante streaming: {str(e)}")
            finally:
                print("\n")
                
            return "".join(resposta_completa)
        else:
            resposta = completion.choices[0].message.content
            print("\nResposta:")
            print(resposta)
            return resposta
            
    except Exception as e:
        print(f"Erro: {str(e)}")
        return None

def extrair_codigo(resposta: str) -> List[Dict[str, str]]:
    """
    Extrai blocos de código da resposta
    """
    blocos = []
    linhas = resposta.split('\n')
    codigo_atual = []
    linguagem_atual = None
    em_bloco_codigo = False
    
    for linha in linhas:
        if linha.startswith('```'):
            if em_bloco_codigo:
                if codigo_atual:
                    blocos.append({
                        'linguagem': linguagem_atual or 'python',
                        'codigo': '\n'.join(codigo_atual)
                    })
                codigo_atual = []
                linguagem_atual = None
                em_bloco_codigo = False
            else:
                em_bloco_codigo = True
                linguagem_atual = linha[3:].strip()
        elif em_bloco_codigo:
            codigo_atual.append(linha)
            
    return blocos

def salvar_script(codigo: str, linguagem: str, descricao: str = None):
    """
    Salva um script em um arquivo
    """
    if not os.path.exists(SCRIPTS_DIR):
        os.makedirs(SCRIPTS_DIR)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extensao = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'csharp': 'cs',
        'php': 'php',
        'ruby': 'rb',
        'go': 'go',
        'rust': 'rs',
        'html': 'html',
        'css': 'css',
        'sql': 'sql'
    }.get(linguagem.lower(), 'txt')
    
    nome_arquivo = f"{timestamp}.{extensao}"
    caminho_completo = os.path.join(SCRIPTS_DIR, nome_arquivo)
    
    with open(caminho_completo, 'w', encoding='utf-8') as f:
        if descricao:
            f.write(f"'''\n{descricao}\n'''\n\n")
        f.write(codigo)
    
    return caminho_completo

def gerar_codigo():
    """Interface para geração de código"""
    limpar_tela()
    print("=== Gerador de Código ===")
    print("Digite 'sair' para voltar ao menu principal")
    
    while True:
        print("\nO que você quer que eu crie? (ex: 'um script para download de vídeos do YouTube')")
        print("Você:", end=" ")
        pedido = input()
        
        if pedido.lower() == 'sair':
            break
        
        # Prepara o prompt para gerar código
        prompt = f"""Por favor, crie um código em Python para: {pedido}

Requisitos:
- Código bem documentado
- Tratamento de erros
- Boas práticas de programação
- Exemplos de uso no comentário inicial

Por favor, forneça o código completo dentro de blocos de código Markdown (```python).
"""
        
        # Configuração específica para geração de código
        sistema = """Você é um experiente programador Python. 
Sempre forneça código completo e funcional.
Use comentários em português.
Inclua tratamento de erros e documentação."""
        
        resposta = fazer_pergunta(prompt, sistema=sistema, stream=True)
        
        if resposta:
            blocos_codigo = extrair_codigo(resposta)
            
            if blocos_codigo:
                print("\nCódigo(s) gerado(s) com sucesso!")
                for i, bloco in enumerate(blocos_codigo, 1):
                    caminho = salvar_script(
                        bloco['codigo'],
                        bloco['linguagem'],
                        f"Código gerado para: {pedido}"
                    )
                    print(f"\nScript {i} salvo em: {caminho}")
            else:
                print("\nNenhum bloco de código foi encontrado na resposta.")
        
        input("\nPressione Enter para continuar...")

def limpar_tela():
    """Limpa a tela do terminal"""
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_menu():
    """Mostra o menu principal"""
    print("\n=== Chat IA - Menu ===")
    print("1. Chat Normal")
    print("2. Chat com Streaming")
    print("3. Chat Técnico (Programação)")
    print("4. Chat Personalizado")
    print("5. Modo Conversa Contínua")
    print("6. Gerar Código")
    print("7. Limpar Tela")
    print("0. Sair")
    print("==================")

def chat_continuo():
    """Modo de conversa contínua com histórico"""
    limpar_tela()
    print("=== Modo Conversa Contínua ===")
    print("Digite 'sair' para voltar ao menu principal")
    print("Digite 'limpar' para limpar o histórico")
    
    historico = []
    sistema = "Você é um assistente prestativo e amigável. Responda em português."
    
    while True:
        print("\nVocê:", end=" ")
        pergunta = input()
        
        if pergunta.lower() == 'sair':
            break
        elif pergunta.lower() == 'limpar':
            historico = []
            print("Histórico limpo!")
            continue
        
        resposta = fazer_pergunta(pergunta, stream=False, sistema=sistema, historico=historico)
        if resposta:
            historico.append({"role": "user", "content": pergunta})
            historico.append({"role": "assistant", "content": resposta})

def chat_personalizado():
    """Chat com configurações personalizadas"""
    print("\n=== Chat Personalizado ===")
    print("Configure seu chat:")
    
    sistema = input("Digite o contexto do sistema (Enter para padrão): ")
    if not sistema:
        sistema = "You are a helpful assistant."
    
    stream = input("Usar streaming? (s/N): ").lower() == 's'
    
    print("\nDigite sua pergunta:")
    pergunta = input()
    
    fazer_pergunta(pergunta, stream=stream, sistema=sistema)

def main():
    """Função principal do aplicativo"""
    # Cria o diretório de scripts se não existir
    if not os.path.exists(SCRIPTS_DIR):
        os.makedirs(SCRIPTS_DIR)
        
    while True:
        mostrar_menu()
        opcao = input("Escolha uma opção: ")
        
        if opcao == "0":
            print("Até logo!")
            sys.exit(0)
        
        elif opcao == "1":
            print("\nDigite sua pergunta:")
            pergunta = input()
            fazer_pergunta(pergunta, stream=False)
        
        elif opcao == "2":
            print("\nDigite sua pergunta:")
            pergunta = input()
            fazer_pergunta(pergunta, stream=True)
        
        elif opcao == "3":
            print("\nDigite sua pergunta sobre programação:")
            pergunta = input()
            fazer_pergunta(
                pergunta,
                sistema="You are an expert programmer. Always respond in Portuguese.",
                stream=True
            )
        
        elif opcao == "4":
            chat_personalizado()
        
        elif opcao == "5":
            chat_continuo()
        
        elif opcao == "6":
            gerar_codigo()
        
        elif opcao == "7":
            limpar_tela()
        
        else:
            print("Opção inválida!")
        
        if opcao != "6":  # Não pede Enter após gerar código
            input("\nPressione Enter para continuar...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nPrograma encerrado pelo usuário.")
        sys.exit(0)