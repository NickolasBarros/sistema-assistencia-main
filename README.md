# TechGest — sistema para assistência técnica

Aplicação web para gestão de clientes, ordens de serviço, produtos, vendas, estoque, caixa e financeiro. O backend Express também serve o frontend estático; os dados ficam em SQLite.

## Executar localmente

```bash
cd backend
npm install
npm start
```

Abra `http://localhost:3000`. O banco local é criado em `backend/database.db` por padrão. Para escolher outro arquivo, defina `DATABASE_PATH`.

## Publicar no Render

O repositório inclui [render.yaml](./render.yaml), configurado para:

- Executar o serviço Node.js a partir de `backend/`.
- Usar `PORT` fornecida pelo Render.
- Armazenar o SQLite em `/var/data/database.db`.
- Montar um disco persistente de 1 GB em `/var/data`.
- Proteger a interface e a API com autenticação HTTP Basic.
- Expor `/health` para a verificação de saúde do serviço.

1. Envie o repositório para o GitHub.
2. No Render, crie um **Blueprint** e selecione este repositório.
3. Confirme a criação do serviço e do disco persistente definidos no Blueprint.
4. Após o deploy, abra a URL do serviço. Use o usuário `admin` e a senha gerada para `APP_PASSWORD` nas variáveis de ambiente do serviço. Você pode substituir essa senha no painel do Render.
5. Confira `https://<URL-DO-SERVIÇO>/health`; a resposta esperada é `{"status":"ok"}`.

O disco persistente requer um plano do Render compatível e mantém o SQLite entre reinicializações e novos deploys. Como SQLite não é apropriado para múltiplas instâncias simultâneas, mantenha apenas uma instância do serviço.

### Dados existentes

O disco do Render começa vazio: o `backend/database.db` do computador não é enviado automaticamente. Faça uma cópia de segurança e transfira o banco para `/var/data/database.db` antes de usar o sistema com dados reais. Não publique o arquivo do banco no GitHub. Faça cópias de segurança periódicas do disco.

### Acesso e segurança

O Render cria um segredo inicial para `APP_PASSWORD`; a autenticação usa o usuário fixo `admin` e esse segredo compartilhado. Isso evita deixar a aplicação aberta publicamente, mas **não** substitui usuários individuais, permissões por funcionário ou autenticação completa. Antes de usar com vários colaboradores ou dados sensíveis em produção, implemente esses controles.

Em produção, o servidor não inicia se `APP_PASSWORD` não estiver configurada. Localmente, a autenticação é opcional; para ativá-la, defina `APP_PASSWORD` antes de iniciar o backend.