// frontend/usuarios/buscar-usuarios.js

(() => { 
    let userListContainer;
    let paginationContainer;
    let todosUsuarios = [];
    let usuariosFiltrados = [];
    let paginaAtual = 1;
    const itensPorPagina = 10;
    
    let usuarioAtualModal = null;
    let historicoAtualModal = [];
    
    let historicoFiltradoModal = [];
    let paginaAtualHistUser = 1;
    const itensPorPaginaHistUser = 5;

    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    const showConfirm = typeof showCustomConfirm === 'function' ? showCustomConfirm : async (title, msg) => confirm(msg);

    function escaparHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[match]));
    }

    function mostrarErroVisual(campo, mensagem) {
        campo.classList.add('input-error');
        const grupo = campo.closest('.input-modal');
        if (grupo) {
            const spanErro = grupo.querySelector('.error-msg');
            if (spanErro) {
                spanErro.textContent = mensagem;
                spanErro.classList.add('visible');
            }
        }
    }

    function removerErroVisual(campo) {
        campo.classList.remove('input-error');
        const grupo = campo.closest('.input-modal');
        if (grupo) {
            const spanErro = grupo.querySelector('.error-msg');
            if (spanErro) {
                spanErro.classList.remove('visible');
                spanErro.textContent = '';
            }
        }
    }

    function validarCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    function formatarCPF(cpf) { return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"); }
    function formatarTel(t) { return t.replace(/\D/g, ''); } 
    function formatarTelExibicao(t) { 
        let v = t.replace(/\D/g, '');
        if(v.length === 11) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        return v;
    }

    function renderizarUsuarios(usuariosParaRenderizar) {
        userListContainer = document.querySelector('.user-list-container');
        if (!userListContainer) return; 
        userListContainer.innerHTML = '';
        
        if (usuariosParaRenderizar.length === 0) {
            userListContainer.innerHTML = '<p>Nenhum usuário encontrado para estes filtros.</p>';
            return;
        }

        usuariosParaRenderizar.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.setAttribute('data-id', user.id);
            
            const iconeOlho = user.ativo === false ? 'fa-eye' : 'fa-eye-slash';
            if (user.ativo === false) card.classList.add('desativado');

            let avatarHTML = `<i class="fas fa-user-circle avatar"></i>`;
            if (user.foto_perfil) {
                // CORREÇÃO: Enviando o Token na URL da Foto do Card
                const tokenUrl = localStorage.getItem('token');
                const fotoUrl = `http://localhost:3000/${user.foto_perfil.replace(/\\/g, '/')}?token=${tokenUrl}`;
                avatarHTML = `<img src="${fotoUrl}" class="avatar-img" alt="Foto">`;
            }

            let btnAprovar = user.status_aprovacao === 'pendente' 
                ? `<button class="action-btn approve" title="Aprovar Usuário" data-action="approve" style="color: #2ecc71;"><i class="fas fa-user-check"></i></button>` 
                : '';

            card.innerHTML = `
                <div class="user-info">
                    ${avatarHTML}
                    <span class="user-name">
                        ${escaparHTML(user.nome)} 
                        ${user.status_aprovacao === 'pendente' ? '<small style="color:#f39c12; margin-left:5px;">[PENDENTE]</small>' : ''}
                        ${user.tem_emprestimo ? '<small style="color:#2ecc71; margin-left:5px;">[COM NOTEBOOK]</small>' : ''}
                    </span>
                </div>
                <div class="user-actions">
                    ${btnAprovar}
                    <button class="action-btn deactivate" title="Ativar/Desativar" data-action="deactivate"><i class="fas ${iconeOlho}"></i></button>
                    <button class="action-btn delete" title="Excluir" data-action="delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            userListContainer.appendChild(card);
        });
    }

    function atualizarPagina() {
        const start = (paginaAtual - 1) * itensPorPagina;
        renderizarUsuarios(usuariosFiltrados.slice(start, start + itensPorPagina));
        renderizarPaginacao(usuariosFiltrados.length);
    }

    function renderizarPaginacao(total) {
        const container = document.getElementById('pagination-container');
        if (!container) return; 
        container.innerHTML = '';
        const pags = Math.ceil(total / itensPorPagina);
        if (pags <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Anterior';
        prevButton.disabled = (paginaAtual === 1);
        prevButton.onclick = () => { if (paginaAtual > 1) { paginaAtual--; atualizarPagina(); } };
        container.appendChild(prevButton);

        for (let i = 1; i <= pags; i++) {
            const a = document.createElement('a');
            a.textContent = i; a.href = '#';
            if (i === paginaAtual) a.className = 'active';
            a.onclick = (e) => { e.preventDefault(); paginaAtual = i; atualizarPagina(); };
            container.appendChild(a);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Próximo';
        nextButton.disabled = (paginaAtual === pags);
        nextButton.onclick = () => { if (paginaAtual < pags) { paginaAtual++; atualizarPagina(); } };
        container.appendChild(nextButton);
    }

    async function buscarUsuarios() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch('http://localhost:3000/usuarios', { headers: { 'Authorization': `Bearer ${token}` }});
            if (!response.ok) throw new Error('Falha na rede');
            todosUsuarios = await response.json(); 
            aplicarFiltros(); 
            adicionarListenersBusca();
        } catch (error) { console.error(error); }
    }

    function aplicarFiltros() {
        const termo = document.getElementById('filtro-busca')?.value.toLowerCase().trim() || '';
        const numTermo = termo.replace(/\D/g, ''); 
        
        const tOrdem = document.getElementById('filtro-ordem')?.value || 'padrao';
        const tAprov = document.getElementById('filtro-aprovacao')?.value || 'todos';
        const tCurso = document.getElementById('filtro-curso')?.value || '';
        const tPeriodo = document.getElementById('filtro-periodo')?.value || '';

        usuariosFiltrados = todosUsuarios.filter(u => {
            const matchNome = (u.nome || '').toLowerCase().includes(termo);
            const matchMatricula = (u.matricula || '').toLowerCase().includes(termo);
            const matchCpf = numTermo.length > 0 && (u.cpf || '').includes(numTermo);
            const matchGeral = (termo === '') || matchNome || matchMatricula || matchCpf;

            return matchGeral &&
                   (tAprov === 'todos' || u.status_aprovacao === tAprov) &&
                   (tCurso === "" || u.curso === tCurso) &&
                   (tPeriodo === "" || u.periodo == tPeriodo);
        });

        if (tOrdem === 'az') {
            usuariosFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        } else if (tOrdem === 'za') {
            usuariosFiltrados.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
        }

        paginaAtual = 1; 
        atualizarPagina(); 
    }

    function adicionarListenersBusca() {
        ['filtro-busca', 'filtro-ordem', 'filtro-aprovacao', 'filtro-curso', 'filtro-periodo'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', aplicarFiltros);
            document.getElementById(id)?.addEventListener('change', aplicarFiltros);
        });

        const c = document.querySelector('.user-list-container');
        if(!c) return;
        const clone = c.cloneNode(true); c.parentNode.replaceChild(clone, c);
        
        clone.addEventListener('click', async (e) => {
            const btn = e.target.closest('.action-btn');
            const card = e.target.closest('.user-card');
            if (!card) return;
            
            const id = card.dataset.id;
            const token = localStorage.getItem('token');

            if (btn) {
                e.stopPropagation(); 
                const action = btn.dataset.action;
                const nome = card.querySelector('.user-name').textContent.replace('[PENDENTE]', '').replace('[COM NOTEBOOK]', '').trim();

                if (action === 'approve') {
                    const confirmed = await showConfirm('Aprovar Usuário', `Deseja aprovar o acesso de ${nome}?`);
                    if (confirmed) {
                        try {
                            const res = await fetch(`http://localhost:3000/api/usuarios/${id}/aprovar`, { method:'PATCH', headers:{'Authorization':`Bearer ${token}`}});
                            if (!res.ok) throw new Error('Erro ao aprovar');
                            showAlert('Sucesso', 'Usuário aprovado!', 'success');
                            buscarUsuarios();
                        } catch (err) { showAlert('Erro', err.message, 'error'); }
                    }
                } else if (action === 'delete') {
                    const confirmed = await showConfirm('Excluir Usuário', `ATENÇÃO: Deseja excluir ${nome} permanentemente?`);
                    if (confirmed) {
                        try {
                            const res = await fetch(`http://localhost:3000/usuarios/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`}});
                            if(!res.ok) { const err = await res.json(); throw new Error(err.message); }
                            showAlert('Sucesso', 'Usuário excluído!', 'success');
                            buscarUsuarios();
                        } catch(error) { showAlert('Erro ao Excluir', error.message, 'error'); }
                    }
                } else if (action === 'deactivate') {
                    const confirmed = await showConfirm('Alterar Status', `Deseja alterar o status de ${nome}?`);
                    if (confirmed) {
                        try {
                            const res = await fetch(`http://localhost:3000/api/usuarios/${id}/status`, { method:'PATCH', headers:{'Authorization':`Bearer ${token}`}});
                            if(!res.ok) { const err = await res.json(); throw new Error(err.message); }
                            showAlert('Sucesso', 'Status alterado com sucesso!', 'success');
                            buscarUsuarios();
                        } catch(error) { showAlert('Erro', error.message, 'error'); }
                    }
                }
            } else {
                abrirModalPerfil(id);
            }
        });
    }

    async function abrirModalPerfil(id) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${id}/perfil`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            usuarioAtualModal = data.usuario;
            historicoAtualModal = data.historico;
            
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            document.querySelectorAll('.error-msg').forEach(el => { el.classList.remove('visible'); el.textContent = ''; });
            
            preencherModal(data);
            document.getElementById('modal-perfil').style.display = 'flex';
        } catch (e) { showAlert("Erro", "Falha ao carregar os dados do perfil.", "error"); }
    }

    function preencherModal({ usuario, ativo, historico }) {
        document.getElementById('modal-nome-titulo').textContent = usuario.nome;
        const f = document.getElementById('modal-foto');
        const tokenAtual = localStorage.getItem('token');
        
        // CORREÇÃO: Enviando o Token na URL da Foto do Modal
        f.innerHTML = usuario.foto_perfil ? `<img src="http://localhost:3000/${usuario.foto_perfil.replace(/\\/g, '/')}?token=${tokenAtual}" alt="Foto">` : `<i class="fas fa-user-circle"></i>`;

        const alerta = document.getElementById('alerta-emprestimo');
        if (ativo) {
            const devPrevista = new Date(ativo.data_devolucao_prevista);
            const agora = new Date();
            const diffMs = devPrevista - agora;
            
            const diffMinutosTotal = Math.floor(diffMs / (1000 * 60));
            let textoTempo = '';
            
            if (diffMinutosTotal < 0) {
                const atrasoMinutos = Math.abs(diffMinutosTotal);
                const h = Math.floor(atrasoMinutos / 60);
                const m = atrasoMinutos % 60;
                textoTempo = `<span style="color:#e74c3c;">ATRASADO em ${h}h e ${m}m</span>`;
            } else {
                const h = Math.floor(diffMinutosTotal / 60);
                const m = diffMinutosTotal % 60;
                textoTempo = h > 0 ? `${h}h e ${m}m restantes` : `${m}m restantes`;
            }
            
            alerta.innerHTML = `⚠️ Empréstimo Ativo: <strong>Tomb: ${escaparHTML(ativo.tombamento)} (N/S: ${escaparHTML(ativo.numero_serie || 'N/A')})</strong>. Prazo: ${textoTempo}`;
            alerta.style.display = 'block';
        } else { 
            alerta.style.display = 'none'; 
        }

        document.getElementById('edit-id').value = usuario.id;
        document.getElementById('edit-nome').value = usuario.nome || '';
        document.getElementById('edit-cpf').value = formatarCPF(usuario.cpf || '');
        if (usuario.data_nascimento) document.getElementById('edit-data_nascimento').value = usuario.data_nascimento.split('T')[0];
        document.getElementById('edit-sexo').value = usuario.sexo || '';
        document.getElementById('edit-email').value = usuario.email || '';
        document.getElementById('edit-telefone').value = formatarTelExibicao(usuario.telefone || '');
        
        document.getElementById('edit-curso').value = usuario.curso || '';
        document.getElementById('edit-matricula').value = usuario.matricula || '';
        document.getElementById('edit-periodo').value = usuario.periodo || '';
        document.getElementById('edit-turno').value = usuario.turno || '';

        document.getElementById('edit-cep').value = usuario.cep || '';
        document.getElementById('edit-rua').value = usuario.rua || '';
        document.getElementById('edit-numero_end').value = usuario.numero_end || '';
        document.getElementById('edit-complemento').value = usuario.complemento || '';
        document.getElementById('edit-bairro').value = usuario.bairro || '';
        document.getElementById('edit-cidade').value = usuario.cidade || '';
        document.getElementById('edit-uf').value = usuario.uf || '';

        const links = [];
        // CORREÇÃO: Enviando o Token na URL dos PDFs
        if(usuario.arquivo_declaracao) links.push(`<a href="http://localhost:3000/${usuario.arquivo_declaracao.replace(/\\/g, '/')}?token=${tokenAtual}" target="_blank" style="color:#3498db; font-weight:bold;">📄 Ver Declaração</a>`);
        if(usuario.arquivo_termo) links.push(`<a href="http://localhost:3000/${usuario.arquivo_termo.replace(/\\/g, '/')}?token=${tokenAtual}" target="_blank" style="color:#3498db; font-weight:bold;">📄 Ver Termo</a>`);
        document.getElementById('modal-docs-links').innerHTML = links.length ? links.join(' | ') : 'Nenhum documento anexado.';

        document.getElementById('btn-salvar-alteracoes').style.display = 'none';
        
        document.querySelector('[data-target="tab-dados"]').click();
        
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        document.getElementById('filtro-notebook-hist').value = '';
        document.getElementById('filtro-data-inicio-hist').value = primeiroDia.toISOString().split('T')[0];
        document.getElementById('filtro-data-fim-hist').value = hoje.toISOString().split('T')[0];

        filtrarHistoricoLocal();

        document.getElementById('btn-whatsapp-perfil').onclick = () => {
            window.open(`https://wa.me/55${usuario.telefone.replace(/\D/g,'')}?text=Olá ${usuario.nome.split(' ')[0]}, aqui é da coordenação do Projeto Genius.`, '_blank');
        };
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).style.display = 'block';

            const textoBtn = document.getElementById('texto-btn-pdf');
            if (textoBtn) {
                textoBtn.innerText = btn.dataset.target === 'tab-dados' ? 'Baixar Perfil' : 'Baixar Histórico';
            }
        };
    });

    const formEdicao = document.getElementById('form-edicao-modal');
    formEdicao.addEventListener('input', (e) => {
        document.getElementById('btn-salvar-alteracoes').style.display = 'inline-block';
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') removerErroVisual(e.target);
    });
    formEdicao.addEventListener('change', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') removerErroVisual(e.target);
    });

    formEdicao.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let formValido = true;
        let primeiroCampoComErro = null;

        const camposObrigatorios = formEdicao.querySelectorAll('[required]');
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        camposObrigatorios.forEach(campo => {
            removerErroVisual(campo);
            if (!campo.value.trim() || campo.value === '') {
                mostrarErroVisual(campo, 'Este campo é obrigatório.');
                formValido = false;
                if (!primeiroCampoComErro) primeiroCampoComErro = campo;
            } 
            else if (campo.type === 'email' && !regexEmail.test(campo.value.trim())) {
                mostrarErroVisual(campo, 'Digite um e-mail válido (ex: nome@email.com).');
                formValido = false;
                if (!primeiroCampoComErro) primeiroCampoComErro = campo;
            }
        });

        const cpfInput = formEdicao.querySelector('#edit-cpf');
        const cpfLimpo = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
        if (cpfInput && cpfLimpo.length > 0 && !validarCPF(cpfLimpo)) {
            mostrarErroVisual(cpfInput, 'CPF inválido.');
            formValido = false;
            if (!primeiroCampoComErro) primeiroCampoComErro = cpfInput;
        }

        const dataNascInput = formEdicao.querySelector('#edit-data_nascimento');
        if (dataNascInput && dataNascInput.value) {
            const dataNasc = new Date(dataNascInput.value);
            const hoje = new Date();
            const idade = hoje.getFullYear() - dataNasc.getFullYear();
            const m = hoje.getMonth() - dataNasc.getMonth();
            if (idade < 18 || (idade === 18 && m < 0)) {
                mostrarErroVisual(dataNascInput, 'Deve ser maior de 18 anos.');
                formValido = false;
                if (!primeiroCampoComErro) primeiroCampoComErro = dataNascInput;
            }
        }

        if (!formValido) {
            if (primeiroCampoComErro) {
                primeiroCampoComErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
                primeiroCampoComErro.focus();
            }
            return;
        }

        const token = localStorage.getItem('token');
        const id = document.getElementById('edit-id').value;
        const btnSalvar = document.getElementById('btn-salvar-alteracoes');
        
        btnSalvar.textContent = 'Salvando...';
        btnSalvar.disabled = true;

        const formData = new FormData(formEdicao);
        formData.set('cpf', formatarTel(formData.get('cpf'))); 
        formData.set('telefone', formatarTel(formData.get('telefone'))); 

        try {
            const res = await fetch(`http://localhost:3000/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Erro ao salvar');
            
            showAlert('Sucesso!', 'Informações atualizadas com sucesso!', 'success');
            btnSalvar.style.display = 'none';
            buscarUsuarios();
            
        } catch (error) { 
            const msgErro = error.message.toLowerCase();
            let campoMarcado = false;

            if (msgErro.includes('matrícula')) {
                mostrarErroVisual(document.getElementById('edit-matricula'), 'Matrícula já cadastrada.');
                document.getElementById('edit-matricula').focus();
                campoMarcado = true;
            } else if (msgErro.includes('cpf')) {
                mostrarErroVisual(document.getElementById('edit-cpf'), 'CPF já cadastrado.');
                document.getElementById('edit-cpf').focus();
                campoMarcado = true;
            } else if (msgErro.includes('email') || msgErro.includes('e-mail')) {
                mostrarErroVisual(document.getElementById('edit-email'), 'E-mail já está em uso.');
                document.getElementById('edit-email').focus();
                campoMarcado = true;
            }

            if (!campoMarcado) showAlert('Erro', error.message, 'error'); 
        } finally {
            btnSalvar.textContent = 'Salvar Alterações';
            btnSalvar.disabled = false;
        }
    });

    function renderizarHistorico(lista) {
        const container = document.getElementById('lista-historico');
        container.innerHTML = '';
        if(lista.length === 0) {
            container.innerHTML = '<p style="color:#666; margin-top:15px;">Nenhum empréstimo registrado no histórico para este período.</p>'; 
            return;
        }
        
        lista.sort((a, b) => b.id - a.id);
        const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

        lista.forEach(emp => {
            const dEmp = new Date(emp.data_emprestimo);
            const dReal = new Date(emp.data_devolucao_real);
            const dPrev = new Date(emp.data_devolucao_prevista);

            const agora = new Date();
            if (dReal > agora) dReal.setHours(dReal.getHours() - 3);
            if (dEmp > agora) dEmp.setHours(dEmp.getHours() - 3);

            let dPrevTolerancia = new Date(dPrev.getTime());
            dPrevTolerancia.setMinutes(dPrevTolerancia.getMinutes() + 15);

            const noPrazo = dReal <= dPrevTolerancia;

            const dia = String(dEmp.getDate()).padStart(2, '0');
            const mes = meses[dEmp.getMonth()];
            const ano = dEmp.getFullYear();

            const dataEmpStr = dEmp.toLocaleDateString('pt-BR');
            const horaEmpStr = dEmp.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            const dataRealStr = dReal.toLocaleDateString('pt-BR');
            const horaRealStr = dReal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            const dataPrevStr = dPrev.toLocaleDateString('pt-BR');
            const horaPrevStr = dPrev.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

            container.innerHTML += `
                <div class="hist-card ${noPrazo ? 'noprazo' : 'atrasado'}">
                    <div class="hist-date">
                        <span class="mes">${mes}</span>
                        <span class="dia">${dia}</span>
                        <span class="ano">${ano}</span>
                    </div>
                    <div class="hist-details">
                        <h4 style="margin-bottom: 10px;">💻 Tomb: ${escaparHTML(emp.tombamento)} <span style="font-size:0.8rem; font-weight:normal; color:#cbd5e1;">(N/S: ${escaparHTML(emp.numero_serie || 'N/A')})</span></h4>
                        
                        <div style="font-size: 0.9rem; color: #475569; margin-bottom: 10px;">
                            <p style="margin: 3px 0;" class="hist-info-line"><strong>🟢 Retirado em:</strong> ${dataEmpStr} às ${horaEmpStr}</p>
                            <p style="margin: 3px 0;" class="hist-info-line"><strong>🔴 Devolvido em:</strong> ${dataRealStr} às ${horaRealStr}</p>
                            <p style="font-size: 0.8rem; color: #94a3b8; margin: 3px 0;" class="hist-prazo"><em>Prazo limite: ${dataPrevStr} às ${horaPrevStr}</em></p>
                        </div>

                        <p class="hist-status" style="font-size: 0.85rem; font-weight: bold; color: ${noPrazo?'#22c55e':'#ef4444'}; border-top: 1px solid #3f4e63; padding-top: 8px;">
                            ${noPrazo ? '✔ Devolvido No Prazo' : '✖ Devolvido com Atraso'} | <span style="color:#94a3b8; font-weight:normal;" class="obs-text">Obs: ${escaparHTML(emp.observacoes_devolucao || 'Nenhuma')}</span>
                        </p>
                    </div>
                </div>
            `;
        });
    }

    function atualizarPaginaHistUser() {
        const startIndex = (paginaAtualHistUser - 1) * itensPorPaginaHistUser;
        const endIndex = startIndex + itensPorPaginaHistUser;
        const historicoDaPagina = historicoFiltradoModal.slice(startIndex, endIndex);
        
        renderizarHistorico(historicoDaPagina);
        renderizarPaginacaoHistUser(historicoFiltradoModal.length);
    }

    function renderizarPaginacaoHistUser(totalItens) {
        const paginationContainer = document.getElementById('pagination-historico-user');
        if (!paginationContainer) return; 

        paginationContainer.innerHTML = '';
        const totalPaginas = Math.ceil(totalItens / itensPorPaginaHistUser);
        if (totalPaginas <= 1) return; 

        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;'; // Seta Esquerda <
        prevButton.disabled = (paginaAtualHistUser === 1);
        prevButton.style.padding = '8px 15px';
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaAtualHistUser > 1) { paginaAtualHistUser--; atualizarPaginaHistUser(); }
        });
        paginationContainer.appendChild(prevButton);

        for (let i = 1; i <= totalPaginas; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;
            if (i === paginaAtualHistUser) pageLink.classList.add('active');
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                paginaAtualHistUser = i;
                atualizarPaginaHistUser();
            });
            paginationContainer.appendChild(pageLink);
        }

        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;'; // Seta Direita >
        nextButton.disabled = (paginaAtualHistUser === totalPaginas);
        nextButton.style.padding = '8px 15px';
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaAtualHistUser < totalPaginas) { paginaAtualHistUser++; atualizarPaginaHistUser(); }
        });
        paginationContainer.appendChild(nextButton);
    }

    function filtrarHistoricoLocal() {
        const termoNotebook = (document.getElementById('filtro-notebook-hist')?.value || '').toLowerCase();
        const dataInicio = document.getElementById('filtro-data-inicio-hist')?.value;
        const dataFim = document.getElementById('filtro-data-fim-hist')?.value;

        historicoFiltradoModal = historicoAtualModal.filter(emp => {
            const matchNote = (emp.numero_serie || '').toLowerCase().includes(termoNotebook) ||
                              (emp.tombamento || '').toLowerCase().includes(termoNotebook);

            let passaData = true;
            const dReal = emp.data_devolucao_real ? new Date(emp.data_devolucao_real) : new Date(emp.data_emprestimo);
            const dApenasDia = new Date(dReal.getFullYear(), dReal.getMonth(), dReal.getDate());

            if (dataInicio) {
                const [ano, mes, dia] = dataInicio.split('-');
                const dInicio = new Date(ano, mes - 1, dia);
                if (dApenasDia < dInicio) passaData = false;
            }
            if (dataFim) {
                const [ano, mes, dia] = dataFim.split('-');
                const dFim = new Date(ano, mes - 1, dia);
                if (dApenasDia > dFim) passaData = false;
            }

            return matchNote && passaData;
        });

        paginaAtualHistUser = 1; 
        atualizarPaginaHistUser();
    }

    document.getElementById('filtro-notebook-hist')?.addEventListener('input', filtrarHistoricoLocal);
    document.getElementById('filtro-data-inicio-hist')?.addEventListener('change', filtrarHistoricoLocal);
    document.getElementById('filtro-data-fim-hist')?.addEventListener('change', filtrarHistoricoLocal);

    document.getElementById('btn-fechar-perfil').onclick = () => document.getElementById('modal-perfil').style.display = 'none';

    document.getElementById('btn-baixar-pdf').onclick = () => {
        const textoAtual = document.getElementById('texto-btn-pdf').innerText;
        const nomeAluno = document.getElementById('modal-nome-titulo').textContent.trim().split(' ')[0];
        const nomeCompleto = document.getElementById('modal-nome-titulo').textContent.trim();
        const matricula = document.getElementById('edit-matricula').value || 'Não Informada';
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        if (textoAtual === 'Baixar Perfil') {
            const elementoAlvo = document.getElementById('tab-dados');
            const opcoes = {
                margin: 10,
                filename: `Perfil_${nomeAluno}_Genius.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opcoes).from(elementoAlvo).save();

        } else {
            if (historicoFiltradoModal.length === 0) {
                const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
                return showAlert('Aviso', 'Não há histórico para exportar com estes filtros.', 'warning');
            }

            const btn = document.getElementById('btn-baixar-pdf');
            const textoOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
            btn.disabled = true;

            let periodoTexto = 'Período Completo';
            const inputInicio = document.getElementById('filtro-data-inicio-hist').value;
            const inputFim = document.getElementById('filtro-data-fim-hist').value;
            
            if(inputInicio && inputFim) {
                const dI = inputInicio.split('-').reverse().join('/');
                const dF = inputFim.split('-').reverse().join('/');
                periodoTexto = `${dI} a ${dF}`;
            }

            setTimeout(() => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF('l', 'mm', 'a4');

                    doc.setFontSize(18);
                    doc.setTextColor(44, 62, 80);
                    doc.text(`Histórico de Empréstimos - Aluno`, 14, 20);
                    
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Aluno: ${nomeCompleto} | Matrícula: ${matricula}`, 14, 28);
                    doc.text(`Período: ${periodoTexto} | Total de registros: ${historicoFiltradoModal.length}`, 14, 33);

                    const cabecalho = [['Notebook (Tomb / N/S)', 'Retirada', 'Devolução', 'Status', 'Observações']];
                    
                    const linhas = historicoFiltradoModal.map(emp => {
                        const dEmp = new Date(emp.data_emprestimo);
                        const dReal = emp.data_devolucao_real ? new Date(emp.data_devolucao_real) : null;
                        const dPrev = new Date(emp.data_devolucao_prevista);
                        
                        const dataEmpStr = dEmp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                        const dataDev = dReal ? dReal.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Ainda em uso';
                        
                        let statusTexto = 'EM ANDAMENTO';
                        if (dReal) {
                            let dPrevTolerancia = new Date(dPrev.getTime());
                            dPrevTolerancia.setMinutes(dPrevTolerancia.getMinutes() + 15);
                            const noPrazo = dReal <= dPrevTolerancia;
                            statusTexto = noPrazo ? 'NO PRAZO' : 'COM ATRASO';
                        }

                        return [
                            `Tomb: ${emp.tombamento}\nN/S: ${emp.numero_serie || 'N/A'}`,
                            dataEmpStr,
                            dataDev,
                            statusTexto,
                            emp.observacoes_devolucao || 'Nenhuma.'
                        ];
                    });

                    doc.autoTable({
                        head: cabecalho,
                        body: linhas,
                        startY: 40, 
                        theme: 'grid', 
                        styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, lineColor: [100, 116, 139], lineWidth: 0.3 },
                        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', lineColor: [44, 62, 80], lineWidth: 0.3 },
                        alternateRowStyles: { fillColor: [248, 250, 252] },
                        columnStyles: {
                            0: { cellWidth: 55 }, 
                            1: { cellWidth: 35 }, 
                            2: { cellWidth: 35 }, 
                            3: { cellWidth: 35, fontStyle: 'bold' }, 
                            4: { cellWidth: 'auto' } 
                        },
                        didParseCell: function(data) {
                            if (data.section === 'body' && data.column.index === 3) {
                                if (data.cell.raw === 'COM ATRASO') { data.cell.styles.textColor = [231, 76, 60]; } 
                                else if (data.cell.raw === 'NO PRAZO') { data.cell.styles.textColor = [39, 174, 96]; }
                                else { data.cell.styles.textColor = [52, 152, 219]; }
                            }
                        }
                    });

                    doc.save(`Historico_${nomeAluno}_${dataHoje.replace(/\//g, '-')}.pdf`);

                } catch (error) {
                    console.error("Erro ao gerar PDF:", error);
                    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
                    showAlert('Erro', 'Ocorreu um erro ao gerar o PDF.', 'error');
                } finally {
                    btn.innerHTML = textoOriginal;
                    btn.disabled = false;
                }
            }, 100);
        }
    };

    document.getElementById('edit-cpf')?.addEventListener('input', (e) => e.target.value = formatarCPF(e.target.value));
    document.getElementById('edit-telefone')?.addEventListener('input', (e) => e.target.value = formatarTelExibicao(e.target.value));
    document.getElementById('edit-nome')?.addEventListener('input', (e) => e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''));

    const cepInput = document.getElementById('edit-cep');
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 8);
        });

        cepInput.addEventListener('blur', async (e) => {
            const cep = e.target.value;
            if (cep.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        document.getElementById('edit-rua').value = data.logradouro;
                        document.getElementById('edit-bairro').value = data.bairro;
                        document.getElementById('edit-cidade').value = data.localidade;
                        document.getElementById('edit-uf').value = data.uf;
                        
                        removerErroVisual(document.getElementById('edit-rua'));
                        removerErroVisual(document.getElementById('edit-bairro'));
                        removerErroVisual(document.getElementById('edit-cidade'));
                        removerErroVisual(document.getElementById('edit-uf'));

                        document.getElementById('edit-numero_end').focus();
                    }
                } catch (err) { console.error("Erro ao buscar CEP"); }
            }
        });
    }

    const dataNascInput = document.getElementById('edit-data_nascimento');
    if (dataNascInput) {
        const dataMinima = new Date();
        dataMinima.setFullYear(dataMinima.getFullYear() - 18);
        const ano = dataMinima.getFullYear();
        const mes = String(dataMinima.getMonth() + 1).padStart(2, '0');
        const dia = String(dataMinima.getDate()).padStart(2, '0');
        dataNascInput.max = `${ano}-${mes}-${dia}`;
    }

    setTimeout(buscarUsuarios, 0);

})();
