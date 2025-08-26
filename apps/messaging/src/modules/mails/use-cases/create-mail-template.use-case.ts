import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateMailTemplateDto } from '../dto/create-mail-template.dto';

@Injectable()
export class CreateMailTemplateUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreateMailTemplateUseCase.name);
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    //     await this.execute({
    //       description: 'Envio de boas-vindas ao cliente',
    //       subject: 'Bem-vindo(a) ao Marquei',
    //       pre_header: 'Sua jornada com o Marquei começa agora! 🎉',
    //       type: SendMailTypeEnum.WELCOME_CUSTOMER,
    //       from: MailsOptionsFromEnum.MARQUEI_GENERAL,
    //       html: `
    // <html lang="pt-BR">
    //   <head>
    //     <meta charset="utf-8" />
    //     <meta name="viewport" content="width=device-width,initial-scale=1" />
    //     <meta http-equiv="x-ua-compatible" content="ie=edge" />
    //     <title>Bem-vindo(a) ao Marquei</title>
    //     <style>
    //       html,
    //       body {
    //         margin: 0 !important;
    //         padding: 0 !important;
    //         width: 100% !important;
    //         height: 100% !important;
    //       }
    //       * {
    //         -ms-text-size-adjust: 100%;
    //         -webkit-text-size-adjust: 100%;
    //       }
    //       table,
    //       td {
    //         mso-table-lspace: 0pt !important;
    //         mso-table-rspace: 0pt !important;
    //         border-collapse: collapse !important;
    //       }
    //       img {
    //         border: 0;
    //         outline: none;
    //         text-decoration: none;
    //         display: block;
    //         -ms-interpolation-mode: bicubic;
    //       }
    //       a {
    //         text-decoration: none;
    //       }
    //       @media screen and (max-width: 600px) {
    //         .container {
    //           width: 100% !important;
    //         }
    //         .px {
    //           padding-left: 20px !important;
    //           padding-right: 20px !important;
    //         }
    //         .py {
    //           padding-top: 20px !important;
    //           padding-bottom: 20px !important;
    //         }
    //         .logo {
    //           width: 160px !important;
    //           height: auto !important;
    //         }
    //       }
    //       @media (prefers-color-scheme: dark) {
    //         body,
    //         .body-bg {
    //           background: #0f1115 !important;
    //         }
    //         .card {
    //           background: #ffffff !important;
    //         }
    //         .header {
    //           background: #ffffff !important;
    //         }
    //         .title,
    //         .text {
    //           color: #111827 !important;
    //         }
    //         .muted {
    //           color: #6b7280 !important;
    //         }
    //         .divider {
    //           border-top-color: #e6e8f0 !important;
    //         }
    //       }
    //     </style>
    //   </head>
    //   <body class="body-bg" style="background: #f3f5ff; margin: 0; padding: 0">
    //     <!-- Preheader invisível -->
    //     <div
    //       style="
    //         display: none;
    //         visibility: hidden;
    //         opacity: 0;
    //         overflow: hidden;
    //         height: 0;
    //         width: 0;
    //         max-height: 0;
    //         max-width: 0;
    //         color: #fff;
    //       "
    //     >
    //       {PREHEADER}
    //     </div>
    //     <table
    //       role="presentation"
    //       width="100%"
    //       cellpadding="0"
    //       cellspacing="0"
    //       border="0"
    //       style="background: #f3f5ff"
    //     >
    //       <tr>
    //         <td align="center" style="padding: 28px 16px">
    //           <table
    //             role="presentation"
    //             width="600"
    //             class="container card"
    //             cellpadding="0"
    //             cellspacing="0"
    //             border="0"
    //             style="
    //               width: 600px;
    //               max-width: 600px;
    //               background: #ffffff;
    //               border-radius: 16px;
    //               overflow: hidden;
    //             "
    //           >
    //             <!-- Header -->
    //             <tr>
    //               <td
    //                 class="header"
    //                 style="background: #ffffff; padding: 24px 24px 20px 24px"
    //               >
    //                 <table role="presentation" width="100%">
    //                   <tr>
    //                     <td align="center">
    //                       <img
    //                         src="https://innovatecode.online/marquei/logos/primary.png"
    //                         width="200"
    //                         alt="Marquei"
    //                         class="logo"
    //                         style="height: auto; max-width: 200px"
    //                       />
    //                     </td>
    //                   </tr>
    //                   <tr>
    //                     <td style="padding-top: 16px">
    //                       <table role="presentation" width="100%">
    //                         <tr>
    //                           <td style="border-top: 1px solid #4647fa">&nbsp;</td>
    //                         </tr>
    //                       </table>
    //                     </td>
    //                   </tr>
    //                 </table>
    //               </td>
    //             </tr>
    //             <!-- Conteúdo -->
    //             <tr>
    //               <td class="px py" style="padding: 0 28px">
    //                 <h1
    //                   class="title"
    //                   style="
    //                     margin: 0 0 24px 0;
    //                     font-family:
    //                       -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    //                       Arial, 'Helvetica Neue', sans-serif;
    //                     font-size: 24px;
    //                     font-weight: 700;
    //                     color: #111827;
    //                   "
    //                 >
    //                   Bem-vindo(a), {NAME}!
    //                   <img
    //                     src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f389.png"
    //                     alt="🎉"
    //                     width="18"
    //                     height="18"
    //                     style="
    //                       display: inline-block;
    //                       vertical-align: -3px;
    //                       line-height: 0;
    //                       border: 0;
    //                       outline: none;
    //                       text-decoration: none;
    //                     "
    //                   />
    //                 </h1>
    //                 <p
    //                   class="text"
    //                   style="
    //                     margin: 0;
    //                     text-align: center;
    //                     font-size: 15px;
    //                     line-height: 1.6;
    //                     color: #334155;
    //                   "
    //                 >
    //                   Agora você pode
    //                   <b
    //                     >agendar seus serviços favoritos de forma simples, rápida e
    //                     segura</b
    //                   >.
    //                 </p>
    //                 <br />
    //                 <p
    //                   class="text"
    //                   style="
    //                     margin: 0;
    //                     text-align: center;
    //                     font-size: 15px;
    //                     line-height: 1.6;
    //                     color: #334155;
    //                   "
    //                 >
    //                   Encontre profissionais de confiança, escolha o melhor horário
    //                   e confirme tudo em poucos cliques.
    //                 </p>
    //                 <table
    //                   role="presentation"
    //                   align="center"
    //                   cellpadding="0"
    //                   cellspacing="0"
    //                   border="0"
    //                   style="margin: 24px auto 0 auto"
    //                 >
    //                   <tr>
    //                     <td align="center" style="padding: 0">
    //                       <img
    //                         style="width: 60%; max-width: 300px"
    //                         src="https://innovatecode.online/general/welcome.png"
    //                         alt="Bem-vindo ao Marquei"
    //                       />
    //                     </td>
    //                   </tr>
    //                 </table>
    //                 <p
    //                   class="text"
    //                   style="
    //                     margin: 16px 0 0 0;
    //                     text-align: center;
    //                     font-size: 15px;
    //                     line-height: 1.6;
    //                     color: #334155;
    //                   "
    //                 >
    //                   Aproveite sua nova experiência e mantenha seus compromissos
    //                   sempre organizados. Estamos aqui para tornar seu dia a dia
    //                   mais fácil.
    //                 </p>
    //                 <table
    //                   role="presentation"
    //                   width="100%"
    //                   cellpadding="0"
    //                   cellspacing="0"
    //                   border="0"
    //                   style="margin: 32px 0 24px 0"
    //                 >
    //                   <tr>
    //                     <td
    //                       class="divider"
    //                       style="
    //                         border-top: 1px solid #e6e8f0;
    //                         height: 1px;
    //                         line-height: 1px;
    //                         font-size: 0;
    //                       "
    //                     >
    //                       &nbsp;
    //                     </td>
    //                   </tr>
    //                 </table>
    //                 <p
    //                   class="muted"
    //                   style="
    //                     margin: 0;
    //                     text-align: center;
    //                     font-family:
    //                       -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    //                       Arial, 'Helvetica Neue', sans-serif;
    //                     font-size: 12px;
    //                     line-height: 1.7;
    //                     color: #6b7280;
    //                   "
    //                 >
    //                   Dúvidas? Responda este e-mail que nossa equipe vai te ajudar.
    //                 </p>
    //               </td>
    //             </tr>
    //             <!-- Rodapé -->
    //             <tr>
    //               <td align="center" style="background: #ffffff; padding: 22px">
    //                 <p
    //                   style="
    //                     margin: 0;
    //                     font-family:
    //                       -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    //                       Arial, 'Helvetica Neue', sans-serif;
    //                     font-size: 12px;
    //                     line-height: 1.6;
    //                     color: #6b7280;
    //                   "
    //                 >
    //                   © 2025 Marquei • Todos os direitos reservados
    //                 </p>
    //               </td>
    //             </tr>
    //           </table>
    //         </td>
    //       </tr>
    //     </table>
    //   </body>
    // </html>
    //  `,
    //     });
  }

  async execute(body: CreateMailTemplateDto) {
    try {
      const template = await this.prisma.mailTemplate.create({
        data: body,
      });

      if (!template) throw new Error('Erro ao criar template de email');

      this.logger.debug(`Template de email criado: ${template.id}`);
      return;
    } catch (error) {
      console.log(error);
    }
  }
}
