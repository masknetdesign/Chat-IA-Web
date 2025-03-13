// Configurações da API
const API_KEY = "ddc-z0o1XNbLShKJgTlQEMbAcCT68TDQwgliDn9bJSmVjqtvOHP68W";
const BASE_URL = "https://beta.sree.shop/v1";

// Cache para respostas frequentes
const responseCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

// Configurações de otimização
const DEBOUNCE_DELAY = 300; // ms
let typingTimer;
let isProcessing = false;

// Estado da aplicação
let currentMode = 'chat';
let messageHistory = [];
let isStreaming = false;

// Configurações PWA
let deferredPrompt;
let isOnline = navigator.onLine;

// Elementos do DOM
const elements = {
    modeButtons: document.querySelectorAll('.mode-selector button'),
    messages: document.getElementById('messages'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    customSettings: document.querySelector('.custom-settings'),
    systemPrompt: document.getElementById('system-prompt'),
    useStream: document.getElementById('use-stream'),
    status: document.getElementById('status'),
    modeIndicator: document.getElementById('mode-indicator'),
    generatedScripts: document.querySelector('.generated-scripts'),
    scriptsList: document.getElementById('scripts-list'),
    sidebar: document.querySelector('.sidebar'),
    newChatBtn: document.querySelector('.new-chat-btn'),
    chatHistory: document.querySelector('.chat-history'),
    toggleSidebar: document.querySelector('.toggle-sidebar'),
    shareBtn: document.getElementById('share-btn'),
    shareMenu: document.querySelector('.share-menu'),
    shareOptions: document.querySelectorAll('.share-option'),
    sidebarOverlay: document.querySelector('.sidebar-overlay'),
    closeSidebarBtn: document.querySelector('.close-sidebar')
};

// Configurações dos modos
const modeConfigs = {
    chat: {
        sistema: "Você é um assistente prestativo e amigável. Responda em português.",
        stream: false
    },
    stream: {
        sistema: "Você é um assistente prestativo e amigável. Responda em português.",
        stream: true
    },
    tech: {
        sistema: "Você é um expert em programação. Sempre responda em português e com exemplos práticos.",
        stream: true
    },
    custom: {
        sistema: "",
        stream: false
    },
    continuous: {
        sistema: "Você é um assistente prestativo e amigável. Responda em português.",
        stream: false,
        keepHistory: true
    },
    code: {
        sistema: `Você é um experiente programador. 
        Sempre forneça código completo e funcional.
        Use comentários em português.
        Inclua tratamento de erros e documentação.`,
        stream: true
    }
};

// Estado adicional da aplicação
let chats = [];
let currentChatId = null;

// Inicialização
function init() {
    // Configurar eventos dos botões de modo
    elements.modeButtons.forEach(button => {
        button.addEventListener('click', () => setMode(button.dataset.mode));
    });

    // Configurar evento de envio
    elements.sendButton.addEventListener('click', handleSend);
    elements.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Configurar estado inicial
    setMode('chat');

    // Carregar histórico de chats
    loadChats();

    // Configurar eventos adicionais
    elements.newChatBtn.addEventListener('click', createNewChat);
    elements.toggleSidebar.addEventListener('click', toggleSidebar);
    elements.shareBtn.addEventListener('click', toggleShareMenu);
    
    elements.shareOptions.forEach(option => {
        option.addEventListener('click', handleShare);
    });

    // Fechar menu de compartilhamento ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.share-menu') && !e.target.closest('#share-btn')) {
            elements.shareMenu.classList.remove('active');
        }
    });

    // Criar primeiro chat se não houver nenhum
    if (chats.length === 0) {
        createNewChat();
    }

    // Adicionar botão de instalação
    addInstallButton();

    // Verificar suporte a PWA
    if ('serviceWorker' in navigator) {
        console.log('PWA suportado');
    }

    // Configurar eventos do menu mobile
    elements.toggleSidebar.addEventListener('click', toggleSidebar);
    elements.closeSidebarBtn.addEventListener('click', closeSidebar);
    elements.sidebarOverlay.addEventListener('click', closeSidebar);

    // Fechar sidebar ao clicar em um chat
    elements.chatHistory.addEventListener('click', (e) => {
        if (e.target.closest('.chat-item') && window.innerWidth <= 1024) {
            closeSidebar();
        }
    });

    // Adicionar listener para redimensionamento da janela
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
}

// Funções principais
async function handleSend() {
    if (isProcessing) return;
    
    const userInput = elements.userInput.value.trim();
    if (!userInput) return;

    try {
        isProcessing = true;
        updateStatus('Gerando resposta...');

        // Verificar cache antes de fazer a requisição
        const cacheKey = `${currentMode}-${userInput}`;
        const cachedResponse = checkCache(cacheKey);
        
        if (cachedResponse) {
            handleCachedResponse(cachedResponse, userInput);
            return;
        }

        // Verificar conexão
        if (!isOnline) {
            addMessage('assistant', 'Você está offline. Algumas funcionalidades podem estar limitadas.');
            updateStatus('Offline');
            return;
        }

        // Verificar e criar novo chat se necessário
        if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
            createNewChat();
        }

        // Limpar input e adicionar mensagem do usuário
        elements.userInput.value = '';
        addMessage('user', userInput);

        // Atualizar chat atual
        const currentChat = chats.find(c => c.id === currentChatId);
        if (currentChat) {
            currentChat.messages.push({ role: 'user', content: userInput });
            
            if (currentChat.messages.length === 1) {
                currentChat.title = userInput.substring(0, 30);
                renderChatHistory();
            }
        }

        // Preparar mensagens com otimização
        const config = modeConfigs[currentMode];
        const useStream = currentMode === 'custom' ? elements.useStream.checked : config.stream;
        const sistema = currentMode === 'custom' ? (elements.systemPrompt.value || config.sistema) : config.sistema;

        const messages = prepareMessages(userInput, sistema, config.keepHistory);

        // Fazer requisição com timeout
        const response = await Promise.race([
            useStream ? handleStreamResponse(messages) : handleNormalResponse(messages),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ]);

        // Processar resposta
        if (response) {
            // Atualizar cache
            updateCache(cacheKey, response);

            // Atualizar chat e histórico
            if (currentChat) {
                currentChat.messages.push({ role: 'assistant', content: response });
                saveChats();
                renderChatHistory();
            }

            if (config.keepHistory) {
                messageHistory = [...messageHistory, 
                    { role: "user", content: userInput },
                    { role: "assistant", content: response }
                ];
            }

            // Adicionar notificação para respostas longas
            if (response.length > 100) {
                sendNotification('Resposta pronta', {
                    body: 'Sua resposta foi gerada com sucesso!',
                    icon: 'icons/icon-192x192.png'
                });
            }
        }

        updateStatus('Pronto');
    } catch (error) {
        console.error('Erro:', error);
        addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua solicitação.');
        updateStatus('Erro ao gerar resposta');
    } finally {
        isProcessing = false;
    }
}

// Funções auxiliares otimizadas
function prepareMessages(userInput, sistema, keepHistory) {
    const baseMessages = [
        { role: "system", content: sistema },
        { role: "user", content: userInput }
    ];

    if (!keepHistory) return baseMessages;

    return [...messageHistory, ...baseMessages];
}

function checkCache(key) {
    const cached = responseCache.get(key);
    if (!cached) return null;

    const { timestamp, data } = cached;
    if (Date.now() - timestamp > CACHE_DURATION) {
        responseCache.delete(key);
        return null;
    }

    return data;
}

function updateCache(key, data) {
    responseCache.set(key, {
        timestamp: Date.now(),
        data
    });

    // Limpar cache antigo
    if (responseCache.size > 100) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
    }
}

function handleCachedResponse(response, userInput) {
    addMessage('assistant', response);
    
    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push(
            { role: 'user', content: userInput },
            { role: 'assistant', content: response }
        );
        saveChats();
        renderChatHistory();
    }

    updateStatus('Pronto (cache)');
    isProcessing = false;
}

// Otimizar função de streaming
async function handleStreamResponse(messages) {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "Provider-5/gpt-4o",
            messages: messages,
            stream: true
        })
    });

    if (!response.ok) {
        throw new Error('Erro na API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    
    // Criar elemento de mensagem para streaming
    const messageElement = createMessageElement('assistant', '');
    elements.messages.appendChild(messageElement);
    const contentElement = messageElement.querySelector('.content');

    // Usar TextDecoder com buffer para melhor performance
    let buffer = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '' || line.includes('[DONE]')) continue;

                try {
                    const json = JSON.parse(line.replace(/^data: /, ''));
                    if (json.choices[0].delta?.content) {
                        const content = json.choices[0].delta.content;
                        responseText += content;
                        
                        // Atualizar UI com menos frequência
                        clearTimeout(typingTimer);
                        typingTimer = setTimeout(() => {
                            contentElement.innerHTML = formatMessage(responseText);
                            messageElement.scrollIntoView({ behavior: 'smooth' });
                        }, DEBOUNCE_DELAY);
                    }
                } catch (e) {
                    console.warn('Erro ao processar chunk:', e);
                }
            }
        }

        // Atualização final da UI
        contentElement.innerHTML = formatMessage(responseText);
        messageElement.scrollIntoView({ behavior: 'smooth' });

        return responseText;
    } catch (error) {
        console.error('Erro no streaming:', error);
        throw error;
    }
}

// Otimizar função de resposta normal
async function handleNormalResponse(messages) {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "Provider-5/gpt-4o",
            messages: messages
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erro na API');

    const content = data.choices[0].message.content;
    addMessage('assistant', content);

    if (currentMode === 'code') {
        processCodeBlocks(content);
    }

    return content;
}

// Funções auxiliares
function setMode(mode) {
    currentMode = mode;
    
    // Atualizar botões
    elements.modeButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.mode === mode);
    });

    // Atualizar configurações visíveis
    elements.customSettings.style.display = mode === 'custom' ? 'flex' : 'none';
    elements.generatedScripts.style.display = mode === 'code' ? 'block' : 'none';

    // Limpar histórico se não for modo contínuo
    if (mode !== 'continuous') {
        messageHistory = [];
    }

    // Atualizar indicador de modo
    elements.modeIndicator.textContent = `Modo: ${elements.modeButtons.find(b => b.dataset.mode === mode).textContent}`;
    
    // Atualizar placeholder do input
    elements.userInput.placeholder = mode === 'code' 
        ? "Descreva o código que você quer que eu crie..."
        : "Digite sua mensagem...";
}

function addMessage(role, content) {
    const messageElement = createMessageElement(role, content);
    elements.messages.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth' });
}

function createMessageElement(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.innerHTML = formatMessage(content);
    
    div.appendChild(contentDiv);
    return div;
}

function formatMessage(content) {
    // Substituir quebras de linha por <br>
    content = content.replace(/\n/g, '<br>');
    
    // Formatar blocos de código
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="${lang || ''}">${code}</code></pre>`;
    });
    
    return content;
}

function processCodeBlocks(content) {
    const blocks = extractCodeBlocks(content);
    if (blocks.length > 0) {
        elements.scriptsList.innerHTML = '';
        blocks.forEach((block, index) => {
            const scriptElement = document.createElement('div');
            scriptElement.className = 'script-item';
            scriptElement.innerHTML = `
                <h4>Script ${index + 1}</h4>
                <pre><code>${block.code}</code></pre>
                <button onclick="downloadScript('script_${index + 1}', '${block.language}', \`${block.code}\`)">
                    Download
                </button>
            `;
            elements.scriptsList.appendChild(scriptElement);
        });
    }
}

function extractCodeBlocks(content) {
    const blocks = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        blocks.push({
            language: match[1] || 'txt',
            code: match[2].trim()
        });
    }

    return blocks;
}

function updateStatus(message) {
    elements.status.textContent = message;
}

// Função global para download de scripts
window.downloadScript = function(filename, language, code) {
    const extension = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        csharp: 'cs'
    }[language.toLowerCase()] || 'txt';

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Funções de gerenciamento de chats
function loadChats() {
    try {
        const savedChats = localStorage.getItem('chats');
        if (savedChats) {
            chats = JSON.parse(savedChats);
            renderChatHistory();
            
            // Carregar último chat ativo
            const lastActiveChat = localStorage.getItem('currentChatId');
            if (lastActiveChat && chats.find(c => c.id === lastActiveChat)) {
                loadChat(lastActiveChat);
            } else if (chats.length > 0) {
                loadChat(chats[0].id);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar chats:', error);
        chats = [];
    }
}

function saveChats() {
    try {
        localStorage.setItem('chats', JSON.stringify(chats));
        if (currentChatId) {
            localStorage.setItem('currentChatId', currentChatId);
        }

        // Sincronizar com o cache do Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-messages');
            });
        }
    } catch (error) {
        console.error('Erro ao salvar chats:', error);
        alert('Erro ao salvar a conversa. O armazenamento local pode estar cheio.');
    }
}

function createNewChat() {
    // Limpar mensagens atuais
    elements.messages.innerHTML = '';
    
    // Criar novo chat
    const chat = {
        id: Date.now().toString(),
        title: 'Nova Conversa',
        messages: [],
        mode: currentMode,
        timestamp: new Date().toISOString()
    };

    // Adicionar ao início da lista
    chats.unshift(chat);
    currentChatId = chat.id;
    
    // Limpar histórico de mensagens se não estiver no modo contínuo
    if (!modeConfigs[currentMode].keepHistory) {
        messageHistory = [];
    }
    
    // Salvar e atualizar UI
    saveChats();
    renderChatHistory();
    
    // Limpar input e configurações
    elements.userInput.value = '';
    if (elements.systemPrompt) {
        elements.systemPrompt.value = '';
    }
    
    // Atualizar status
    updateStatus('Novo chat criado');
    
    return chat;
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
        currentChatId = chatId;
        
        // Limpar mensagens atuais
        elements.messages.innerHTML = '';
        
        // Carregar mensagens do chat
        chat.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
        });
        
        // Atualizar modo
        setMode(chat.mode);
        
        // Limpar histórico se não estiver no modo contínuo
        if (!modeConfigs[chat.mode].keepHistory) {
            messageHistory = [];
        }
        
        // Atualizar UI
        updateChatHistoryUI();
        saveChats();
        
        // Rolar para a última mensagem
        const lastMessage = elements.messages.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function renderChatHistory() {
    elements.chatHistory.innerHTML = '';
    
    chats.forEach(chat => {
        const lastMessage = chat.messages[chat.messages.length - 1];
        const preview = lastMessage ? lastMessage.content.substring(0, 60) + '...' : 'Nova conversa';
        
        const chatElement = document.createElement('div');
        chatElement.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatElement.dataset.id = chat.id;
        
        const date = new Date(chat.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        chatElement.innerHTML = `
            <div class="chat-item-icon">
                <i class="fas fa-comment"></i>
            </div>
            <div class="chat-item-content">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${preview}</div>
                <div class="chat-item-date">${formattedDate}</div>
            </div>
            <button class="chat-item-delete" title="Excluir conversa">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Adicionar evento de clique para carregar o chat
        chatElement.addEventListener('click', (e) => {
            // Não carregar o chat se clicou no botão de excluir
            if (!e.target.closest('.chat-item-delete')) {
                loadChat(chat.id);
            }
        });
        
        // Adicionar evento para excluir chat
        const deleteBtn = chatElement.querySelector('.chat-item-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        elements.chatHistory.appendChild(chatElement);
    });
}

function deleteChat(chatId) {
    if (confirm('Tem certeza que deseja excluir esta conversa?')) {
        const index = chats.findIndex(c => c.id === chatId);
        if (index !== -1) {
            chats.splice(index, 1);
            
            // Se excluiu o chat atual, carregar outro
            if (chatId === currentChatId) {
                if (chats.length > 0) {
                    loadChat(chats[0].id);
                } else {
                    createNewChat();
                }
            }
            
            saveChats();
            renderChatHistory();
        }
    }
}

function updateChatHistoryUI() {
    const chatItems = elements.chatHistory.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.classList.toggle('active', item.dataset.id === currentChatId);
    });
}

// Funções de compartilhamento
function toggleShareMenu() {
    elements.shareMenu.classList.toggle('active');
}

function handleShare(e) {
    const type = e.currentTarget.dataset.type;
    const currentChat = chats.find(c => c.id === currentChatId);
    
    if (!currentChat) return;
    
    switch (type) {
        case 'copy':
            // Gerar link compartilhável (você precisará implementar sua própria lógica de compartilhamento)
            const shareUrl = generateShareUrl(currentChat);
            navigator.clipboard.writeText(shareUrl)
                .then(() => alert('Link copiado para a área de transferência!'))
                .catch(() => alert('Erro ao copiar link'));
            break;
            
        case 'export':
            exportChat(currentChat);
            break;
    }
    
    elements.shareMenu.classList.remove('active');
}

function generateShareUrl(chat) {
    // Implemente sua própria lógica de geração de URL compartilhável
    // Por exemplo, você pode criar um endpoint que aceita um ID de chat
    return `${window.location.origin}/share/${chat.id}`;
}

function exportChat(chat) {
    const exportData = {
        title: chat.title,
        messages: chat.messages,
        timestamp: chat.timestamp
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chat.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Funções de UI
function toggleSidebar() {
    const sidebar = elements.sidebar;
    const overlay = elements.sidebarOverlay;
    const toggleBtn = elements.toggleSidebar;
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    toggleBtn.classList.toggle('active');
    
    // Prevenir scroll do body quando a sidebar estiver aberta
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function closeSidebar() {
    const sidebar = elements.sidebar;
    const overlay = elements.sidebarOverlay;
    const toggleBtn = elements.toggleSidebar;
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    toggleBtn.classList.remove('active');
    document.body.style.overflow = '';
}

// Adicionar botão de instalação do PWA
function addInstallButton() {
    const installButton = document.createElement('button');
    installButton.className = 'install-pwa-btn';
    installButton.innerHTML = '<i class="fas fa-download"></i> Instalar App';
    installButton.style.display = 'none';
    installButton.onclick = installPWA;
    
    document.querySelector('.header').appendChild(installButton);

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });
}

// Função para instalar PWA
async function installPWA() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('PWA instalado com sucesso');
    }
    
    deferredPrompt = null;
}

// Função para enviar notificação
function sendNotification(title, options = {}) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        new Notification(title, options);
    }
}

// Adicionar listeners para estado online/offline
window.addEventListener('online', () => {
    isOnline = true;
    updateStatus('Online');
});

window.addEventListener('offline', () => {
    isOnline = false;
    updateStatus('Offline - Algumas funcionalidades podem estar limitadas');
});

// Inicializar aplicação
init(); 