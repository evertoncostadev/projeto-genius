// EM: frontend/usuarios/usuarios.js

// Variável global para usar showCustomAlert ou fallback para alert()
// É essencial que a função showCustomAlert esteja definida no seu dashboard.js ou outro script global.
const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

// FUNÇÕES DE UTILIDADE
// ----------------------------------------------------------------------

function formatarCPF(cpf) {
    let valor = cpf.replace(/\D/g, ''); 
    valor = valor.substring(0, 11); 

    valor = valor.replace(/(\d{3})(\d)/, '$1.$2'); 
    valor = valor.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3'); 
    valor = valor.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4'); 
    return valor;
}

function formatarTelefone(tel) {
    let valor = tel.replace(/\D/g, '');
    valor = valor.substring(0, 11); 

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

    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true; 
}

function validarArquivo(fileInput, editUserId) { 
    const file = fileInput.files[0];
    
    // Verificação de obrigatoriedade
    // Se não for edição E o arquivo for nulo, dispara o alerta
    if (!editUserId && fileInput.required && !file) {
        showAlert('Arquivo Obrigatório', `O arquivo "${fileInput.name.replace('-file', '')}" é obrigatório.`, 'error');
        return false;
    }

    if (file) { 
        // TIPOS PERMITIDOS: Imagens E PDF (corrigido implicitamente no HTML)
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        const tamanhoMaximo = 5 * 1024 * 1024; // 5MB

        if (!tiposPermitidos.includes(file.type)) {
            showAlert('Tipo de Arquivo Inválido', `Tipo de arquivo inválido para "${fileInput.name.replace('-file', '')}". Por favor, envie apenas PDF ou Imagens (JPG, PNG, GIF).`, 'error');
            fileInput.value = '';
            // Reinicia o display do nome do arquivo
            document.getElementById(fileInput.id.replace('-file', '-name')).textContent = 'Nenhum arq...';
            document.getElementById(fileInput.id.replace('-file', '-name')).style.color = '#aaa';
            return false;
        }

        if (file.size > tamanhoMaximo) {
            showAlert('Arquivo Muito Grande', `Arquivo "${file.name}" é muito grande. O limite é de 5MB.`, 'error');
            fileInput.value = '';
            // Reinicia o display do nome do arquivo
            document.getElementById(fileInput.id.replace('-file', '-name')).textContent = 'Nenhum arq...';
            document.getElementById(fileInput.id.replace('-file', '-name')).style.color = '#aaa';
            return false;
        }
    }
    return true; 
}


// FUNÇÃO DE LIMPEZA
// ----------------------------------------------------------------------
function limparCamposEndereco() {
    document.getElementById('rua').value = '';
    document.getElementById('bairro').value = '';
    document.getElementById('cidade').value = '';
    document.getElementById('uf').value = '';
}


// FUNÇÃO DE CARREGAMENTO (MANTIDA)
// ----------------------------------------------------------------------

async function loadUserDataForEdit(userId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('Erro de Autenticação', 'Sua sessão expirou. Faça login novamente.', 'error');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/usuarios/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar dados do usuário.');
        const usuario = await response.json();

        document.getElementById('nome').value = usuario.nome;
        document.getElementById('data_nascimento').value = usuario.data_nascimento;
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

        const declaracaoInput = document.getElementById('declaracao-file');
        const termoInput = document.getElementById('termo-file');
        if (declaracaoInput) declaracaoInput.required = false;
        if (termoInput) termoInput.required = false;

        const declaracaoLabel = document.querySelector('label[for="declaracao"]');
        const termoLabel = document.querySelector('label[for="termo"]');
        if (declaracaoLabel) declaracaoLabel.textContent = 'Substituir Declaração (Opcional)';
        if (termoLabel) termoLabel.textContent = 'Substituir Termo (Opcional)';

        const groupTipoConta = document.getElementById('group-tipo-conta');
        const groupSenha = document.getElementById('group-senha');
        if (groupTipoConta) groupTipoConta.style.display = 'none';
        if (groupSenha) groupSenha.style.display = 'none';

    } catch (error) {
        console.error(error);
        showAlert('Erro ao Carregar', 'Não foi possível carregar os dados do usuário.', 'error');
    }
}


// FUNÇÃO DE SUBMISSÃO (CORRIGIDA)
// ----------------------------------------------------------------------
function setupFormSubmit(form, editUserId) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('Erro de Autenticação', 'Sua sessão expirou. Faça login novamente.', 'error');
            return;
        }

        const formData = new FormData(form);
        
        const cpfLimpo = formData.get('cpf').replace(/\D/g, '');
        const telefoneLimpo = formData.get('telefone').replace(/\D/g, '');
        
        formData.set('cpf', cpfLimpo);
        formData.set('telefone', telefoneLimpo);

        // --- VALIDAÇÕES ---
        const dataNasc = new Date(formData.get('data_nascimento'));

        if (cpfLimpo.length !== 11) {
            showAlert('Erro de Validação', 'CPF inválido. Deve conter 11 números.', 'error'); return;
        }
        if (!validarCPF(cpfLimpo)) { 
            showAlert('Erro de Validação', 'O CPF digitado é matematicamente inválido.', 'error'); return;
        }
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            showAlert('Erro de Validação', 'Telefone inválido. Deve conter 10 (DDD+Número) ou 11 (DDD+9+Número) números.', 'error'); return;
        }
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); 
        if (dataNasc > hoje) {
            showAlert('Erro de Validação', 'A data de nascimento não pode ser no futuro.', 'error'); return;
        }

        const declaracaoInput = document.getElementById('declaracao-file');
        const termoInput = document.getElementById('termo-file');
        if (!validarArquivo(declaracaoInput, editUserId) || !validarArquivo(termoInput, editUserId)) {
            return; 
        }

        const tipoConta = formData.get('tipo_conta');
        const senha = formData.get('senha');

        if (tipoConta === 'admin' && !editUserId && (!senha || senha.length < 6)) {
            showAlert('Erro de Validação', 'O campo "Senha Provisória" é obrigatório ao criar um Administrador e deve ter pelo menos 6 caracteres.', 'error');
            return; 
        }

        // Se for edição, remove campos que o PUT não deve alterar
        if (editUserId) {
            formData.delete('tipo_conta');
            formData.delete('senha');
        }
        // Se for aluno, remove a senha do payload
        if (tipoConta === 'comum' && !editUserId) {
            formData.delete('senha');
        }

        // --- INÍCIO DO ENVIO ---
        
        const submitButton = form.querySelector('.btn-submit-usuario');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            let response;
            let url = 'http://localhost:3000/usuarios';
            let method = 'POST';
            
            // CORREÇÃO CRUCIAL: Apenas Authorization é necessário no header. 
            // O Content-Type é definido automaticamente pelo navegador como 'multipart/form-data'.
            let headers = { 'Authorization': `Bearer ${token}` }; 
            let body = formData; 

            if (editUserId) {
                url = `http://localhost:3000/usuarios/${editUserId}`;
                method = 'PUT';
            }

            response = await fetch(url, {
                method: method,
                headers: headers,
                body: body
            });

            const result = await response.json();
            if (!response.ok) {
                // Captura a mensagem de erro do backend para exibir no modal
                throw new Error(result.message || 'Erro ao salvar. Verifique a resposta do servidor.');
            }

            if (editUserId) {
                showAlert('Sucesso!', 'Usuário atualizado com sucesso.', 'success');
                sessionStorage.removeItem('editUserId'); 
                window.location.hash = '#usuarios_buscar'; 
            } else {
                showAlert('Sucesso!', 'Usuário cadastrado com sucesso.', 'success');
                form.reset(); 
                
                // Limpa os displays de nome de arquivo após resetar o form
                const declaracaoName = document.getElementById('declaracao-name');
                const termoName = document.getElementById('termo-name');
                if (declaracaoName) {
                    declaracaoName.textContent = 'Nenhum arq...';
                    declaracaoName.style.color = '#aaa';
                }
                if (termoName) {
                    termoName.textContent = 'Nenhum arq...';
                    termoName.style.color = '#aaa';
                }
            }
        
        } catch (error) {
            console.error('Erro no submit:', error);
            showAlert('Erro ao Salvar', error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = editUserId ? 'Salvar Alterações' : 'Cadastrar Usuário';
        }
    });
}


// FUNÇÃO DE EXTRAS (CORRIGIDA)
// ----------------------------------------------------------------------
function setupFormExtras(editUserId) { 

    const dataNascimentoInput = document.getElementById('data_nascimento');
    if (dataNascimentoInput) {
        const hoje = new Date().toISOString().split('T')[0];
        dataNascimentoInput.max = hoje;
    }

    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            e.target.value = formatarCPF(e.target.value);
        });
    }

    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            e.target.value = formatarTelefone(e.target.value);
        });
    }

    const cepInput = document.getElementById('cep');
    if (cepInput) {
        // Formatação da máscara do CEP no input
        cepInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.substring(0, 5) + '-' + value.substring(5, 8);
            }
            e.target.value = value.substring(0, 9);
        });

        // Lógica de busca e tratamento de erro de CEP
        cepInput.addEventListener('blur', async (e) => {
            const cep = e.target.value.replace(/\D/g, ''); 
            
            if (cep.length === 8) {
                try {
                    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
                    
                    if (!response.ok) {
                        limparCamposEndereco();
                        const errorData = await response.json(); 
                        throw new Error(errorData.message || 'CEP não encontrado'); 
                    }
                    
                    const data = await response.json();
                    
                    document.getElementById('rua').value = data.street || '';
                    document.getElementById('bairro').value = data.neighborhood || '';
                    document.getElementById('cidade').value = data.city || '';
                    document.getElementById('uf').value = data.state || '';
                    document.getElementById('numero_end').focus();
                    
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    limparCamposEndereco();
                    showAlert('Erro no CEP', error.message || 'Não foi possível buscar o CEP. Tente novamente.', 'error');
                }
            } else if (cep.length > 0) {
                 limparCamposEndereco();
                 showAlert('CEP Incompleto', 'Por favor, digite 8 dígitos do CEP.', 'warning');
            }
        });
    }

    // Lógica para mostrar o nome do arquivo
    const declaracaoInput = document.getElementById('declaracao-file');
    const declaracaoName = document.getElementById('declaracao-name');
    if (declaracaoInput) {
        declaracaoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                if (validarArquivo(declaracaoInput, editUserId)) { 
                    declaracaoName.textContent = e.target.files[0].name;
                    declaracaoName.style.color = '#333';
                } else {
                    declaracaoName.textContent = 'Nenhum arq...';
                    declaracaoName.style.color = '#aaa';
                }
            } else {
                declaracaoName.textContent = 'Nenhum arq...';
                declaracaoName.style.color = '#aaa';
            }
        });
    }

    const termoInput = document.getElementById('termo-file');
    const termoName = document.getElementById('termo-name');
    if (termoInput) {
        termoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                if (validarArquivo(termoInput, editUserId)) { 
                    termoName.textContent = e.target.files[0].name;
                    termoName.style.color = '#333';
                } else {
                    termoName.textContent = 'Nenhum arq...';
                    termoName.style.color = '#aaa';
                }
            } else {
                termoName.textContent = 'Nenhum arq...';
                termoName.style.color = '#aaa';
            }
        });
    }
}

// FUNÇÃO INICIAL
// ----------------------------------------------------------------------
function initUsuarioForm() {
    const editUserId = sessionStorage.getItem('editUserId');
    const form = document.getElementById('form-cadastrar-usuario');

    if (form) {
        setupFormSubmit(form, editUserId); 
        setupFormExtras(editUserId); 
        
        if (editUserId) {
            loadUserDataForEdit(editUserId);
        } else {
            // Se for cadastro, garante que o campo senha esteja visível
            const groupSenha = document.getElementById('group-senha');
            if (groupSenha) groupSenha.style.display = 'block';
        }
    } else {
        console.error('O formulário de cadastro não foi encontrado no DOM.');
    }
}

// Inicializa a função
// ----------------------------------------------------------------------
setTimeout(initUsuarioForm, 0);