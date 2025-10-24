export class BuildNewProfessionalMessage {
  static forWhatsapp(props: {
    name: string;
    business_name: string;
    username: string;
    password: string;
    ios_link: string;
    android_link: string;
  }) {
    const message = [
      '*Marquei Agendamentos*',
      '_Bem-vindo(a) à nossa plataforma de agendamentos!_',
      '',
      `Olá, ${props.name}! 👋`,
      '',
      `O estabelecimento *${props.business_name}* o(a) registrou como colaborador(a) em nosso sistema.`,
      '',
      'Essas são suas credenciais para acessar sua conta:',
      `• *Usuário*: ${props.username}`,
      `• *Senha temporária*: ${props.password}`,
      '',
      '🔒 *Por segurança*, recomendamos alterar sua senha após o primeiro acesso.',
      '',
      'Se ainda não possui nosso aplicativo instalado, utilize um dos links abaixo:',
      `• *iOS*: ${props.ios_link}`,
      `• *Android*: ${props.android_link}`,
      '',
      '_Agradecemos por fazer parte do time!_',
    ].join('\n');

    return message;
  }

  static forEmail() {
    // ...
  }
}
