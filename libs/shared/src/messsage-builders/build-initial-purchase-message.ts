import { getFirstName } from '../utils';

export class BuildInitialPurchaseMessage {
  static forWhatsapp(props: { name: string; business_name: string }) {
    const message = [
      '*Marquei Agendamentos*',
      '_Obrigado por apoiar o Marquei!_',
      '',
      `Olá, ${getFirstName(props.name)}! 👋`,
      '',
      `Seu plano do estabelecimento *${props.business_name}* foi ativado com sucesso.`,
      '',
      'Seja bem-vindo(a)! Estamos muito felizes em ter você com a gente. 💜',
      '',
      'Se precisar de qualquer ajuda, é só responder por aqui. 😊',
    ].join('\n');

    return message;
  }
}
