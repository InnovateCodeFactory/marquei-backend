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
    return {
      title: '⏰ Lembrete de agendamento',
      body: `Lembrete: você tem um agendamento de ${service_name?.trim()} com ${professional_name?.trim()} em ${dayAndMonth} às ${time}.`,
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
    return {
      title: '❌ Agendamento cancelado',
      body: `Seu agendamento de ${service_name?.trim()} com ${professional_name?.trim()} em ${dayAndMonth} às ${time} foi cancelado.`,
    };
  },
};
