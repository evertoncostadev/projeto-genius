// frontend/dashboard/dashboard.js

// ==========================================
// 1. GUARDIÃO DE AUTENTICAÇÃO E NOME DINÂMICO
// ==========================================
function verificarSessao() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '../login/login.html'; 
        return;
    }

    try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(decodeURIComponent(atob(payloadBase64)));

        if (Date.now() >= payload.exp * 1000) {
            alert('Sua sessão expirou. Por favor, faça login novamente.');
            localStorage.removeItem('token');
            window.location.href = '../login/login.html';
            return;
        }
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '../login/login.html';
    }
}

verificarSessao();

function fazerLogout() {
    localStorage.removeItem('token');
    window.location.href = '../login/login.html';
}

function atualizarSaudacao() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(decodeURIComponent(atob(payloadBase64)));
        const primeiroNome = payload.nome.split(' ')[0];

        const titulos = document.querySelectorAll('.main-content h1, .main-content h2, .main-content h3');
        titulos.forEach(titulo => {
            if (titulo.textContent.includes('Olá,') || titulo.textContent.includes('Luiz')) {
                titulo.innerHTML = `Olá, <span style="color:var(--primary-color)">${primeiroNome}</span>. Seja bem-vindo!`;
            }
        });
    } catch (e) {
        console.error("Erro ao atualizar a saudação:", e);
    }
}

// ==========================================
// 2. ROTEAMENTO E NAVEGAÇÃO SPA
// ==========================================

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
// Prepara a área principal para a animação de "fade" (suave)
mainContent.style.transition = 'opacity 0.2s ease-in-out';

document.addEventListener('click', (e) => {
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
    const hashLimpa = window.location.hash.split('?')[0] || '#home';
    let pageUrl = '';
    let idParam = null;
    let hashParaMenu = hashLimpa;
    let formMode = 'create';

    sessionStorage.removeItem('editUserId');
    sessionStorage.removeItem('editNotebookId');
    sessionStorage.removeItem('emprestimoStatus');

    if (hashLimpa === '#home') { pageUrl = routes[hashLimpa]; }
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
            // Oculta a área principal suavemente
            mainContent.style.opacity = '0';

            const response = await fetch(pageUrl);
            if (!response.ok) throw new Error('Página não encontrada');
            const html = await response.text();

            // A MÁGICA AQUI: O sistema ESPERA o CSS carregar ANTES de prosseguir
            await loadStylesForPage(html);

            // Agora sim, injeta o HTML (o CSS já está pronto e não haverá flash visual)
            mainContent.innerHTML = html;

            loadScriptsForPage(html);
            atualizarSaudacao();

            // Mostra a área principal suavemente já estilizada
            setTimeout(() => {
                mainContent.style.opacity = '1';
            }, 50);

        } catch (error) {
            mainContent.innerHTML = `<h2>Erro ao carregar o conteúdo.</h2>`;
            mainContent.style.opacity = '1';
            console.error('Erro no roteamento:', error);
        }
    } else {
        mainContent.innerHTML = `<h2>Página não encontrada.</h2>`;
        mainContent.style.opacity = '1';
    }
};

// ==========================================
// 3. CARREGADOR DE CSS COM PROMESSA (EVITA O BUG VISUAL)
// ==========================================
const loadStylesForPage = (html) => {
    return new Promise((resolve) => {
        const oldStyle = document.getElementById('page-style');
        const styleRegex = /<link\s+rel="stylesheet"\s+href="([^"]+)">/i;
        const match = html.match(styleRegex);
        
        if (match && match[1]) {
            const styleHref = match[1];
            
            // Se for a mesma página/CSS, não precisa recarregar
            if (oldStyle && oldStyle.getAttribute('data-href') === styleHref) {
                return resolve();
            }

            if (oldStyle) oldStyle.remove();
            
            const newStyle = document.createElement('link');
            newStyle.id = 'page-style';
            newStyle.rel = 'stylesheet';
            newStyle.setAttribute('data-href', styleHref);
            newStyle.href = `${styleHref}?v=${Date.now()}`;
            
            // Resolve a promessa APENAS quando o arquivo terminar de baixar
            newStyle.onload = () => resolve();
            newStyle.onerror = () => resolve(); // Se der erro, segue o jogo pra não travar tudo
            
            document.head.appendChild(newStyle);
        } else {
            if (oldStyle) oldStyle.remove();
            resolve();
        }
    });
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

window.addEventListener('hashchange', loadPage);

document.addEventListener('DOMContentLoaded', () => {
    loadPage();
});

// ==========================================
// 4. FUNÇÕES GLOBAIS DE ALERTA
// ==========================================

function showCustomAlert(title, message, type = 'error') {
    const oldModal = document.getElementById('custom-alert-modal');
    if (oldModal) oldModal.remove();

    let iconClass = 'fas fa-times-circle'; 
    let btnClass = 'error-btn';
    
    if (type === 'success') {
        iconClass = 'fas fa-check-circle'; 
        btnClass = ''; 
    }

    const modalHTML = `
        <div class="custom-modal-content">
            <i class="custom-modal-icon ${type} ${iconClass}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="custom-modal-btn ${btnClass}" id="custom-modal-close-btn">OK</button>
        </div>
    `;
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'custom-modal-backdrop';
    modalBackdrop.id = 'custom-alert-modal';
    modalBackdrop.innerHTML = modalHTML;
    
    document.body.appendChild(modalBackdrop);

    const closeModal = () => {
        modalBackdrop.classList.remove('visible');
        setTimeout(() => {
            if (modalBackdrop.parentElement) {
                modalBackdrop.parentElement.removeChild(modalBackdrop);
            }
        }, 300); 
    };

    document.getElementById('custom-modal-close-btn').addEventListener('click', closeModal);
    
    setTimeout(() => {
        modalBackdrop.classList.add('visible');
    }, 10);
}

function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const oldModal = document.getElementById('custom-confirm-modal');
        if (oldModal) oldModal.remove();

        const modalHTML = `
            <div class="custom-modal-content">
                <i class="custom-modal-icon error fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="custom-confirm-actions">
                    <button class="custom-modal-btn cancel" id="custom-confirm-btn-cancel">Cancelar</button>
                    <button class="custom-modal-btn error-btn" id="custom-confirm-btn-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'custom-modal-backdrop';
        modalBackdrop.id = 'custom-confirm-modal';
        modalBackdrop.innerHTML = modalHTML;
        
        document.body.appendChild(modalBackdrop);

        const btnConfirm = document.getElementById('custom-confirm-btn-confirm');
        const btnCancel = document.getElementById('custom-confirm-btn-cancel');

        const closeModal = () => {
            modalBackdrop.classList.remove('visible');
            setTimeout(() => {
                if (modalBackdrop.parentElement) {
                    modalBackdrop.parentElement.removeChild(modalBackdrop);
                }
            }, 300);
        };

        btnConfirm.addEventListener('click', () => {
            closeModal();
            resolve(true); 
        });
        
        btnCancel.addEventListener('click', () => {
            closeModal();
            resolve(false); 
        });
        
        setTimeout(() => {
            modalBackdrop.classList.add('visible');
        }, 10);
    });
}