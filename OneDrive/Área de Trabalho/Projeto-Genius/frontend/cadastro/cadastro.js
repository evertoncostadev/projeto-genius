// frontend/cadastro/cadastro.js

let currentStep = 1;
const totalSteps = 4;

function updateProgressBar() {
    for (let i = 1; i <= totalSteps; i++) {
        const seg = document.getElementById(`prog-${i}`);
        if (i <= currentStep) {
            seg.classList.add('active');
        } else {
            seg.classList.remove('active');
        }
    }
}

function showStep(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    updateProgressBar();
    
    // Rola a página para o topo suavemente ao trocar de tela
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearErrors(step) {
    const stepEl = document.getElementById(`step-${step}`);
    if(!stepEl) return;
    
    stepEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    stepEl.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

function showError(inputId, msg) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;
    
    if(inputEl.type !== 'checkbox' && inputEl.type !== 'file') {
        inputEl.classList.add('input-error');
    }
    
    let container = inputEl.closest('.input-group') || inputEl.closest('.foto-instrucoes') || inputEl.closest('.checkbox-group');
    if (!container) container = inputEl.parentNode;

    let errorSpan = container.querySelector('.field-error-msg');
    if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'field-error-msg';
        container.appendChild(errorSpan);
    }
    errorSpan.innerText = msg;
}

async function verificarDuplicidade(campo, valor) {
    try {
        const body = {};
        body[campo] = valor;
        const res = await fetch('http://localhost:3000/api/verificar-duplicidade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.status === 409) return true; 
        return false; 
    } catch (e) {
        return false; 
    }
}

async function nextStep(step) {
    clearErrors(step);
    let isValid = true;
    
    const btnNext = document.querySelector(`#step-${step} .btn-wizard-next`);

    // --- VALIDAÇÕES DO PASSO 1 ---
    if (step === 1) {
        if (document.getElementById('foto').files.length === 0) {
            showError('foto', 'A foto de perfil é obrigatória.');
            isValid = false;
        }
        if (!document.getElementById('nome').value.trim()) {
            showError('nome', 'O Nome Completo é obrigatório.');
            isValid = false;
        }
        
        const cpfVal = document.getElementById('cpf').value;
        const cpfLimpo = cpfVal.replace(/\D/g, '');
        if (!cpfVal) {
            showError('cpf', 'O CPF é obrigatório.');
            isValid = false;
        } else if (!validarCPF(cpfVal)) {
            showError('cpf', 'CPF inválido.');
            isValid = false;
        }

        if (!document.getElementById('data_nascimento').value) {
            showError('data_nascimento', 'A Data de Nascimento é obrigatória.');
            isValid = false;
        }
        
        const sexo = document.getElementById('sexo').value;
        if (!sexo) {
            showError('sexo', 'Selecione o seu Sexo.');
            isValid = false;
        } else if (sexo === 'outro' && !document.getElementById('sexo_especifico').value.trim()) {
            showError('sexo_especifico', 'Por favor, especifique.');
            isValid = false;
        }

        const senha = document.getElementById('senha').value;
        const confirmaSenha = document.getElementById('confirma_senha').value;
        if (!senha || senha.length < 6) {
            showError('senha', 'A senha deve ter no mínimo 6 caracteres.');
            isValid = false;
        } else if (senha !== confirmaSenha) {
            showError('confirma_senha', 'As senhas não coincidem.');
            isValid = false;
        }

        if (isValid) {
            btnNext.innerHTML = 'VERIFICANDO...';
            btnNext.disabled = true;
            const cpfEmUso = await verificarDuplicidade('cpf', cpfLimpo);
            btnNext.innerHTML = 'PRÓXIMO PASSO';
            btnNext.disabled = false;

            if (cpfEmUso) {
                showError('cpf', 'Este CPF já está cadastrado no sistema.');
                return; 
            }
        }
    }

    // --- VALIDAÇÕES DO PASSO 2 ---
    if (step === 2) {
        const email = document.getElementById('email').value.trim();
        if (!email) {
            showError('email', 'O E-mail é obrigatório.');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('email', 'Formato de E-mail inválido.');
            isValid = false;
        }

        const telefone = document.getElementById('telefone').value.replace(/\D/g, '');
        if (!telefone || telefone.length < 10) {
            showError('telefone', 'WhatsApp inválido ou incompleto.');
            isValid = false;
        }

        const cep = document.getElementById('cep').value.replace(/\D/g, '');
        if (!cep || cep.length !== 8) {
            showError('cep', 'CEP inválido ou incompleto.');
            isValid = false;
        }

        const camposEndereco = ['rua', 'numero_end', 'bairro', 'cidade', 'uf'];
        camposEndereco.forEach(campo => {
            if (!document.getElementById(campo).value.trim()) {
                showError(campo, 'Este campo é obrigatório.');
                isValid = false;
            }
        });

        if (isValid && email) {
            btnNext.innerHTML = 'VERIFICANDO...';
            btnNext.disabled = true;
            const emailEmUso = await verificarDuplicidade('email', email);
            btnNext.innerHTML = 'PRÓXIMO PASSO';
            btnNext.disabled = false;

            if (emailEmUso) {
                showError('email', 'Este E-mail já está em uso por outro aluno.');
                return; 
            }
        }
    }

    // --- VALIDAÇÕES DO PASSO 3 ---
    if (step === 3) {
        const matricula = document.getElementById('matricula').value.trim();
        if (!matricula) {
            showError('matricula', 'A Matrícula é obrigatória.');
            isValid = false;
        }

        const camposAcademico = ['curso', 'periodo', 'turno'];
        camposAcademico.forEach(campo => {
            if (!document.getElementById(campo).value) {
                showError(campo, 'Este campo é obrigatório.');
                isValid = false;
            }
        });

        if (document.getElementById('termo').files.length === 0) {
            showError('termo', 'Anexe o Termo ou Assine Digitalmente.');
            isValid = false;
        }

        if (isValid && matricula) {
            btnNext.innerHTML = 'VERIFICANDO...';
            btnNext.disabled = true;
            const matriculaEmUso = await verificarDuplicidade('matricula', matricula);
            btnNext.innerHTML = 'PRÓXIMO PASSO';
            btnNext.disabled = false;

            if (matriculaEmUso) {
                showError('matricula', 'Esta Matrícula já está cadastrada.');
                return;
            }
        }
    }

    if (!isValid) return;

    if (step < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep(step) {
    if (step > 1) {
        clearErrors(step);
        currentStep--;
        showStep(currentStep);
    }
}

// ==========================================
// FUNÇÕES UTILITÁRIAS E MÁSCARAS
// ==========================================
function showCustomAlert(title, message, type = 'error') {
    const oldModal = document.getElementById('custom-alert-modal');
    if (oldModal) oldModal.remove();

    let iconClass = type === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle'; 
    let btnClass = type === 'success' ? 'success-btn' : 'error-btn'; 

    const modalHTML = `
        <div class="custom-modal-content">
            <i class="custom-modal-icon ${type} ${iconClass}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="custom-modal-btn ${btnClass}" id="custom-modal-close-btn">OK, Entendi</button>
        </div>
    `;
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'custom-modal-backdrop';
    modalBackdrop.id = 'custom-alert-modal';
    modalBackdrop.innerHTML = modalHTML;
    document.body.appendChild(modalBackdrop);

    document.getElementById('custom-modal-close-btn').addEventListener('click', () => {
        modalBackdrop.classList.remove('visible');
        setTimeout(() => modalBackdrop.remove(), 300); 
    });
    setTimeout(() => modalBackdrop.classList.add('visible'), 10);
}

document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('data_nascimento');
    const hoje = new Date();
    const anoMaximo = hoje.getFullYear() - 18;
    let mes = String(hoje.getMonth() + 1).padStart(2, '0');
    let dia = String(hoje.getDate()).padStart(2, '0');
    dataInput.setAttribute('max', `${anoMaximo}-${mes}-${dia}`);
});

document.getElementById('nome').addEventListener('input', function() { this.value = this.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''); });
document.getElementById('matricula').addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });

document.getElementById('cpf').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
});

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if(cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.substring(10, 11));
}

document.getElementById('telefone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0,2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0,10)}-${value.slice(10)}`;
    e.target.value = value;
});

document.getElementById('cep').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
});

document.getElementById('cep').addEventListener('blur', async function() {
    const cepNum = this.value.replace(/\D/g, '');
    if (cepNum.length === 8) {
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
            const data = await res.json();
            if (!data.erro) {
                document.getElementById('rua').value = data.logradouro;
                document.getElementById('bairro').value = data.bairro;
                document.getElementById('cidade').value = data.localidade;
                document.getElementById('uf').value = data.uf.toUpperCase();
                document.getElementById('numero_end').focus();
                clearErrors(2); 
            } else {
                showError('cep', 'CEP não encontrado.');
            }
        } catch (error) { console.error(error); }
    }
});

// === FOTO, SEXO E ASSINATURA ===
const inputFoto = document.getElementById('foto');
const fotoPreview = document.getElementById('foto-preview');

inputFoto.addEventListener('change', function() {
    const file = this.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
        showError('foto', 'A foto deve ter no máximo 5MB.');
        this.value = ''; 
        fotoPreview.innerHTML = '<i class="fas fa-camera"></i>';
        return;
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = e => fotoPreview.innerHTML = `<img src="${e.target.result}">`;
        reader.readAsDataURL(file);
        
        const errorSpan = this.parentNode.querySelector('.field-error-msg');
        if(errorSpan) errorSpan.remove();
    }
});

function validarDocumento(event) {
    const file = event.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
        showError('termo', 'O documento não pode ultrapassar 5MB.');
        event.target.value = ''; 
    } else {
        const errorSpan = event.target.parentNode.querySelector('.field-error-msg');
        if(errorSpan) errorSpan.remove();
    }
}
document.getElementById('termo').addEventListener('change', validarDocumento);

const selectSexo = document.getElementById('sexo');
const inputSexoEspecifico = document.getElementById('sexo_especifico');
selectSexo.addEventListener('change', function() {
    if (this.value === 'outro') {
        inputSexoEspecifico.style.display = 'block';
    } else {
        inputSexoEspecifico.style.display = 'none';
        inputSexoEspecifico.value = '';
    }
});

const btnAbrirDigital = document.getElementById('btn-abrir-termo-digital');
const modalAssinatura = document.getElementById('modal-assinatura');
const canvas = document.getElementById('canvas-assinatura');
const ctx = canvas.getContext('2d');
let desenhando = false;

ctx.strokeStyle = '#000000';
ctx.lineWidth = 3;
ctx.lineCap = 'round';

function iniciarDesenho(e) { desenhando = true; desenhar(e); }
function pararDesenho() { desenhando = false; ctx.beginPath(); }
function desenhar(e) {
    if (!desenhando) return;
    e.preventDefault(); 
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

document.getElementById('btn-limpar-canvas').addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
canvas.addEventListener('mousedown', iniciarDesenho);
canvas.addEventListener('mouseup', pararDesenho);
canvas.addEventListener('mousemove', desenhar);
canvas.addEventListener('touchstart', iniciarDesenho, {passive: false});
canvas.addEventListener('touchend', pararDesenho);
canvas.addEventListener('touchmove', desenhar, {passive: false});

btnAbrirDigital.addEventListener('click', () => {
    document.getElementById('t-nome').textContent = document.getElementById('nome').value;
    document.getElementById('t-cpf').textContent = document.getElementById('cpf').value;
    document.getElementById('t-end').textContent = document.getElementById('rua').value + ', ' + document.getElementById('numero_end').value + ' - ' + document.getElementById('cidade').value;
    
    const cursoSelect = document.getElementById('curso');
    document.getElementById('t-curso').textContent = cursoSelect.options[cursoSelect.selectedIndex]?.text || '';
    document.getElementById('t-mat').textContent = document.getElementById('matricula').value;
    document.getElementById('t-data').textContent = new Date().toLocaleDateString('pt-BR');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('img-assinatura-final').style.display = 'none';
    modalAssinatura.style.display = 'flex';
});

document.getElementById('btn-fechar-assinatura').addEventListener('click', () => { modalAssinatura.style.display = 'none'; });

document.getElementById('btn-salvar-pdf').addEventListener('click', async () => {
    const btnSalvarPdf = document.getElementById('btn-salvar-pdf');
    btnSalvarPdf.innerHTML = 'Gerando...';
    btnSalvarPdf.disabled = true;

    const imgData = canvas.toDataURL("image/png");
    const imgElement = document.getElementById('img-assinatura-final');
    imgElement.src = imgData;
    imgElement.style.display = 'block'; 

    const documentoHTML = document.getElementById('documento-para-pdf');

    html2pdf().set({
        margin: [15, 15, 15, 15],
        filename: 'Termo_Responsabilidade.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(documentoHTML).output('blob').then(function(blob) {
        const file = new File([blob], `Termo_${document.getElementById('nome').value.split(' ')[0]}.pdf`, { type: "application/pdf" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('termo').files = dataTransfer.files;

        document.getElementById('termo-status-hint').innerHTML = '<span style="color:#10b981; font-weight:bold;">Termo anexado!</span>';
        
        const errorSpan = document.getElementById('termo').parentNode.querySelector('.field-error-msg');
        if(errorSpan) errorSpan.remove();

        modalAssinatura.style.display = 'none';
        btnSalvarPdf.innerHTML = 'Aplicar e Salvar PDF';
        btnSalvarPdf.disabled = false;
    });
});

// ==========================================
// ENVIO FINAL DO FORMULÁRIO (PASSO 4)
// ==========================================
const formCadastro = document.getElementById('form-cadastro-publico');
const btnSubmit = document.getElementById('btn-enviar-cadastro');
const modalSucesso = document.getElementById('modal-sucesso');
const btnFecharSucesso = document.getElementById('btn-fechar-sucesso');

formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(4);

    if (!document.getElementById('aceite_lgpd').checked) {
        showError('aceite_lgpd', 'Você deve aceitar o Termo de Consentimento para finalizar.');
        return;
    }

    let valorSexo = selectSexo.value === 'outro' ? inputSexoEspecifico.value.trim() : selectSexo.value;

    const formData = new FormData();
    formData.append('nome', document.getElementById('nome').value);
    formData.append('cpf', document.getElementById('cpf').value.replace(/\D/g, ''));
    formData.append('data_nascimento', document.getElementById('data_nascimento').value);
    formData.append('sexo', valorSexo);
    formData.append('email', document.getElementById('email').value);
    formData.append('telefone', document.getElementById('telefone').value.replace(/\D/g, ''));
    formData.append('cep', document.getElementById('cep').value);
    formData.append('rua', document.getElementById('rua').value);
    formData.append('numero_end', document.getElementById('numero_end').value);
    formData.append('complemento', document.getElementById('complemento').value);
    formData.append('bairro', document.getElementById('bairro').value);
    formData.append('cidade', document.getElementById('cidade').value);
    formData.append('uf', document.getElementById('uf').value);
    formData.append('matricula', document.getElementById('matricula').value);
    formData.append('curso', document.getElementById('curso').value);
    formData.append('periodo', document.getElementById('periodo').value);
    formData.append('turno', document.getElementById('turno').value);
    formData.append('senha', document.getElementById('senha').value);
    
    formData.append('foto', document.getElementById('foto').files[0]);
    formData.append('termo', document.getElementById('termo').files[0]);

    btnSubmit.innerHTML = 'Enviando...';
    btnSubmit.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/cadastro-publico', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            modalSucesso.style.display = 'flex';
        } else {
            showCustomAlert('Erro no Envio', data.message || 'Falha ao enviar.', 'error');
        }
    } catch (error) {
        showCustomAlert('Falha na Rede', 'Servidor offline ou sem conexão.', 'error');
    } finally {
        btnSubmit.innerHTML = 'CONCLUIR CADASTRO';
        btnSubmit.disabled = false;
    }
});

btnFecharSucesso.addEventListener('click', () => {
    modalSucesso.style.display = 'none';
    window.location.href = '../portal/portal.html'; 
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
    }
});