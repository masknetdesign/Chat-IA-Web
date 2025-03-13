import os
from openai import OpenAI
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Configuração do cliente OpenAI usando variáveis de ambiente
client = OpenAI(
    base_url=os.getenv("V1_BASE_URL"),
    api_key=os.getenv("V1_API_KEY")
)

def fazer_pergunta(pergunta, modelo="deepseek-v3", stream=False):
    """
    Função para fazer perguntas à API com tratamento de erros
    """
    try:
        messages = [
            {"role": "system", "content": "Você é um assistente prestativo."},
            {"role": "user", "content": pergunta}
        ]
        
        completion = client.chat.completions.create(
            model=modelo,
            messages=messages,
            stream=stream
        )
        
        if stream:
            print(f"\nResposta (streaming):")
            for chunk in completion:
                if chunk and chunk.choices and len(chunk.choices) > 0:
                    if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                        if chunk.choices[0].delta.content:
                            print(chunk.choices[0].delta.content, end="", flush=True)
            print("\n")
        else:
            print(f"\nResposta:")
            print(completion.choices[0].message.content)
            
    except Exception as e:
        print(f"Erro ao fazer a pergunta: {str(e)}")

def main():
    print("=== Sistema de Chat com OpenAI ===")
    
    # Exemplo de chat normal
    print("\nTeste de chat normal:")
    fazer_pergunta("Como você está?")
    
    # Exemplo de chat com streaming
    print("\nTeste de chat com streaming:")
    fazer_pergunta("Me conte uma história curta!", stream=True)

if __name__ == "__main__":
    main()


