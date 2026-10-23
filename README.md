# TechGest — gestão para assistência técnica

Aplicação web para ordens de serviço, clientes, produtos, vendas, estoque, caixa e financeiro. O backend Express serve a interface e usa SQLite em desenvolvimento; no Render, o Blueprint configura PostgreSQL e autenticação SaaS com dados isolados por empresa.

## Executar localmente

```bash
cd backend
npm install
npm start
```

Abra `http://localhost:3000`. Sem `DATABASE_URL`, o backend usa SQLite em `backend/database.db` (ou no caminho indicado por `DATABASE_PATH`). Essa modalidade local não exige login nem oferece isolamento SaaS.

## Render e PostgreSQL

O [render.yaml](./render.yaml) configura o serviço web, PostgreSQL gerenciado e um disco persistente para PDFs e imagens. O serviço precisa de um plano PostgreSQL compatível com o Blueprint. Configure o Blueprint no Render e confirme seus custos/plano antes de provisionar os recursos.

As variáveis `JWT_SECRET` e `PLATFORM_ADMIN_TOKEN` são geradas pelo Blueprint. Mantenha-as privadas. `JWT_SECRET` precisa ter no mínimo 32 caracteres. As sessões usam cookies HttpOnly, SameSite=Lax e expiram em oito horas.

O Blueprint define `PGSSLMODE=require`: a conexão com o PostgreSQL continua criptografada, mas não valida a cadeia do certificado, necessário quando o provedor apresenta um certificado autoassinado. A aplicação aplica esse modo explicitamente e remove `sslmode` da `DATABASE_URL` para evitar que o parâmetro sobrescreva a configuração do pool. Se o banco oferecer uma CA confiável, use `PGSSLMODE=verify-full` para habilitar validação rigorosa do certificado. Não use `NODE_TLS_REJECT_UNAUTHORIZED=0`, pois isso desativa a validação TLS globalmente para todo o processo Node.js.

O banco começa vazio. Nenhum registro do SQLite local será importado automaticamente. Cada empresa recebe um schema próprio; as rotas de negócio usam o schema vinculado ao usuário autenticado. O PostgreSQL e a pasta `/var/data/uploads` precisam de backups periódicos.

## Provisionar uma empresa

O cadastro de empresas é controlado: não há formulário público de abertura de conta. Uma pessoa administradora deve chamar o endpoint abaixo por uma estação segura, usando o segredo `PLATFORM_ADMIN_TOKEN` guardado no painel do Render:

```bash
curl --request POST "https://<URL-DO-SERVIÇO>/api/platform/tenants" \
  --header "Content-Type: application/json" \
  --header "X-Platform-Admin-Token: <SEGREDO-DO-RENDER>" \
  --data '{"nome":"Assistência Exemplo","ownerName":"Responsável","email":"responsavel@exemplo.com"}'
```

A resposta apresenta uma senha inicial uma única vez. Entregue-a ao responsável por um canal seguro; no primeiro login, ele é obrigado a definir uma senha pessoal de pelo menos 12 caracteres. Depois disso, o responsável pode criar acessos de colaboradores na tela aberta pela engrenagem. Colaboradores têm acesso operacional; não podem gerenciar usuários, alterar cadastros da equipe, consultar módulos financeiros ou modificar configurações da empresa.

### Redefinir o acesso do responsável

Uma pessoa administradora pode redefinir o e-mail e a senha temporária do responsável usando o `PLATFORM_ADMIN_TOKEN`. O `tenantId` é retornado ao criar a empresa; se não estiver disponível, consulte `SELECT id, nome FROM public.tenants;` no PostgreSQL do Render. Execute a chamada em um terminal confiável e não compartilhe o token nem a resposta da senha:

```bash
curl --request POST "https://<URL-DO-SERVIÇO>/api/platform/tenants/<TENANT_ID>/reset-owner-access" \
  --header "Content-Type: application/json" \
  --header "X-Platform-Admin-Token: <SEGREDO-DO-RENDER>" \
  --data '{"email":"novo-acesso@exemplo.com"}'
```

A resposta contém uma senha temporária exibida uma única vez. Entregue-a ao responsável por canal seguro. O próximo login exige que ele defina uma senha nova de pelo menos 12 caracteres. Esse procedimento não altera nem expõe a senha anterior.

Nunca inclua `PLATFORM_ADMIN_TOKEN`, senhas iniciais ou `JWT_SECRET` no código-fonte, no navegador ou em mensagens públicas. Se o segredo de provisionamento for exposto, troque-o imediatamente no Render.

## Ordens, estoque e arquivos

Vendas e peças registradas em uma OS movimentam o estoque automaticamente; cancelamentos e exclusões devolvem unidades. O sistema impede saldo negativo. A OS mantém uma linha do tempo auditável de criação e mudanças de status, associada ao usuário autenticado quando disponível. Produtos e ordens aceitam até cinco imagens PNG, JPEG ou WebP, com até 5 MB por arquivo. PDFs de referência de OS e garantia também têm limite de 5 MB e não alteram os documentos gerados automaticamente.

## Escopo ainda não integrado

O sistema não inclui atualmente provedor de WhatsApp, emissão de NFS-e/NFC-e, cobrança recorrente, assinatura de planos nem fluxo de aprovação de OS pelo cliente. Esses recursos dependem de escolha de provedor, credenciais e regras de negócio e devem ser implementados antes de serem anunciados como funcionalidades disponíveis.

## Testes

```bash
npm test --prefix backend
```

Os testes de integração usam banco SQLite temporário. Para uma implantação, também valide conexão, provisionamento e isolamento em um PostgreSQL de staging antes de encaminhar dados reais.
