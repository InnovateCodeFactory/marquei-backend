import { WaitlistHoldService } from '@app/shared/services';
import { GetAvailableTimesForServiceAndProfessionalUseCase } from './get-available-times-for-service-and-professional.use-case';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
// 12:00 UTC == 09:00 America/Sao_Paulo (UTC-3, sem horario de verao)
const utc = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00.000Z`);

function build({
  day,
  closedDay = false,
  appointments = [] as any[],
  holds = [] as any[],
  times = [{ startTime: '09:00', endTime: '11:00' }],
}: {
  day: string;
  closedDay?: boolean;
  appointments?: any[];
  holds?: any[];
  times?: { startTime: string; endTime: string }[];
}) {
  const weekday = DAYS[new Date(`${day}T12:00:00Z`).getUTCDay()];
  const opening_hours = DAYS.map((d) => ({
    day: d,
    closed: closedDay && d === weekday,
    times,
  }));
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', opening_hours }) },
    professionalProfile: { findFirst: jest.fn().mockResolvedValue({ id: 'pro1' }) },
    service: { findFirst: jest.fn().mockResolvedValue({ id: 's1', duration: 60 }) },
    serviceCombo: { findFirst: jest.fn() },
    professionalService: { count: jest.fn().mockResolvedValue(1) },
    professionalServiceCombo: { count: jest.fn() },
    appointment: { findMany: jest.fn().mockResolvedValue(appointments) },
    professionalTimesBlock: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const holdService = { listHolds: jest.fn().mockResolvedValue(holds) } as unknown as WaitlistHoldService;
  return new GetAvailableTimesForServiceAndProfessionalUseCase(prisma, holdService);
}

const run = (uc: GetAvailableTimesForServiceAndProfessionalUseCase, day: string) =>
  uc.execute({ business_slug: 'studio', professional_id: 'pro1', service_id: 's1', day });

const FUTURE = '2031-03-03';

describe('disponibilidade: status CLOSED | FULL | AVAILABLE', () => {
  it('AVAILABLE quando ha horario livre', async () => {
    const res = await run(build({ day: FUTURE }), FUTURE);
    expect(res.status).toBe('AVAILABLE');
    expect(res.availableSlots).toEqual(['09:00', '10:00']);
  });

  it('CLOSED quando o negocio nao abre naquele dia (nunca vira fila)', async () => {
    const res = await run(build({ day: FUTURE, closedDay: true }), FUTURE);
    expect(res).toMatchObject({ status: 'CLOSED', availableSlots: [] });
  });

  it('CLOSED quando nao ha janelas de atendimento configuradas', async () => {
    const res = await run(build({ day: FUTURE, times: [] }), FUTURE);
    expect(res.status).toBe('CLOSED');
  });

  it('FULL quando o dia abre mas todos os horarios estao ocupados', async () => {
    const appointments = [
      {
        start_at_utc: utc(FUTURE, '12:00'),
        end_at_utc: utc(FUTURE, '14:00'),
        duration_minutes: 120,
        service: { duration: 120 },
      },
    ];
    const res = await run(build({ day: FUTURE, appointments }), FUTURE);
    expect(res).toMatchObject({ status: 'FULL', availableSlots: [] });
  });

  it('oferta ativa da lista de espera segura o horario (dia vira FULL)', async () => {
    const holds = [{ slot_start_at_utc: utc(FUTURE, '12:00'), slot_end_at_utc: utc(FUTURE, '14:00') }];
    const res = await run(build({ day: FUTURE, holds }), FUTURE);
    expect(res).toMatchObject({ status: 'FULL', availableSlots: [] });
  });

  it('oferta segurando so um horario deixa o outro livre', async () => {
    const holds = [{ slot_start_at_utc: utc(FUTURE, '12:00'), slot_end_at_utc: utc(FUTURE, '13:00') }];
    const res = await run(build({ day: FUTURE, holds }), FUTURE);
    expect(res).toMatchObject({ status: 'AVAILABLE', availableSlots: ['10:00'] });
  });

  it('dia que ja passou e sem vaga nunca vira FULL (sem fila)', async () => {
    const past = '2020-03-03';
    const appointments = [
      {
        start_at_utc: utc(past, '12:00'),
        end_at_utc: utc(past, '14:00'),
        duration_minutes: 120,
        service: { duration: 120 },
      },
    ];
    const res = await run(build({ day: past, appointments }), past);
    expect(res.status).toBe('CLOSED');
  });
});
