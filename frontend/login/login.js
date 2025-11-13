// frontend/login/login.js (Código Atualizado e Corrigido)

// CORREÇÃO: Usando 'login-form' para corresponder ao ID no HTML
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const messageEl = document.getElementById('message');
    
    // Verifica se o formulário e os elementos existem
    if (!email || !senha) {
        messageEl.textContent = 'Por favor, preencha todos os campos.';
        messageEl.className = 'message error'; // Usa className para substituir classes existentes
        return;
    }

    messageEl.textContent = 'Verificando credenciais...';
    messageEl.className = 'message';

    try {
        // Usa a variável global API_BASE_URL (assumindo que está em global_config.js)
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
        messageEl.className = 'message success';
        
        // Armazenamento de dados
        localStorage.setItem('genius_token', data.token);
        
        if(data.usuario && data.usuario.nome) {
            localStorage.setItem('genius_usuarioNome', data.usuario.nome);
        }

        // Redirecionamento
        setTimeout(() => {
            // O caminho relativo está correto: volta uma pasta (frontend) e entra em dashboard
            window.location.href = '../dashboard/dashboard.html'; 
        }, 1000); 

    } catch (error) {
        // Exibe o erro de volta para o usuário
        messageEl.textContent = error.message;
        messageEl.className = 'message error';
        console.error("Erro no processo de Login:", error);
    }
});