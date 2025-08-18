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
      title: 'Agendamento recebido 🗓️',
      body: `${customer_name} agendou ${service_name} para ${dayAndMonth} às ${time}.`,
    };
  },
};
