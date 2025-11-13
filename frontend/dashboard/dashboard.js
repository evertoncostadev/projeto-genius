// frontend/dashboard/dashboard.js

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
            if (!response.ok) throw new Error('Página não encontrada');

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

window.addEventListener('hashchange', loadPage);

document.addEventListener('DOMContentLoaded', () => {
    loadPage();
});


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