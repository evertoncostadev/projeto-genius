// frontend/login/login.js (Código Atualizado e Corrigido)

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const messageEl = document.getElementById('message');

    messageEl.textContent = '';
    messageEl.className = 'message';

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Email ou senha incorretos.');
        }

        messageEl.textContent = 'Login bem-sucedido! Redirecionando...';
        messageEl.classList.add('success');
        
        localStorage.setItem('token', data.token);

        if(data.usuario && data.usuario.nome) {
            localStorage.setItem('usuarioNome', data.usuario.nome);
        }

        setTimeout(() => {
            window.location.href = '/dashboard/dashboard.html#home'; 
        }, 1000); 

    } catch (error) {
        messageEl.textContent = error.message;
        messageEl.classList.add('error');
    }
});