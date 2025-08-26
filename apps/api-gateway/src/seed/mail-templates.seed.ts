import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class MailTemplatesSeed implements OnModuleInit {
  private readonly logger = new Logger(MailTemplatesSeed.name);
  private readonly templates = [
    {
      id: 'cmermeeqi0000v52guhh6d1wg',
      type: 'VALIDATION_CODE',
      subject: 'Código de verificação',
      pre_header: 'Seu código de verificação chegou!',
      html: '<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width,initial-scale=1" />\n    <meta http-equiv="x-ua-compatible" content="ie=edge" />\n    <title>Marquei</title>\n    <style>\n      html,\n      body {\n        margin: 0 !important;\n        padding: 0 !important;\n        width: 100% !important;\n        height: 100% !important;\n      }\n      * {\n        -ms-text-size-adjust: 100%;\n        -webkit-text-size-adjust: 100%;\n      }\n      table,\n      td {\n        mso-table-lspace: 0pt !important;\n        mso-table-rspace: 0pt !important;\n        border-collapse: collapse !important;\n      }\n      img {\n        border: 0;\n        outline: none;\n        text-decoration: none;\n        display: block;\n        -ms-interpolation-mode: bicubic;\n      }\n      a {\n        text-decoration: none;\n      }\n\n      @media screen and (max-width: 600px) {\n        .container {\n          width: 100% !important;\n        }\n        .px {\n          padding-left: 20px !important;\n          padding-right: 20px !important;\n        }\n        .py {\n          padding-top: 20px !important;\n          padding-bottom: 20px !important;\n        }\n        .logo {\n          width: 160px !important;\n          height: auto !important;\n        }\n        .code-box {\n          font-size: 22px !important;\n          letter-spacing: 6px !important;\n        }\n      }\n\n      /* Dark mode: manter card e header claros */\n      @media (prefers-color-scheme: dark) {\n        body,\n        .body-bg {\n          background: #0f1115 !important;\n        }\n        .card {\n          background: #ffffff !important;\n        }\n        .header {\n          background: #ffffff !important;\n        }\n        .title,\n        .text {\n          color: #111827 !important;\n        }\n        .muted {\n          color: #6b7280 !important;\n        }\n        .divider {\n          border-top-color: #e6e8f0 !important;\n        }\n      }\n    </style>\n  </head>\n  <body class="body-bg" style="background: #f3f5ff; margin: 0; padding: 0">\n    <!-- Preheader invisível -->\n    <div\n      style="\n        display: none !important;\n        visibility: hidden;\n        opacity: 0;\n        overflow: hidden;\n        height: 0;\n        width: 0;\n        max-height: 0;\n        max-width: 0;\n        color: #fff;\n      "\n    >\n      {PREHEADER}\n    </div>\n\n    <!-- Wrapper -->\n    <table\n      role="presentation"\n      width="100%"\n      cellpadding="0"\n      cellspacing="0"\n      border="0"\n      style="background: #f3f5ff"\n    >\n      <tr>\n        <td align="center" style="padding: 28px 16px">\n          <!-- Card -->\n          <table\n            role="presentation"\n            width="600"\n            class="container card"\n            cellpadding="0"\n            cellspacing="0"\n            border="0"\n            style="\n              width: 600px;\n              max-width: 600px;\n              background: #ffffff;\n              border-radius: 16px;\n              overflow: hidden;\n            "\n          >\n            <!-- Header claro -->\n            <tr>\n              <td\n                class="header"\n                style="background: #ffffff; padding: 24px 24px 20px 24px"\n              >\n                <table role="presentation" width="100%">\n                  <tr>\n                    <td align="center">\n                      <img\n                        src="https://innovatecode.online/marquei/logos/primary.png"\n                        width="200"\n                        alt="Marquei"\n                        class="logo"\n                        style="height: auto; max-width: 200px"\n                      />\n                    </td>\n                  </tr>\n                  <tr>\n                    <td style="padding-top: 16px">\n                      <table role="presentation" width="100%">\n                        <tr>\n                          <td\n                            style="\n                              border-top: 1px solid #4647fa;\n                              height: 4px;\n                              line-height: 4px;\n                              font-size: 0;\n                            "\n                          >\n                            &nbsp;\n                          </td>\n                        </tr>\n                      </table>\n                    </td>\n                  </tr>\n                </table>\n              </td>\n            </tr>\n\n            <!-- Conteúdo -->\n            <tr>\n              <td style="padding: 0px 28px">\n                <h1\n                  class="title"\n                  style="\n                    margin: 0 0 8px 0;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 22px;\n                    line-height: 1.3;\n                    color: #111827;\n                  "\n                >\n                  Código de verificação\n                </h1>\n                <p\n                  class="text"\n                  style="\n                    margin: 0 0 18px 0;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 15px;\n                    line-height: 1.7;\n                    color: #334155;\n                  "\n                >\n                  Use o código abaixo para confirmar seu e-mail com segurança.\n                </p>\n\n                <!-- Código -->\n                <table\n                  role="presentation"\n                  align="center"\n                  cellpadding="0"\n                  cellspacing="0"\n                  border="0"\n                  style="margin: 12px auto 8px auto"\n                >\n                  <tr>\n                    <td\n                      class="code-box"\n                      style="\n                        font-family:\n                          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,\n                          \'Liberation Mono\', monospace;\n                        font-size: 26px;\n                        letter-spacing: 10px;\n                        font-weight: 700;\n                        color: #111827;\n                        background: #f7f8ff;\n                        border-radius: 12px;\n                        padding: 14px 22px;\n                        text-align: center;\n                      "\n                    >\n                      {CODE}\n                    </td>\n                  </tr>\n                </table>\n\n                <p\n                  class="muted"\n                  style="\n                    margin: 6px 0 0 0;\n                    text-align: center;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 12px;\n                    color: #6b7280;\n                  "\n                >\n                  Expira em 5 minutos.\n                </p>\n\n                <!-- Divider -->\n                <table\n                  role="presentation"\n                  width="100%"\n                  cellpadding="0"\n                  cellspacing="0"\n                  border="0"\n                  style="margin: 24px 0"\n                >\n                  <tr>\n                    <td\n                      class="divider"\n                      style="\n                        border-top: 1px solid #e6e8f0;\n                        height: 1px;\n                        line-height: 1px;\n                        font-size: 0;\n                      "\n                    >\n                      &nbsp;\n                    </td>\n                  </tr>\n                </table>\n\n                <!-- Ajuda -->\n                <p\n                  class="muted"\n                  style="\n                    margin: 0;\n                    text-align: center;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 12px;\n                    line-height: 1.7;\n                    color: #6b7280;\n                  "\n                >\n                  Não reconhece esta solicitação?<br />Ignore este e-mail ou\n                  fale com o suporte.\n                </p>\n              </td>\n            </tr>\n\n            <!-- Rodapé -->\n            <tr>\n              <td align="center" style="background: #ffffff; padding: 22px">\n                <p\n                  style="\n                    margin: 0;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 12px;\n                    line-height: 1.6;\n                    color: #6b7280;\n                  "\n                >\n                  © 2025 Marquei • Todos os direitos reservados\n                </p>\n              </td>\n            </tr>\n          </table>\n        </td>\n      </tr>\n    </table>\n  </body>\n</html>\n',
      active: true,
      description: 'Envio do código de verificação',
      from: 'Marquei <marquei@innovatecode.online>',
    },
    {
      id: 'cmerofja40000v52akbkjztuy',
      type: 'WELCOME_PROFESSIONAL',
      subject: 'Bem-vindo(a) ao Marquei',
      pre_header: 'Sua jornada com o Marquei começa agora! 🎉',
      html: '<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width,initial-scale=1" />\n    <meta http-equiv="x-ua-compatible" content="ie=edge" />\n    <title>Bem-vindo(a) ao Marquei</title>\n    <style>\n      html,\n      body {\n        margin: 0 !important;\n        padding: 0 !important;\n        width: 100% !important;\n        height: 100% !important;\n      }\n      * {\n        -ms-text-size-adjust: 100%;\n        -webkit-text-size-adjust: 100%;\n      }\n      table,\n      td {\n        mso-table-lspace: 0pt !important;\n        mso-table-rspace: 0pt !important;\n        border-collapse: collapse !important;\n      }\n      img {\n        border: 0;\n        outline: none;\n        text-decoration: none;\n        display: block;\n        -ms-interpolation-mode: bicubic;\n      }\n      a {\n        text-decoration: none;\n      }\n\n      @media screen and (max-width: 600px) {\n        .container {\n          width: 100% !important;\n        }\n        .px {\n          padding-left: 20px !important;\n          padding-right: 20px !important;\n        }\n        .py {\n          padding-top: 20px !important;\n          padding-bottom: 20px !important;\n        }\n        .logo {\n          width: 160px !important;\n          height: auto !important;\n        }\n      }\n\n      /* Dark mode: manter card e header claros */\n      @media (prefers-color-scheme: dark) {\n        body,\n        .body-bg {\n          background: #0f1115 !important;\n        }\n        .card {\n          background: #ffffff !important;\n        }\n        .header {\n          background: #ffffff !important;\n        }\n        .title,\n        .text {\n          color: #111827 !important;\n        }\n        .muted {\n          color: #6b7280 !important;\n        }\n        .divider {\n          border-top-color: #e6e8f0 !important;\n        }\n      }\n    </style>\n  </head>\n  <body class="body-bg" style="background: #f3f5ff; margin: 0; padding: 0">\n    <!-- Preheader invisível -->\n    <div\n      style="\n        display: none !important;\n        visibility: hidden;\n        opacity: 0;\n        overflow: hidden;\n        height: 0;\n        width: 0;\n        max-height: 0;\n        max-width: 0;\n        color: #fff;\n      "\n    >\n      {PREHEADER}\n    </div>\n\n    <!-- Wrapper -->\n    <table\n      role="presentation"\n      width="100%"\n      cellpadding="0"\n      cellspacing="0"\n      border="0"\n      style="background: #f3f5ff"\n    >\n      <tr>\n        <td align="center" style="padding: 28px 16px">\n          <!-- Card -->\n          <table\n            role="presentation"\n            width="600"\n            class="container card"\n            cellpadding="0"\n            cellspacing="0"\n            border="0"\n            style="\n              width: 600px;\n              max-width: 600px;\n              background: #ffffff;\n              border-radius: 16px;\n              overflow: hidden;\n            "\n          >\n            <!-- Header claro -->\n            <tr>\n              <td\n                class="header"\n                style="background: #ffffff; padding: 24px 24px 20px 24px"\n              >\n                <table role="presentation" width="100%">\n                  <tr>\n                    <td align="center">\n                      <img\n                        src="https://innovatecode.online/marquei/logos/primary.png"\n                        width="200"\n                        alt="Marquei"\n                        class="logo"\n                        style="height: auto; max-width: 200px"\n                      />\n                    </td>\n                  </tr>\n                  <tr>\n                    <td style="padding-top: 16px">\n                      <table role="presentation" width="100%">\n                        <tr>\n                          <td style="border-top: 1px solid #4647fa">&nbsp;</td>\n                        </tr>\n                      </table>\n                    </td>\n                  </tr>\n                </table>\n              </td>\n            </tr>\n\n            <!-- Conteúdo -->\n            <tr>\n              <td class="px py" style="padding: 0 28px">\n                <h1\n                  class="title"\n                  style="\n                    margin: 0 0 24px 0;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 24px;\n                    font-weight: 700;\n                    color: #111827;\n                  "\n                >\n                  Bem-vindo(a) ao Marquei, {NAME}!\n                </h1>\n                <p class="text" style="margin: 0; text-align: center">\n                  Estamos muito felizes em ter você com a gente\n                  <img\n                    src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f389.png"\n                    alt="🎉"\n                    width="18"\n                    height="18"\n                    style="\n                      display: inline-block;\n                      vertical-align: -3px;\n                      line-height: 0;\n                      border: 0;\n                      outline: none;\n                      text-decoration: none;\n                    "\n                  />\n                  <br />\n                  A partir de agora, você tem acesso a uma plataforma que\n                  simplifica o agendamento e ajuda seu negócio a crescer.\n                </p>\n\n                <table\n                  role="presentation"\n                  align="center"\n                  cellpadding="0"\n                  cellspacing="0"\n                  border="0"\n                  style="margin: 8px auto 0 auto"\n                >\n                  <tr>\n                    <td align="center" style="padding: 0">\n                      <img\n                        style="width: 40%"\n                        src="https://innovatecode.online/general/welcome.png"\n                      />\n                    </td>\n                  </tr>\n                </table>\n\n                <p class="text" style="margin: 16px 0 0 0; text-align: center">\n                  Comece explorando seu painel, conecte seus serviços e\n                  personalize sua página de agendamentos. Qualquer dúvida,\n                  estamos por aqui para ajudar.\n                </p>\n\n                <!-- Divider -->\n                <table\n                  role="presentation"\n                  width="100%"\n                  cellpadding="0"\n                  cellspacing="0"\n                  border="0"\n                  style="margin: 32px 0 24px 0"\n                >\n                  <tr>\n                    <td\n                      class="divider"\n                      style="\n                        border-top: 1px solid #e6e8f0;\n                        height: 1px;\n                        line-height: 1px;\n                        font-size: 0;\n                      "\n                    >\n                      &nbsp;\n                    </td>\n                  </tr>\n                </table>\n\n                <!-- Ajuda -->\n                <p\n                  class="muted"\n                  style="\n                    margin: 0;\n                    text-align: center;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 12px;\n                    line-height: 1.7;\n                    color: #6b7280;\n                  "\n                >\n                  Precisa de ajuda? Responda este e-mail\n                </p>\n              </td>\n            </tr>\n\n            <!-- Rodapé -->\n            <tr>\n              <td align="center" style="background: #ffffff; padding: 22px">\n                <p\n                  style="\n                    margin: 0;\n                    font-family:\n                      -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto,\n                      Arial, \'Helvetica Neue\', sans-serif;\n                    font-size: 12px;\n                    line-height: 1.6;\n                    color: #6b7280;\n                  "\n                >\n                  © 2025 Marquei • Todos os direitos reservados\n                </p>\n              </td>\n            </tr>\n          </table>\n        </td>\n      </tr>\n    </table>\n  </body>\n</html>\n',
      active: true,
      description: 'Envio de boas-vindas ao Marquei',
      from: 'Marquei <marquei@innovatecode.online>',
    },
    {
      type: 'WELCOME_CUSTOMER',
      subject: 'Bem-vindo(a) ao Marquei',
      pre_header: 'Sua jornada com o Marquei começa agora! 🎉',
      html: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>Bem-vindo(a) ao Marquei</title>
    <style>
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
      * {
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
      }
      table,
      td {
        mso-table-lspace: 0pt !important;
        mso-table-rspace: 0pt !important;
        border-collapse: collapse !important;
      }
      img {
        border: 0;
        outline: none;
        text-decoration: none;
        display: block;
        -ms-interpolation-mode: bicubic;
      }
      a {
        text-decoration: none;
      }

      @media screen and (max-width: 600px) {
        .container {
          width: 100% !important;
        }
        .px {
          padding-left: 20px !important;
          padding-right: 20px !important;
        }
        .py {
          padding-top: 20px !important;
          padding-bottom: 20px !important;
        }
        .logo {
          width: 160px !important;
          height: auto !important;
        }
      }

      @media (prefers-color-scheme: dark) {
        body,
        .body-bg {
          background: #0f1115 !important;
        }
        .card {
          background: #ffffff !important;
        }
        .header {
          background: #ffffff !important;
        }
        .title,
        .text {
          color: #111827 !important;
        }
        .muted {
          color: #6b7280 !important;
        }
        .divider {
          border-top-color: #e6e8f0 !important;
        }
      }
    </style>
  </head>
  <body class="body-bg" style="background: #f3f5ff; margin: 0; padding: 0">
    <!-- Preheader invisível -->
    <div
      style="
        display: none;
        visibility: hidden;
        opacity: 0;
        overflow: hidden;
        height: 0;
        width: 0;
        max-height: 0;
        max-width: 0;
        color: #fff;
      "
    >
      Sua jornada com o Marquei está começando!
    </div>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background: #f3f5ff"
    >
      <tr>
        <td align="center" style="padding: 28px 16px">
          <table
            role="presentation"
            width="600"
            class="container card"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width: 600px;
              max-width: 600px;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
            "
          >
            <!-- Header -->
            <tr>
              <td
                class="header"
                style="background: #ffffff; padding: 24px 24px 8px 24px"
              >
                <table role="presentation" width="100%">
                  <tr>
                    <td align="center">
                      <img
                        src="https://innovatecode.online/marquei/logos/primary.png"
                        width="200"
                        alt="Marquei"
                        class="logo"
                        style="height: auto; max-width: 200px"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 16px">
                      <table role="presentation" width="100%">
                        <tr>
                          <td style="border-top: 1px solid #4647fa">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Conteúdo -->
            <tr>
              <td class="px py" style="padding: 0 28px">
                <h1
                  class="title"
                  style="
                    margin: 0 0 24px 0;
                    font-family:
                      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                      Arial, 'Helvetica Neue', sans-serif;
                    font-size: 24px;
                    font-weight: 700;
                    color: #111827;
                  "
                >
                  Bem-vindo(a), {NAME}!
                  <img
                    src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f389.png"
                    alt="🎉"
                    width="18"
                    height="18"
                    style="
                      display: inline-block;
                      vertical-align: -3px;
                      line-height: 0;
                      border: 0;
                      outline: none;
                      text-decoration: none;
                    "
                  />
                </h1>
                <p
                  class="text"
                  style="
                    margin: 0;
                    text-align: center;
                    font-size: 15px;
                    line-height: 1.6;
                    color: #334155;
                  "
                >
                  Agora você pode agendar seus serviços favoritos de forma
                  <b>simples, rápida e segura</b>.
                </p>
                <br />
                <p
                  class="text"
                  style="
                    margin: 0;
                    text-align: center;
                    font-size: 15px;
                    line-height: 1.6;
                    color: #334155;
                  "
                >
                  Encontre profissionais de confiança, escolha o melhor horário
                  e confirme tudo em poucos cliques.
                </p>

                <table
                  role="presentation"
                  align="center"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="margin: 24px auto 0 auto"
                >
                  <tr>
                    <td align="center" style="padding: 0">
                      <img
                        style="width: 60%; max-width: 300px"
                        src="https://innovatecode.online/general/welcome.png"
                        alt="Bem-vindo ao Marquei"
                      />
                    </td>
                  </tr>
                </table>

                <p
                  class="text"
                  style="
                    margin: 16px 0 0 0;
                    text-align: center;
                    font-size: 15px;
                    line-height: 1.6;
                    color: #334155;
                  "
                >
                  Aproveite sua nova experiência e mantenha seus compromissos
                  sempre organizados. Estamos aqui para tornar seu dia a dia
                  mais fácil.
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="margin: 32px 0 24px 0"
                >
                  <tr>
                    <td
                      class="divider"
                      style="
                        border-top: 1px solid #e6e8f0;
                        height: 1px;
                        line-height: 1px;
                        font-size: 0;
                      "
                    >
                      &nbsp;
                    </td>
                  </tr>
                </table>

                <p
                  class="muted"
                  style="
                    margin: 0;
                    text-align: center;
                    font-family:
                      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                      Arial, 'Helvetica Neue', sans-serif;
                    font-size: 12px;
                    line-height: 1.7;
                    color: #6b7280;
                  "
                >
                  Dúvidas? Responda este e-mail que nossa equipe vai te ajudar.
                </p>
              </td>
            </tr>

            <!-- Rodapé -->
            <tr>
              <td align="center" style="background: #ffffff; padding: 22px">
                <p
                  style="
                    margin: 0;
                    font-family:
                      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                      Arial, 'Helvetica Neue', sans-serif;
                    font-size: 12px;
                    line-height: 1.6;
                    color: #6b7280;
                  "
                >
                  © 2025 Marquei • Todos os direitos reservados
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
      active: true,
      description: 'Envio de boas-vindas ao Marquei',
      from: 'Marquei <marquei@innovatecode.online>',
    },
  ];

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // await this.run();
  }

  async run() {
    await this.prismaService.mailTemplate.deleteMany();
    await this.prismaService.mailTemplate.createMany({
      data: this.templates,
    });

    this.logger.debug('Mail templates seed executed');
  }
}
