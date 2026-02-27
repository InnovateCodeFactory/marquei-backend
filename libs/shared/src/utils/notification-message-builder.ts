import { getTwoNames } from '.';

export const NotificationMessageBuilder = {
  buildAppointmentCreatedMessage: ({
    customer_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    customer_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    return {
      title: '🗓️ Novo agendamento',
      body: `${customer_name?.trim()} agendou ${service_name?.trim()} para ${dayAndMonth} às ${time}.`,
    };
  },

  buildAppointmentReminderMessageForProfessional: ({
    customer_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    customer_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    return {
      title: '⏰ Lembrete de agendamento',
      body: `Lembrete: ${customer_name?.trim()} tem um agendamento de ${service_name?.trim()} em ${dayAndMonth} às ${time}.`,
    };
  },

  buildAppointmentReminderMessageForCustomer: ({
    professional_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    professional_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    const lower = dayAndMonth?.toLowerCase?.() ?? '';
    const needsPreposition = lower !== 'hoje' && lower !== 'amanhã';
    const preposition = needsPreposition ? ' em ' : ' ';
    const professionalName = getTwoNames(professional_name);

    return {
      title: '⏰ Lembrete de agendamento',
      body: `Lembrete: você tem um agendamento de ${service_name?.trim()} com ${professionalName?.trim()}${preposition}${dayAndMonth} às ${time}.`,
    };
  },

  buildAppointmentCancelledMessageForProfessional: ({
    customer_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    customer_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    return {
      title: '❌ Agendamento cancelado',
      body: `O agendamento de ${service_name?.trim()} com ${customer_name?.trim()} em ${dayAndMonth} às ${time} foi cancelado.`,
    };
  },

  buildAppointmentCancelledMessageForCustomer: ({
    professional_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    professional_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    const professionalName = getTwoNames(professional_name);

    return {
      title: '❌ Agendamento cancelado',
      body: `Seu agendamento de ${service_name?.trim()} com ${professionalName?.trim()} em ${dayAndMonth} às ${time} foi cancelado.`,
    };
  },

  buildAppointmentCreatedMessageForCustomer: ({
    professional_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    professional_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    return {
      title: '🗓️ Novo agendamento',
      body: `Seu agendamento de ${service_name?.trim()} com ${professional_name?.trim()} foi criado para ${dayAndMonth} às ${time}.`,
    };
  },

  buildAppointmentConfirmedMessageForProfessional: ({
    customer_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    customer_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    return {
      title: '✅ Agendamento confirmado',
      body: `${customer_name?.trim()} confirmou ${service_name?.trim()} para ${dayAndMonth} às ${time}.`,
    };
  },

  buildAppointmentRescheduledMessageForCustomer: ({
    professional_name,
    dayAndMonth,
    time,
    service_name,
  }: {
    professional_name: string;
    dayAndMonth: string;
    time: string;
    service_name: string;
  }) => {
    return {
      title: '🔁 Agendamento atualizado',
      body: `Seu agendamento de ${service_name?.trim()} com ${professional_name?.trim()} foi remarcado para ${dayAndMonth} às ${time}.`,
    };
  },

  buildBusinessRatedWithCommentMessage: ({
    reviewer_name,
    business_name,
    rating,
    comment,
  }: {
    reviewer_name: string;
    business_name: string;
    rating: number;
    comment?: string | null;
  }) => {
    const starsLabel = rating === 1 ? 'estrela' : 'estrelas';
    const trimmedComment = comment?.trim();

    if (!trimmedComment) {
      return {
        title: '⭐ Nova avaliação',
        body: `${reviewer_name?.trim()} avaliou ${business_name?.trim()} com ${rating} ${starsLabel}.`,
      };
    }

    return {
      title: '⭐ Nova avaliação',
      body: `${reviewer_name?.trim()} avaliou ${business_name?.trim()} com ${rating} ${starsLabel}: "${trimmedComment}"`,
    };
  },
};
