const privacy = [
  ['Sobre o Radar ACS', 'O Radar ACS é uma plataforma de informação e notícias organizada em edições, disponível pelo site, pelo aplicativo web instalável (PWA) e pela Skill na Alexa. Esta política explica o tratamento de informações no funcionamento atual do serviço.'],
  ['Acesso público e administração', 'Leitores não precisam criar conta nem fazer login para acessar as notícias. O login existente é exclusivo da administração e configuração do serviço. A autenticação administrativa é realizada pelo Firebase Authentication; as configurações e os dados administrativos têm acesso restrito.'],
  ['Uso pela Alexa', 'A Skill utiliza a infraestrutura da Amazon para receber solicitações de voz e apresentar o briefing. O Radar ACS não solicita acesso ao perfil pessoal da conta Amazon nem exige vinculação de conta para ouvir as notícias. O tratamento de voz e os recursos do dispositivo também seguem as políticas e configurações da Amazon.'],
  ['Armazenamento no navegador', 'O navegador pode guardar preferências locais de aparência utilizadas pelo PWA. Na área administrativa, o Firebase mantém a sessão autenticada durante a sessão do navegador. As métricas de audiência próprias são opcionais: somente após aceitar, um identificador aleatório é guardado localmente para deduplicar visitas e reprodução de áudio interno. Você pode recusar ou desativar em “Métricas de uso”, sem perder acesso ao portal. Não usamos fingerprint, nome, email ou localização precisa nessas métricas e não vendemos dados pessoais. Identificadores de navegador não representam pessoas únicas. O servidor guarda hashes restritos à administração e agregados em uma janela de até 32 dias; contagens apresentadas consideram os últimos 30 dias. Sessões de áudio expiram em dois minutos sem confirmação. Não contamos Spotify externo, rádio externa ou página aberta sem áudio. Métricas servem à contagem de visitas, melhoria do serviço e audiência de conteúdo. Logs técnicos normais da infraestrutura podem existir independentemente das métricas opcionais.'],
  ['Registros técnicos e segurança', 'A infraestrutura pode produzir registros técnicos necessários à operação, ao diagnóstico de erros e à segurança, como horário, resultado de solicitações e características técnicas de execução. O serviço utiliza conexões HTTPS e controles de acesso para a administração. Nenhuma medida de segurança elimina todos os riscos; credenciais administrativas devem ser mantidas em sigilo.'],
  ['Fontes e serviços externos', 'As notícias incluem links para fontes externas. Ao abrir esses links, você passa a utilizar serviços com políticas próprias. Imagens externas, quando exibidas, também podem ser carregadas de servidores de terceiros. A operação utiliza serviços de infraestrutura do Google/Firebase e, na Alexa, da Amazon. A geração editorial pode utilizar a OpenAI; não envolve o envio de um histórico de navegação dos leitores.'],
  ['Publicidade e patrocínio', 'Espaços publicitários e patrocínios são identificados separadamente do conteúdo editorial. Links de anunciantes levam a serviços externos, cujas políticas devem ser consultadas. O sistema atual não implementa rastreamento de impressões ou cliques publicitários.'],
  ['Alterações desta política', 'Esta política pode ser atualizada quando o funcionamento do Radar ACS mudar. A versão vigente estará disponível nesta página, com a data de sua última atualização.']
];

const terms = [
  ['Finalidade e acesso', 'O Radar ACS oferece resumos informativos de notícias e assuntos de interesse, organizados em edições. O acesso ao conteúdo é público pelo site, pelo PWA e pela Alexa, sem necessidade de conta de leitor. A área autenticada é destinada exclusivamente à administração do serviço.'],
  ['Conteúdo e fontes', 'As edições são produzidas a partir de informações de fontes externas e apresentam links para as fontes originais quando aplicável. Resumos podem não reproduzir todos os detalhes de uma publicação. Consulte a fonte original e os canais oficiais antes de tomar decisões que dependam dessas informações. O Radar ACS não substitui fontes oficiais.'],
  ['Atualizações e disponibilidade', 'Notícias podem receber atualizações, correções ou novos desdobramentos depois da publicação de uma edição. A data da edição indica seu contexto editorial. O serviço pode ficar temporariamente indisponível por manutenção, falhas técnicas ou dependência de fornecedores; não há garantia de funcionamento ininterrupto.'],
  ['Uso adequado', 'Utilize o serviço de forma lícita e respeitosa. Não tente acessar áreas administrativas sem autorização, obter credenciais, prejudicar a infraestrutura ou apresentar conteúdo do Radar ACS de forma enganosa. Ao compartilhar uma notícia, preserve seu contexto e a identificação da fonte.'],
  ['Identidade e conteúdo de terceiros', 'A identidade visual, o nome Radar ACS e os elementos de marca ACS utilizados no serviço pertencem aos seus respectivos titulares. Seu uso não concede autorização para se apresentar como representante do Radar ACS ou da ACS. Notícias, marcas e materiais de fontes externas permanecem vinculados aos direitos de seus respectivos titulares.'],
  ['Publicidade e independência editorial', 'Publicidade e patrocínios devem ser claramente identificados e separados das notícias. A presença de um anunciante não implica recomendação de seus produtos ou serviços. Patrocinadores não determinam automaticamente a seleção editorial. Condições de ofertas e serviços externos são de responsabilidade de seus fornecedores.'],
  ['Privacidade', 'O tratamento de informações relacionado ao serviço está descrito na Política de Privacidade, disponível publicamente neste site. Serviços externos acessados por links seguem suas próprias políticas e condições.'],
  ['Alterações destes termos', 'Estes termos podem ser atualizados para refletir mudanças no serviço. A versão vigente ficará disponível nesta página, com a data da última atualização.']
];

export function Legal({ type }) {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Política de Privacidade' : 'Termos de Uso';
  return <article className="legal-page">
    <header className="page-heading">
      <p className="eyebrow">INFORMAÇÕES DO SERVIÇO</p>
      <h1>{title} — Radar ACS</h1>
      <p className="legal-updated">Última atualização: <time dateTime={isPrivacy ? '2026-10-06' : '2026-10-04'}>{isPrivacy ? '6 de outubro de 2026' : '4 de outubro de 2026'}</time>.</p>
    </header>
    <div className="legal-content">{(isPrivacy ? privacy : terms).map(([heading, text]) =>
      <section key={heading}><h2>{heading}</h2><p>{text}</p>{isPrivacy && heading === 'Fontes e serviços externos' && <p>Na área Ouvir, playlists podem incorporar o player oficial do Spotify. Ao carregar esse conteúdo, o navegador se conecta diretamente ao Spotify, que pode utilizar cookies ou tecnologias semelhantes conforme suas próprias políticas. O Radar não recebe suas credenciais Spotify e não retransmite esse áudio. Consulte a <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">Política de Privacidade do Spotify</a>.</p>}</section>
    )}</div>
  </article>;
}
