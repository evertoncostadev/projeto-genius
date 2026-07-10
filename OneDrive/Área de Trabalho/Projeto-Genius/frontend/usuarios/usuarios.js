// frontend/usuarios/usuarios.js

function formatarCPF(cpf) {
    let valor = cpf.replace(/\D/g, '').substring(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    valor = valor.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    return valor;
}

function formatarTelefone(tel) {
    let valor = tel.replace(/\D/g, '').substring(0, 11);
    if (valor.length <= 2) {
        valor = valor.replace(/(\d{1,2})/, '($1');
    } else if (valor.length <= 6) {
        valor = valor.replace(/(\d{2})(\d{1,4})/, '($1) $2');
    } else if (valor.length <= 10) {
        valor = valor.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    } else {
        valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return valor;
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

function validarArquivo(fileInput, editUserId, isOptional = false) {
    if (!fileInput) return true;
    
    const file = fileInput.files[0];
    
    if (!editUserId && !file && !isOptional) {
        mostrarErroVisual(fileInput, `Arquivo obrigatório.`);
        return false;
    }

    if (file) {
        const tamanhoMaximo = 5 * 1024 * 1024; // 5MB
        const isFoto = fileInput.id.includes('foto');
        
        if (isFoto) {
            if (!file.type.startsWith('image/')) {
                mostrarErroVisual(fileInput, 'Envie apenas JPG ou PNG.');
                fileInput.value = '';
                return false;
            }
        } else {
            const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!tiposPermitidos.includes(file.type)) {
                mostrarErroVisual(fileInput, 'Apenas PDF ou DOC.');
                fileInput.value = '';
                return false;
            }
        }

        if (file.size > tamanhoMaximo) {
            mostrarErroVisual(fileInput, 'O tamanho máximo é 5MB.');
            fileInput.value = '';
            return false;
        }
    }
    return true;
}

function mostrarErroVisual(campo, mensagem) {
    if (campo.type === 'file') {
        const wrapper = campo.closest('.file-input-wrapper');
        if (wrapper) wrapper.classList.add('input-error');
    } else {
        campo.classList.add('input-error');
    }

    const grupo = campo.closest('.input-group');
    if (grupo) {
        const spanErro = grupo.querySelector('.error-msg');
        if (spanErro) {
            spanErro.textContent = mensagem;
            spanErro.classList.add('visible');
        }
    }
}

function removerErroVisual(campo) {
    if (campo.type === 'file') {
        const wrapper = campo.closest('.file-input-wrapper');
        if (wrapper) wrapper.classList.remove('input-error');
    } else {
        campo.classList.remove('input-error');
    }

    const grupo = campo.closest('.input-group');
    if (grupo) {
        const spanErro = grupo.querySelector('.error-msg');
        if (spanErro) {
            spanErro.classList.remove('visible');
            spanErro.textContent = '';
        }
    }
}

async function loadUserDataForEdit(userId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`http://localhost:3000/usuarios/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar dados.');
        const usuario = await response.json();

        document.getElementById('nome').value = usuario.nome;
        
        if (usuario.data_nascimento) {
            document.getElementById('data_nascimento').value = usuario.data_nascimento.split('T')[0];
        }

        document.getElementById('cpf').value = formatarCPF(usuario.cpf);
        document.getElementById('sexo').value = usuario.sexo;
        document.getElementById('matricula').value = usuario.matricula;
        document.getElementById('curso').value = usuario.curso;
        document.getElementById('periodo').value = usuario.periodo;
        document.getElementById('turno').value = usuario.turno;
        document.getElementById('cep').value = usuario.cep;
        document.getElementById('rua').value = usuario.rua;
        document.getElementById('numero_end').value = usuario.numero_end;
        document.getElementById('bairro').value = usuario.bairro;
        document.getElementById('cidade').value = usuario.cidade;
        document.getElementById('uf').value = usuario.uf;
        document.getElementById('complemento').value = usuario.complemento || '';
        document.getElementById('telefone').value = formatarTelefone(usuario.telefone);
        document.getElementById('email').value = usuario.email;

        document.querySelector('.form-wrapper-usuario h2').textContent = 'Editar Usuário';
        document.querySelector('.btn-submit-usuario').textContent = 'Salvar Alterações';

        const groupSenha = document.getElementById('group-senha');
        if (groupSenha) {
            groupSenha.style.display = 'none';
            document.getElementById('senha').required = false;
        }
        
        const groupConfirmaSenha = document.getElementById('group-confirma-senha');
        if (groupConfirmaSenha) {
            groupConfirmaSenha.style.display = 'none';
            document.getElementById('confirma_senha').required = false;
        }

        document.getElementById('foto-file').required = false; 
        document.getElementById('termo-file').required = false;

        if (usuario.foto_perfil) {
            const linkFoto = `http://localhost:3000/${usuario.foto_perfil.replace(/\\/g, '/')}`;
            document.getElementById('foto-name').innerHTML = `<a href="${linkFoto}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">Visualizar Foto Atual</a>`;
        }
        if (usuario.arquivo_termo) {
            const linkTer = `http://localhost:3000/${usuario.arquivo_termo.replace(/\\/g, '/')}`;
            document.getElementById('termo-name').innerHTML = `<a href="${linkTer}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">Visualizar Termo Salvo</a>`;
        }

    } catch (error) {
        if(typeof showCustomAlert === 'function') showCustomAlert('Erro', 'Não foi possível carregar os dados.', 'error');
    }
}

function setupFormSubmit(form, editUserId) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let formValido = true;
        let primeiroCampoComErro = null;

        const camposObrigatorios = form.querySelectorAll('[required]');
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        camposObrigatorios.forEach(campo => {
            removerErroVisual(campo);
            if (!campo.value.trim() || campo.value === '') {
                mostrarErroVisual(campo, 'Este campo é obrigatório.');
                formValido = false;
                if (!primeiroCampoComErro) primeiroCampoComErro = campo;
            } else if (campo.type === 'email' && !regexEmail.test(campo.value.trim())) {
                mostrarErroVisual(campo, 'Digite um e-mail válido.');
                formValido = false;
                if (!primeiroCampoComErro) primeiroCampoComErro = campo;
            }
        });

        if (!editUserId) {
            const senha = form.querySelector('#senha');
            const confirmaSenha = form.querySelector('#confirma_senha');

            if (senha && confirmaSenha) {
                if (senha.value.length > 0 && senha.value.length < 6) {
                    mostrarErroVisual(senha, 'No mínimo 6 caracteres.');
                    formValido = false;
                    if (!primeiroCampoComErro) primeiroCampoComErro = senha;
                }
                if (senha.value.length >= 6 && confirmaSenha.value.length > 0 && senha.value !== confirmaSenha.value) {
                    mostrarErroVisual(confirmaSenha, 'As senhas não coincidem.');
                    formValido = false;
                    if (!primeiroCampoComErro) primeiroCampoComErro = confirmaSenha;
                }
            }
        }

        const dataNascInput = form.querySelector('#data_nascimento');
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

        const cpfInput = form.querySelector('#cpf');
        const cpfLimpo = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
        if (cpfInput && cpfLimpo.length > 0 && !validarCPF(cpfLimpo)) {
            mostrarErroVisual(cpfInput, 'CPF inválido.');
            formValido = false;
            if (!primeiroCampoComErro) primeiroCampoComErro = cpfInput;
        }

        const fotoInput = document.getElementById('foto-file');
        const termoInput = document.getElementById('termo-file');
        
        if (!validarArquivo(fotoInput, editUserId, false)) {
            formValido = false;
            if (!primeiroCampoComErro) primeiroCampoComErro = fotoInput;
        }
        if (!validarArquivo(termoInput, editUserId, false)) {
            formValido = false;
            if (!primeiroCampoComErro) primeiroCampoComErro = termoInput;
        }

        if (!formValido) {
            if (primeiroCampoComErro) {
                primeiroCampoComErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (primeiroCampoComErro.type !== 'file') primeiroCampoComErro.focus();
            }
            return;
        }

        const token = localStorage.getItem('token');
        const formData = new FormData(form);
        const telefoneLimpo = formData.get('telefone').replace(/\D/g, '');
        
        formData.set('cpf', cpfLimpo);
        formData.set('telefone', telefoneLimpo);

        const submitButton = form.querySelector('.btn-submit-usuario');
        submitButton.disabled = true;
        submitButton.textContent = 'Processando...';

        try {
            let url = 'http://localhost:3000/usuarios';
            let method = 'POST';

            if (editUserId) {
                url = `http://localhost:3000/usuarios/${editUserId}`;
                method = 'PUT';
                formData.delete('senha');
                formData.delete('confirma_senha');
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData 
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            if(typeof showCustomAlert === 'function') showCustomAlert('Sucesso!', editUserId ? 'Cadastro atualizado com sucesso!' : 'Usuário cadastrado com sucesso!', 'success');
            
            if (editUserId) {
                sessionStorage.removeItem('editUserId');
                window.location.hash = '#usuarios_buscar';
            } else {
                form.reset();
                document.getElementById('foto-name').textContent = 'Nenhuma foto...';
                document.getElementById('termo-name').textContent = 'Nenhum arq...';
            }

        } catch (error) {
            const mensagemErro = error.message.toLowerCase();
            let campoMarcado = false;

            if (mensagemErro.includes('matrícula')) {
                const inputMatricula = document.getElementById('matricula');
                if (inputMatricula) {
                    mostrarErroVisual(inputMatricula, 'Matrícula já cadastrada.');
                    inputMatricula.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputMatricula.focus();
                    campoMarcado = true;
                }
            } else if (mensagemErro.includes('cpf')) {
                const inputCpf = document.getElementById('cpf');
                if (inputCpf) {
                    mostrarErroVisual(inputCpf, 'CPF já cadastrado.');
                    inputCpf.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputCpf.focus();
                    campoMarcado = true;
                }
            } else if (mensagemErro.includes('email') || mensagemErro.includes('e-mail')) {
                const inputEmail = document.getElementById('email');
                if (inputEmail) {
                    mostrarErroVisual(inputEmail, 'E-mail já está em uso.');
                    inputEmail.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputEmail.focus();
                    campoMarcado = true;
                }
            }

            if (!campoMarcado) {
                if(typeof showCustomAlert === 'function') showCustomAlert('Erro ao Salvar', error.message, 'error');
            }

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = editUserId ? 'Salvar Alterações' : 'Cadastrar Usuário';
        }
    });
}

function setupFormExtras() {
    const form = document.getElementById('form-cadastrar-usuario');
    if(form) {
        const todosInputs = form.querySelectorAll('input, select');
        todosInputs.forEach(input => {
            input.addEventListener('input', function() { removerErroVisual(this); });
            input.addEventListener('change', function() { removerErroVisual(this); });
        });
    }

    document.getElementById('nome')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    });

    const dataNascInput = document.getElementById('data_nascimento');
    if (dataNascInput) {
        const dataMinima = new Date();
        dataMinima.setFullYear(dataMinima.getFullYear() - 18);
        const ano = dataMinima.getFullYear();
        const mes = String(dataMinima.getMonth() + 1).padStart(2, '0');
        const dia = String(dataMinima.getDate()).padStart(2, '0');
        dataNascInput.max = `${ano}-${mes}-${dia}`;
    }

    document.getElementById('cpf')?.addEventListener('input', (e) => e.target.value = formatarCPF(e.target.value));
    document.getElementById('telefone')?.addEventListener('input', (e) => e.target.value = formatarTelefone(e.target.value));
    
    const cepInput = document.getElementById('cep');
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
                        document.getElementById('rua').value = data.logradouro;
                        document.getElementById('bairro').value = data.bairro;
                        document.getElementById('cidade').value = data.localidade;
                        document.getElementById('uf').value = data.uf;
                        
                        removerErroVisual(document.getElementById('rua'));
                        removerErroVisual(document.getElementById('bairro'));
                        removerErroVisual(document.getElementById('cidade'));
                        removerErroVisual(document.getElementById('uf'));

                        document.getElementById('numero_end').focus();
                    }
                } catch (err) { console.error("Erro ao buscar CEP"); }
            }
        });
    }

    ['foto', 'termo'].forEach(field => {
        const input = document.getElementById(`${field}-file`);
        const label = document.getElementById(`${field}-name`);
        input?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                label.innerHTML = e.target.files[0].name;
                label.style.color = '#333';
                removerErroVisual(input);
            } else {
                label.innerHTML = field === 'foto' ? 'Nenhuma foto...' : 'Nenhum arq...';
                label.style.color = '#aaa';
            }
        });
    });
}

function initUsuarioForm() {
    const editUserId = sessionStorage.getItem('editUserId');
    const form = document.getElementById('form-cadastrar-usuario');

    if (form) {
        setupFormSubmit(form, editUserId);
        setupFormExtras();
        if (editUserId) loadUserDataForEdit(editUserId);
    }
}

setTimeout(initUsuarioForm, 0);