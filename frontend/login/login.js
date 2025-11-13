// frontend/login/login.js (Código Atualizado e Corrigido)

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const messageEl = document.getElementById('message');
    
    // Altera o ID do formulário se for diferente no HTML
    // const loginForm = document.getElementById('login-form'); 
    
    // Verifica se o formulário e os elementos existem
    if (!email || !senha) {
        messageEl.textContent = 'Por favor, preencha todos os campos.';
        messageEl.classList.add('error');
        return;
    }

    messageEl.textContent = 'Verificando credenciais...';
    messageEl.className = 'message';

    try {
        // CORREÇÃO AQUI: Usa a variável global API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            // Se a API retornar um status de erro (4xx ou 5xx)
            throw new Error(data.message || 'Erro de rede ou credenciais inválidas.');
        }

        // Login Bem-Sucedido
        messageEl.textContent = 'Login bem-sucedido! Redirecionando...';
        messageEl.classList.add('success');
        
        // Armazenamento de dados
        localStorage.setItem('genius_token', data.token); // Recomendado usar prefixo para chaves
        
        if(data.usuario && data.usuario.nome) {
            localStorage.setItem('genius_usuarioNome', data.usuario.nome);
        }

        // Redirecionamento
        setTimeout(() => {
            // Certifique-se de que o caminho está correto
            // Se você está em /frontend/login/login.html, o caminho para o dashboard é '../dashboard/dashboard.html'
            window.location.href = '../dashboard/dashboard.html'; 
        }, 1000); 

    } catch (error) {
        // Exibe o erro de volta para o usuário
        messageEl.textContent = error.message;
        messageEl.classList.add('error');
        console.error("Erro no processo de Login:", error);
    }
});