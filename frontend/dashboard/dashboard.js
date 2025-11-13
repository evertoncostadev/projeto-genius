// frontend/dashboard/dashboard.js (CÓDIGO ATUALIZADO E COMPLETO)

// =============================================
// --- CONFIGURAÇÃO E ROTAS SPA ---
// =============================================
const routes = {
    '#home': '/dashboard/home.html',
    '#usuarios_cadastrar': '/usuarios/usuarios.html',
    '#usuarios_buscar': '/usuarios/buscar-usuarios.html',
    '#notebooks_cadastrar': '/notebooks/cadastrar-notebook.html',
    '#notebooks_buscar': '/notebooks/buscar-notebook.html',

    '#emprestimos_cadastrar': '/emprestimos/cadastrar-emprestimo.html',
    '#emprestimos_ativos': '/emprestimos/buscar-emprestimos.html',
    '#emprestimos_encerrados': '/emprestimos/buscar-emprestimos.html',

    '#ajuda': '/ajuda/ajuda.html'
};
const mainContent = document.querySelector('.main-content');
const LOGOUT_BUTTON_ID = 'logoutButton';
const USER_WELCOME_ID = 'userWelcome'; // ID para a saudação do usuário

// =============================================
// --- LÓGICA DE AUTENTICAÇÃO E LOGOUT ---
// =============================================

function checkAuthAndLoadUser() {
    const token = localStorage.getItem('genius_token');
    const userName = localStorage.getItem('genius_usuarioNome');
    const userWelcomeEl = document.getElementById(USER_WELCOME_ID);
    const logoutButton = document.getElementById(LOGOUT_BUTTON_ID);

    if (!token) {
        // Redireciona para o login se não houver token
        console.warn('Token não encontrado. Redirecionando para login.');
        window.location.href = '../login/login.html'; 
        return false; 
    }

    // Exibir o nome do usuário (assumindo que há um elemento com o ID 'userWelcome' no dashboard.html)
    if (userWelcomeEl && userName) {
        userWelcomeEl.textContent = `Bem-vindo(a), ${userName}`;
    }

    // Adiciona o listener de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    return true; // Autenticado
}

function handleLogout() {
    localStorage.clear();
    alert('Sessão encerrada com sucesso.');
    window.location.href = '../login/login.html';
}


// =============================================
// --- LÓGICA DE ROTEAMENTO (SPA) ---
// =============================================
document.addEventListener('click', (e) => {
    // Lógica para abrir/fechar submenus
    const toggle = e.target.closest('.submenu-toggle');
    if (toggle && toggle.parentElement.classList.contains('has-submenu')) {
        e.preventDefault();
        const parentLi = toggle.parentElement;
        if (parentLi.classList.contains('open')) {
            toggle.classList.remove('active');
            parentLi.querySelectorAll('.submenu a').forEach(child => {
                child.classList.remove('active');
            });
        }
        document.querySelectorAll('.has-submenu.open').forEach(openSubmenu => {
            if (openSubmenu !== parentLi) {
                openSubmenu.classList.remove('open');
            }
        });
        parentLi.classList.toggle('open');
    }
});

const loadPage = async () => {
    // Se a autenticação falhar, para o carregamento da página
    if (!checkAuthAndLoadUser()) {
        return;
    }
    
    // Seu código de roteamento existente
    const hashLimpa = window.location.hash.split('?')[0] || '#home';
    let pageUrl = '';
    let idParam = null;
    let hashParaMenu = hashLimpa;
    let formMode = 'create';

    sessionStorage.removeItem('editUserId');
    sessionStorage.removeItem('editNotebookId');
    sessionStorage.removeItem('emprestimoStatus');

    if (hashLimpa === '#home') {
        pageUrl = routes[hashLimpa];
    }
    else if (hashLimpa.startsWith('#usuarios_editar/')) {
        pageUrl = routes['#usuarios_cadastrar'];
        idParam = hashLimpa.split('/')[1];
        hashParaMenu = '#usuarios_cadastrar';
        formMode = 'edit';
        sessionStorage.setItem('editUserId', idParam);
    }
    else if (hashLimpa.startsWith('#notebooks_editar/')) {
        pageUrl = routes['#notebooks_cadastrar'];
        idParam = hashLimpa.split('/')[1];
        hashParaMenu = '#notebooks_cadastrar';
        formMode = 'edit';
        sessionStorage.setItem('editNotebookId', idParam);
    }
    else if (hashLimpa === '#emprestimos_ativos') {
        pageUrl = routes[hashLimpa];
        hashParaMenu = hashLimpa;
        sessionStorage.setItem('emprestimoStatus', 'ativo');
    }
    else if (hashLimpa === '#emprestimos_encerrados') {
        pageUrl = routes[hashLimpa];
        hashParaMenu = hashLimpa;
        sessionStorage.setItem('emprestimoStatus', 'encerrado');
    }
    else {
        pageUrl = routes[hashLimpa];
        hashParaMenu = hashLimpa;
    }

    sessionStorage.setItem('formMode', formMode);
    updateActiveLinks(hashParaMenu);

    if (pageUrl) {
        try {

            const response = await fetch(pageUrl);
            if (!response.ok) throw new new Error('Página não encontrada');

            const html = await response.text();
            mainContent.innerHTML = html;

            loadStylesForPage(html);
            loadScriptsForPage(html);

        } catch (error) {
            mainContent.innerHTML = `<h2>Erro ao carregar o conteúdo.</h2>`;
            console.error('Erro no roteamento:', error);
        }
    } else {
        mainContent.innerHTML = `<h2>Página não encontrada.</h2>`;
    }
};

const loadStylesForPage = (html) => {
    const oldStyle = document.getElementById('page-style');
    if (oldStyle) oldStyle.remove();
    const styleRegex = /<link\s+rel="stylesheet"\s+href="([^"]+)">/i;
    const match = html.match(styleRegex);
    if (match && match[1]) {
        const styleHref = match[1];
        const newStyle = document.createElement('link');
        newStyle.id = 'page-style';
        newStyle.rel = 'stylesheet';
        // A lógica de cache busting com Date.now() é importante aqui
        newStyle.href = `${styleHref}?v=${Date.now()}`; 
        document.head.appendChild(newStyle);
    }
};

const loadScriptsForPage = (html) => {
    document.querySelectorAll('script[id^="page-script"]').forEach(script => script.remove());

    const scriptRegex = /<script\s+src="([^"]+)"><\/script>/gi;
    let match;
    let count = 0;

    while ((match = scriptRegex.exec(html)) !== null) {
        const scriptSrc = match[1];
        

        const newScript = document.createElement('script');
        newScript.id = `page-script-${count++}`;
        newScript.src = `${scriptSrc}?v=${Date.now()}`;
        newScript.defer = true;
        document.body.appendChild(newScript);
    }
};

function updateActiveLinks(hash) {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const parentSubmenu = link.closest('.has-submenu');
        if (parentSubmenu && !parentSubmenu.querySelector(`a[href="${hash}"]`)) {
            parentSubmenu.classList.remove('open');
        }
    });
    const activeLink = document.querySelector(`.sidebar-menu a[href="${hash}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const submenu = activeLink.closest('.submenu');
        if (submenu) {
            const parentLi = submenu.closest('.has-submenu');
            parentLi.classList.add('open');
            parentLi.querySelector('.submenu-toggle').classList.add('active');
        }
    }
}

// =============================================
// --- EVENT LISTENERS E INICIALIZAÇÃO ---
// =============================================
window.addEventListener('hashchange', loadPage);

// A principal mudança é chamar a verificação de auth antes do loadPage
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuthAndLoadUser()) {
        loadPage();
    }
});


// FUNÇÕES GLOBAIS DE MODAL (MANTIDAS)
function showCustomAlert(title, message, type = 'error') { /* ... código ... */ }
function showCustomConfirm(title, message) { /* ... código ... */ }