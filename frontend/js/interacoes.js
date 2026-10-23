const cadastros = [
  { id: 'form-configuracoes', view: 'configuracoes', titulo: 'Dados da Loja', botao: 'Editar dados da loja', preservarFormulario: true },
  { id: 'form-cliente', view: 'clientes', titulo: 'Novo Cliente', botao: 'Novo Cliente' },
  { id: 'form-funcionario', view: 'funcionarios', titulo: 'Novo Funcionário', botao: 'Novo Funcionário' },
  { id: 'form-produto', view: 'produtos', titulo: 'Novo Produto / Serviço', botao: 'Novo Produto ou Serviço' },
  { id: 'form-ordem', view: 'ordens', titulo: 'Nova Ordem de Serviço', botao: 'Nova Ordem de Serviço' },
  { id: 'form-orcamento', view: 'orcamentos', titulo: 'Novo Orçamento', botao: 'Novo Orçamento' },
  { id: 'form-venda', view: 'vendas', titulo: 'Nova Venda', botao: 'Registrar Venda' },
  { id: 'form-estoque', view: 'estoque', titulo: 'Movimentar Estoque', botao: 'Movimentar Estoque' },
  { id: 'form-caixa', view: 'caixa', titulo: 'Movimentar Caixa', botao: 'Nova movimentação' },
  { id: 'form-financeiro', view: 'financeiro', titulo: 'Novo Lançamento Manual', botao: 'Novo lançamento' },
  { id: 'form-despesa-fixa', view: 'despesasFixas', titulo: 'Nova Despesa Fixa', botao: 'Nova Despesa Fixa' }
];

let modalSequencia = 1000;

function fecharModalTopo() {
  const ativos = Array.from(document.querySelectorAll('.modal-overlay.active'));
  const topo = ativos.reduce((atual, modal) => {
    if (!atual) return modal;
    return Number(modal.style.zIndex) > Number(atual.style.zIndex) ? modal : atual;
  }, null);
  if (!topo) return;
  topo.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('modal-aberto');
}

function abrirFormularioCadastro(id, titulo = null) {
  const modal = document.querySelector(`[data-form-modal="${id}"]`);
  if (!modal) return;
  const cadastro = cadastros.find(item => item.id === id);
  const title = modal.querySelector('.cadastro-modal-heading h2');
  if (title) title.textContent = titulo || cadastro?.titulo || 'Cadastro';
  modal.style.zIndex = String(++modalSequencia);
  modal.classList.add('active');
  document.body.classList.add('modal-aberto');
  const primeiroCampo = modal.querySelector('input:not([type="hidden"]), select, textarea');
  if (primeiroCampo) primeiroCampo.focus({ preventScroll: true });
}

function fecharFormularioCadastro(modal) {
  const overlay = typeof modal === 'string'
    ? document.querySelector(`[data-form-modal="${modal}"]`)
    : modal;
  if (!overlay) return;
  overlay.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('modal-aberto');
}

function prepararNovoCadastro(form) {
  form.dataset.keepModalOpen = 'true';
  const cancelButton = form.querySelector('[id^="cancel-"]');
  if (cancelButton && getComputedStyle(cancelButton).display !== 'none') cancelButton.click();
  else form.reset();
  delete form.dataset.keepModalOpen;

  if (form.id === 'form-cliente') {
    document.getElementById('cliente-id').value = '';
    document.getElementById('titulo-form-cliente').textContent = 'Novo Cliente';
    document.getElementById('cancel-cliente').style.display = 'none';
  }
  if (form.id === 'form-funcionario') {
    delete form.dataset.editandoId;
    form.querySelector('button[type="submit"]').textContent = 'Salvar';
  }
  if (form.id === 'form-produto') {
    document.getElementById('produto-id').value = '';
    document.getElementById('cancel-produto').style.display = 'none';
  }
  if (form.id === 'form-ordem') {
    document.getElementById('pagamentos-os-section').style.display = 'none';
    document.getElementById('os-mao-de-obra-lista').innerHTML = '';
    document.getElementById('os-produtos-lista').innerHTML = '';
    document.getElementById('os-mo-subtotal').textContent = 'R$ 0,00';
    document.getElementById('os-produtos-subtotal').textContent = 'R$ 0,00';
    document.getElementById('ordem-valor').value = '';
    if (typeof produtosOS !== 'undefined') produtosOS = [];
    if (typeof maoDeObraOS !== 'undefined') maoDeObraOS = [];
  }
  if (form.id === 'form-venda' && typeof itensVenda !== 'undefined') {
    itensVenda = [];
    if (typeof renderItensVenda === 'function') renderItensVenda();
  }
}

function configurarModaisCadastro() {
  cadastros.forEach(cadastro => {
    const form = document.getElementById(cadastro.id);
    const view = document.getElementById(`view-${cadastro.view}`);
    if (!form || !view) return;

    const formBox = form.closest('.form-box');
    if (!formBox) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay cadastro-modal';
    modal.dataset.formModal = cadastro.id;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', cadastro.titulo);

    const modalBox = document.createElement('div');
    modalBox.className = 'modal-box cadastro-modal-box';
    const heading = document.createElement('div');
    heading.className = 'cadastro-modal-heading';
    const title = document.createElement('h2');
    title.textContent = cadastro.titulo;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'cadastro-modal-close';
    closeButton.setAttribute('aria-label', 'Fechar cadastro');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => fecharFormularioCadastro(modal));
    heading.append(title, closeButton);
    modalBox.appendChild(heading);
    modalBox.appendChild(formBox);

    if (cadastro.id === 'form-ordem') {
      const pagamentos = document.getElementById('pagamentos-os-section');
      if (pagamentos) modalBox.appendChild(pagamentos);
    }

    modal.appendChild(modalBox);
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target === modal) fecharFormularioCadastro(modal);
    });

    form.addEventListener('reset', () => {
      if (form.dataset.keepModalOpen === 'true') return;
      queueMicrotask(() => fecharFormularioCadastro(modal));
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'cadastro-toolbar';
    const description = document.createElement('p');
    description.textContent = `Consulte os registros ou abra a tela para ${cadastro.botao.toLowerCase()}.`;
    const createButton = document.createElement('button');
    createButton.type = 'button';
    createButton.className = 'btn-cadastro';
    createButton.textContent = `＋ ${cadastro.botao}`;
    createButton.addEventListener('click', () => {
      if (!cadastro.preservarFormulario) prepararNovoCadastro(form);
      abrirFormularioCadastro(cadastro.id);
    });
    toolbar.append(description, createButton);
    view.insertBefore(toolbar, view.firstChild);
  });

}

function nomeModelo(tipo) {
  return tipo === 'os' ? 'Ordem de Serviço' : 'Garantia';
}

function previewArquivosImagem(input, containerId) {
  const preview = document.getElementById(containerId);
  if (!preview) return;
  preview.querySelectorAll('.arquivo-preview').forEach(image => image.remove());
  Array.from(input.files || []).forEach(file => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    const image = document.createElement('img');
    image.className = 'arquivo-preview';
    image.alt = file.name;
    image.src = URL.createObjectURL(file);
    image.addEventListener('load', () => URL.revokeObjectURL(image.src), { once: true });
    preview.appendChild(image);
  });
}

async function carregarMidias(tipo, id, containerId, permitirExcluir = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const midias = await apiGet(`/midias/entidade/${tipo}/${id}`);
  container.replaceChildren();
  midias.forEach(midia => {
    const image = document.createElement('img');
    image.src = `/api/midias/${midia.id}/arquivo`;
    image.alt = `Imagem do registro ${id}`;
    image.loading = 'lazy';
    if (permitirExcluir) {
      const wrapper = document.createElement('div');
      wrapper.className = 'imagem-preview-item';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'imagem-remover';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Excluir imagem');
      remove.addEventListener('click', async () => {
        if (!confirm('Remover esta imagem?')) return;
        try {
          await apiDelete(`/midias/${midia.id}`);
          await carregarMidias(tipo, id, containerId, permitirExcluir);
        } catch (err) {
          alert('Não foi possível excluir a imagem: ' + err.message);
        }
      });
      wrapper.append(image, remove);
      container.appendChild(wrapper);
    } else {
      const link = document.createElement('a');
      link.href = image.src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(image);
      container.appendChild(link);
    }
  });
  return midias;
}

function validarArquivosImagem(files) {
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Use imagens JPG, PNG ou WebP.');
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('Cada imagem deve ter no máximo 5 MB.');
  }
}

async function carregarModelosDocumentos() {
  const lista = document.getElementById('lista-modelos-documentos');
  if (!lista) return;

  try {
    const modelos = await apiGet('/configuracoes/modelos');
    lista.replaceChildren();
    if (modelos.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'modelos-vazio';
      vazio.textContent = 'Nenhum PDF enviado ainda.';
      lista.appendChild(vazio);
      return;
    }

    modelos.forEach(modelo => {
      const item = document.createElement('article');
      item.className = 'modelo-documento-item';
      const detalhe = document.createElement('div');
      const tipo = document.createElement('strong');
      tipo.textContent = `Modelo de ${nomeModelo(modelo.tipo)}`;
      const nome = document.createElement('span');
      nome.textContent = modelo.nome_original;
      const data = document.createElement('small');
      data.textContent = modelo.criado_em ? new Date(modelo.criado_em).toLocaleDateString('pt-BR') : '';
      detalhe.append(tipo, nome, data);

      const acoes = document.createElement('div');
      acoes.className = 'modelo-documento-acoes';
      const download = document.createElement('a');
      download.href = `/api/configuracoes/modelos/${modelo.id}/arquivo`;
      download.textContent = 'Baixar';
      download.className = 'modelo-download';
      download.setAttribute('download', modelo.nome_original);
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.textContent = 'Excluir';
      remover.addEventListener('click', async () => {
        if (!confirm(`Excluir o arquivo "${modelo.nome_original}"?`)) return;
        try {
          await apiDelete(`/configuracoes/modelos/${modelo.id}`);
          await carregarModelosDocumentos();
        } catch (err) {
          alert('Erro ao excluir modelo: ' + err.message);
        }
      });
      acoes.append(download, remover);
      item.append(detalhe, acoes);
      lista.appendChild(item);
    });
  } catch (err) {
    lista.textContent = 'Não foi possível carregar os modelos: ' + err.message;
    console.error('Erro ao carregar modelos de documentos:', err);
  }
}

function configurarUploadModelos() {
  document.querySelectorAll('.form-upload-modelo').forEach(form => {
    const input = form.querySelector('input[type="file"]');
    const nome = form.querySelector('.upload-arquivo-selecionado');

    input.addEventListener('change', () => {
      nome.textContent = input.files[0]?.name || 'Nenhum arquivo selecionado';
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const arquivo = input.files[0];
      if (!arquivo) return;
      if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
        alert('Selecione um arquivo PDF.');
        return;
      }
      if (arquivo.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5 MB.');
        return;
      }

      const botao = form.querySelector('button[type="submit"]');
      botao.disabled = true;
      try {
        const resposta = await fetch(`/api/configuracoes/modelos/${form.dataset.modelo}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'X-File-Name': encodeURIComponent(arquivo.name)
          },
          body: arquivo
        });
        if (!resposta.ok) {
          const erro = await resposta.json().catch(() => ({}));
          throw new Error(erro.error || 'Não foi possível enviar o PDF.');
        }
        form.reset();
        nome.textContent = 'Nenhum arquivo selecionado';
        await carregarModelosDocumentos();
      } catch (err) {
        alert('Erro ao enviar modelo: ' + err.message);
      } finally {
        botao.disabled = false;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay.active').forEach(modal => {
    modal.style.zIndex = String(++modalSequencia);
  });
  const modalObserver = new MutationObserver(records => {
    records.forEach(record => {
      const modal = record.target;
      if (modal.classList.contains('active')) modal.style.zIndex = String(++modalSequencia);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') fecharModalTopo();
  });
  configurarModaisCadastro();
  configurarUploadModelos();
  carregarModelosDocumentos();
});
