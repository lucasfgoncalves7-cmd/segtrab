# Missão — Riscos nas ferramentas manuais (versão on-line)

## O que esta versão oferece

- `index.html`: acesso dos alunos por celular/Internet móvel, sem instalar aplicativo.
- `instrutor.html`: painel on-line atualizado quando cada aluno salva contribuições.
- Três ferramentas: martelo, chave de fenda e alicate universal.
- Uma turma com código próprio, até 30 registros por ferramenta por participante.
- Nome curto ou equipe, remoção dos próprios registros enquanto a coleta estiver aberta.
- Encerrar/reabrir coleta e liberar/ocultar exemplos pelo painel do instrutor.
- Totais por ferramenta, por participante, exportação CSV para Excel.

A hospedagem é realizada no GitHub Pages e o armazenamento on-line no Firebase Cloud Firestore. **GitHub Pages sozinho não recebe contribuições em tempo real.**

## Instalação inicial (aproximadamente uma configuração, não precisa Wi-Fi na aula)

### 1. Crie o Firebase

1. Entre em https://console.firebase.google.com/ e crie um projeto.
2. Adicione um aplicativo **Web** no projeto (ícone `</>`).
3. Copie as propriedades `apiKey`, `authDomain`, `projectId` e `appId` do objeto `firebaseConfig` para **`firebase-config.js`**. São identificadores públicos. Não use uma chave privada de conta de serviço.
4. Ative **Authentication → Sign-in method → Anonymous** (alunos) e **Email/Password** (instrutor).
5. Em **Authentication → Users**, cadastre o instrutor com e-mail e senha. **Não compartilhe essa senha**, nem a coloque em arquivo ou repositório.
6. Em **Firestore Database**, crie o banco na região escolhida e selecione a modalidade Standard. **Não deixe o banco em regras abertas de teste**.
7. Abra a guia **Rules** do Firestore; copie o conteúdo de `firestore.rules`, substituindo `INSTRUTOR@EXEMPLO.COM` pelo e-mail exato da conta do instrutor criada no passo 5. Publique as regras.
8. Em **Authentication → Settings → Authorized domains**, acrescente `SEU_USUARIO.github.io`, se necessário, para o domínio utilizado na publicação.

### 2. Publique no GitHub Pages

1. Crie um repositório no GitHub (por exemplo `missao-ferramentas`) — para uma conta Free, use um repositório público.
2. Envie **os arquivos da pasta** para a raiz do repositório: `index.html`, `instrutor.html`, `estilos.css`, `aluno.js`, `instrutor.js`, `firebase.js`, `firebase-config.js`, `sugestoes.js`, `firestore.rules` e a pasta `assets/`.
3. Em **Settings → Pages → Build and deployment**, selecione **Deploy from a branch**, branch `main`, pasta `/(root)` e salve.
4. Aguarde a publicação indicada pelo próprio GitHub. O endereço será semelhante a:
   `https://SEU_USUARIO.github.io/missao-ferramentas/`
5. Abra o painel em `https://SEU_USUARIO.github.io/missao-ferramentas/instrutor.html`.
6. Entre com a conta do instrutor cadastrada no Firebase e clique **Criar nova turma**.
7. Copie o link de aluno gerado no painel e envie à turma por WhatsApp, e-mail ou outro canal permitido. **Cada aluno pode usar os dados móveis do próprio celular**.

### 3. Conduza a atividade

1. Os alunos abrem o link e digitam um nome curto ou identificação de equipe.
2. Selecionam uma ferramenta e enviam suas ideias. O painel reflete as alterações automaticamente.
3. O instrutor encerra a coleta e, em seguida, libera as sugestões para comparação.
4. Exporte o CSV antes de descartar os registros.
5. Para uma nova turma, clique **Criar nova turma** (gera código independente e preserva os registros anteriores).

## Privacidade e segurança

- Respostas da turma ficam no **Cloud Firestore** do projeto Firebase configurado, não no GitHub.
- Senha de instrutor e chave privada de conta de serviço **não devem ser incluídas nos arquivos**. `apiKey` do Firebase Web é uma identificação pública do projeto; o controle real depende das regras e da autenticação.
- Os alunos usam login técnico anônimo do Firebase; veem a própria ficha e o estado da turma, mas não conseguem ler a coleção de todas as respostas.
- Quem tem o código da turma consegue ingressar como participante. Não divulgue o código fora da turma.
- Não peça CPF, nome completo, matrícula, dados empresariais sigilosos ou outras informações pessoais/sensíveis.
- Como se trata de uma aplicação pública para dinâmica educacional, a autenticação anônima permite envio de conteúdo arbitrário por quem obtiver o código. Monitore os limites de uso do Firebase; para publicação amplamente aberta, considere App Check/moderação e mecanismos adicionais.
- O banco de sugestões é código didático público e pode ser inspecionado no repositório mesmo antes de ser mostrado na interface. **Não utilize o exercício como prova sigilosa**.
- O Firestore tem cotas gratuitas limitadas. Consulte sempre https://firebase.google.com/pricing/ e o painel do projeto.
- Se a TI corporativa bloquear Firebase/GitHub ou se os alunos não tiverem acesso à internet móvel, isso deverá ser resolvido antes do treinamento.

## Limites e testes

- O pacote foi preparado para implantação. Antes de preencher as credenciais e publicar, não é possível verificar uma sessão real na nuvem.
- Faça um ensaio com **um instrutor e dois celulares em redes diferentes** antes de utilizar com uma turma completa.
- Uma inscrição anônima pode ser diferente entre navegadores ou após limpeza de dados. Se o aluno trocar de navegador, terá outra ficha.
- A atividade registra ideias espontâneas; quantidade não representa avaliação automática da qualidade técnica nem substitui PGR/APR.

## Referências técnicas e de implantação

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Firebase Web: https://firebase.google.com/docs/web/setup
- Firestore listeners: https://firebase.google.com/docs/firestore/query-data/listen
- Firebase Authentication: https://firebase.google.com/docs/auth/web/anonymous-auth
- Regras de segurança Firestore: https://firebase.google.com/docs/firestore/security/get-started
- OSHA — Hand and Power Tools: https://www.osha.gov/hand-power-tools
- CCOHS — General hand tool operation: https://www.ccohs.ca/oshanswers/safety_haz/hand_tools/general.html
