import { fakerPT_BR as faker } from '@faker-js/faker';
import {
  BusinessPublicType,
  Prisma,
  PrismaClient,
  UserType,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

// ===================== Configs =====================
const TOTAL_BUSINESSES = Number(process.env.SEED_BUSINESSES ?? 1300);
const PASSWORD_PLAIN = process.env.SEED_PASSWORD ?? 'marquei123';
const BCRYPT_ROUNDS = 8;

// Centro base: Riacho Fundo II
const BASE_LAT = -15.89463752849642;
const BASE_LON = -48.05370196434291;

// Raio ~30km (1° lat ~111km, 1° lon ~107km em Brasília)
const MAX_DELTA_LAT = 0.9;
const MAX_DELTA_LON = 0.93;

// Sufixo por execução para reduzir colisão entre rodadas
const SEED_RUN_ID =
  process.env.SEED_RUN_ID ??
  crypto.randomBytes(2).toString('hex').toLowerCase(); // ex: '108d'

// ====== IDs enviados (usar exatamente estes) ======
const CATEGORY_IDS = [
  { id: 'cmfbb1f2c0005yxjnr2gfl45k', name: 'Barbearia' },
  { id: 'cmfbb1f2c0006yxjnvkogszmz', name: 'Salão de Beleza' },
  { id: 'cmfbb1f2c0007yxjnpa0w9pcq', name: 'Estética' },
  { id: 'cmfbb1f2c0008yxjnr4hw6ja2', name: 'Fitness' },
  { id: 'cmfbb1f2c0009yxjnstd7n7js', name: 'Saúde & Bem-estar' },
  { id: 'cmfbb1f2c000ayxjnqd426o81', name: 'Outro' },
  { id: 'cmfbb1f2c000ayxjnqd426o8i', name: 'Esportes & Movimento' },
];

const SERVICE_TYPE_IDS = [
  { id: 'cmfbb1eza0000yxjnht8htkc8', name: 'Presencial' },
  { id: 'cmfbb1eza0001yxjnhae2r37g', name: 'Domiciliar' },
  { id: 'cmfbb1eza0002yxjnt6gpkkix', name: 'Online' },
  { id: 'cmfbb1eza0003yxjn1lvcdutv', name: 'Presencial e domiciliar' },
  { id: 'cmfbb1eza0004yxjnolejr6n4', name: 'Presencial e online' },
];

// 15–20 serviços por categoria
const SERVICES_BY_CATEGORY: Record<string, string[]> = {
  Barbearia: [
    'Corte Masculino',
    'Corte Máquina',
    'Corte Tesoura',
    'Corte Degradê',
    'Corte Infantil',
    'Barba',
    'Barba Desenhada',
    'Barboterapia',
    'Sobrancelha',
    'Navalha & Acabamento',
    'Camuflagem de Barba',
    'Pigmentação Capilar',
    'Hidratação Capilar',
    'Selagem',
    'Relaxamento',
    'Botox Capilar',
    'Platinado',
    'Luzes Masculinas',
    'Tratamento Anti-queda',
    'Limpeza de Pele Masculina',
  ],
  'Salão de Beleza': [
    'Corte Feminino',
    'Escova',
    'Escova Modelada',
    'Hidratação',
    'Reconstrução',
    'Nutrição Capilar',
    'Cronograma Capilar',
    'Coloração',
    'Tonalização',
    'Luzes',
    'Mechas',
    'Balayage',
    'Progressiva',
    'Botox Capilar',
    'Selagem',
    'Cauterização',
    'Finalização Cachos',
    'Penteado',
    'Maquiagem',
    'Design de Sobrancelhas',
  ],
  Estética: [
    'Limpeza de Pele',
    'Peeling Químico',
    'Peeling de Diamante',
    'Hidratação Facial',
    'Máscara de Argila',
    'Revitalização Facial',
    'Microagulhamento',
    'Radiofrequência Facial',
    'Drenagem Linfática',
    'Massagem Modeladora',
    'Ultrassom Estético',
    'Criolipólise',
    'BB Glow',
    'Lifting Facial',
    'Detox Facial',
    'Clareamento de Manchas',
    'Design de Sobrancelhas',
    'Depilação a Cera',
    'Depilação com Linha',
    'Depilação Laser',
  ],
  Fitness: [
    'Aula Funcional',
    'Personal Training',
    'Avaliação Física',
    'Alongamento',
    'HIIT',
    'Treino Resistido',
    'Treino de Mobilidade',
    'Circuito Funcional',
    'Treino de Core',
    'Treino de Força',
    'Treino para Emagrecimento',
    'Treino para Idosos',
    'Treino Pós-Lesão',
    'Treino de Potência',
    'Corrida Orientada',
    'Bike Indoor',
    'Cross Training',
    'Pilates Solo',
    'Funcional em Grupo',
    'Treino Outdoor',
  ],
  'Saúde & Bem-estar': [
    'Nutrição',
    'Psicoterapia',
    'Fisioterapia',
    'Quiropraxia',
    'Acupuntura',
    'Osteopatia',
    'Auriculoterapia',
    'RPG',
    'Ventosaterapia',
    'Massoterapia',
    'Liberação Miofascial',
    'Reflexologia',
    'Reiki',
    'Meditação Guiada',
    'Terapia Ocupacional',
    'Pilates Clínico',
    'Orientação Postural',
    'Saúde da Coluna',
    'Prevenção de Lesões',
    'Educação em Saúde',
  ],
  Outro: Array.from({ length: 20 }, (_, i) => `Serviço ${i + 1}`),
  'Esportes & Movimento': [
    'Pilates',
    'Yoga',
    'Dança',
    'Treino HIIT',
    'Zumba',
    'Ballet Fitness',
    'Funcional Outdoor',
    'Corrida de Rua',
    'Caminhada Orientada',
    'Treino de Agilidade',
    'Treino de Potência',
    'Calistenia',
    'Muay Thai',
    'Jiu-Jitsu',
    'Capoeira',
    'Natação (Aulas)',
    'Triathlon (Assessoria)',
    'Ciclismo (Assessoria)',
    'Treino de Flexibilidade',
    'Treino de Mobilidade',
  ],
};

// ===================== Helpers =====================
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randCoord(base: number, delta: number) {
  return base + (Math.random() * 2 - 1) * delta;
}
function randomCoordPair() {
  return {
    lat: randCoord(BASE_LAT, MAX_DELTA_LAT),
    lon: randCoord(BASE_LON, MAX_DELTA_LON),
  };
}

type OpeningHoursItem = {
  day:
    | 'SUNDAY'
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY';
  times: Array<{ startTime: string; endTime: string }>;
  closed: boolean;
};

function randomOpeningHours(): OpeningHoursItem[] {
  const days: OpeningHoursItem['day'][] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  return days.map((day) => {
    const closed =
      (day === 'SUNDAY' && Math.random() < 0.5) ||
      (day === 'SATURDAY' && Math.random() < 0.25 && Math.random() < 0.25);
    if (closed) return { day, closed: true, times: [] };

    const twoShifts = Math.random() < 0.8;
    const morningStart = faker.helpers.arrayElement(['08:00', '09:00']);
    const morningEnd = faker.helpers.arrayElement(['12:00', '13:00']);
    const afternoonStart = faker.helpers.arrayElement(['13:00', '14:00']);
    const afternoonEnd = faker.helpers.arrayElement([
      '18:00',
      '19:00',
      '20:00',
    ]);

    const times = twoShifts
      ? [
          { startTime: morningStart, endTime: morningEnd },
          { startTime: afternoonStart, endTime: afternoonEnd },
        ]
      : [{ startTime: '10:00', endTime: '18:00' }];

    return { day, closed: false, times };
  });
}

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function brazilPhoneE164(): string {
  // +55 + DDD de Brasília (61) + 9 + 8 dígitos
  const nine = '9';
  const rest = faker.string.numeric(8);
  return `+5561${nine}${rest}`;
}

function addressDF() {
  return {
    city: 'Brasília',
    uf: 'DF',
    neighbourhood: faker.location.city(),
    street: `Quadra ${faker.string.alphanumeric(2).toUpperCase()} ${faker.location.street()}`,
    number: faker.string.numeric({ length: { min: 1, max: 3 } }),
    complement:
      faker.helpers.maybe(() => `Sala ${faker.string.numeric(2)}`, {
        probability: 0.3,
      }) ?? '',
    zipCode: faker.location.zipCode('########'),
  };
}

// 15–20 serviços por negócio
async function createServicesForBusiness(
  businessId: string,
  categoryName: string,
) {
  const pool =
    SERVICES_BY_CATEGORY[categoryName] ??
    Array.from({ length: 20 }, (_, i) => `Serviço ${i + 1}`);

  const count = faker.number.int({
    min: 15,
    max: Math.min(20, pool.length),
  });
  const selected = faker.helpers.arrayElements(pool, count);

  for (const name of selected) {
    await prisma.service.create({
      data: {
        name,
        duration: faker.number.int({ min: 30, max: 180 }),
        price_in_cents: faker.number.int({ min: 3000, max: 30000 }),
        businessId,
      },
    });
  }
}

async function linkProfessionalToServices(
  professionalProfileId: string,
  businessId: string,
) {
  const services = await prisma.service.findMany({
    where: { businessId },
    select: { id: true },
  });
  if (!services.length) return;

  const pick = faker.helpers.arrayElements(
    services,
    faker.number.int({ min: 5, max: Math.max(8, services.length) }),
  );

  for (const s of pick) {
    await prisma.professionalService.create({
      data: {
        professional_profile_id: professionalProfileId,
        service_id: s.id,
        ...(Math.random() < 0.35 && {
          custom_price: faker.number.float({
            min: 30,
            max: 400,
            multipleOf: 0.5,
          }),
        }),
        order: faker.number.int({ min: 1, max: 20 }),
      },
    });
  }
}

// ===================== Slug & Owner Email com retry =====================
function randomSuffix(len = 6) {
  return crypto
    .randomBytes(len)
    .toString('base64')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, len)
    .toLowerCase();
}

function buildSlug(base: string, attempt: number) {
  // sufixa com run id
  const withRun = `${base}-${SEED_RUN_ID}`;
  return attempt === 0 ? withRun : `${withRun}-${randomSuffix(6)}`;
}

function sanitizeToken(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildOwnerEmail(ownerName: string, baseSlug: string, attempt: number) {
  const parts = ownerName.split(' ');
  const first = sanitizeToken(parts[0] || 'pro');
  const last = sanitizeToken(parts[parts.length - 1] || 'owner');
  const local = `${first}.${last}.${sanitizeToken(baseSlug)}.${SEED_RUN_ID}.${attempt}.${randomSuffix(
    3,
  )}`;
  // domínio de seed — você pode trocar para seu domínio se quiser
  return `${local}@seed.example.com`;
}

/**
 * Faz create do Business com owner (User.PROFESSIONAL) com retry em:
 * - slug (P2002 target ['slug'])
 * - email,user_type (P2002 target ['email','user_type'])
 *
 * Em cada tentativa muda o slug e o e-mail do owner.
 */
async function createBusinessWithOwnerRetry(
  baseSlug: string,
  ownerName: string,
  buildBaseData: (ownerEmail: string) => Omit<
    Prisma.BusinessCreateInput,
    'slug' | 'owner'
  > & {
    owner: { create: Omit<Prisma.UserCreateInput, 'businesses'> };
  },
  maxAttempts = 10,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = buildSlug(baseSlug, attempt);
    const ownerEmail = buildOwnerEmail(ownerName, baseSlug, attempt);

    try {
      return await prisma.business.create({
        data: { ...buildBaseData(ownerEmail), slug },
        select: { id: true, ownerId: true, owner: { select: { id: true } } },
      });
    } catch (e: any) {
      const isKnown =
        e instanceof PrismaClientKnownRequestError && e.code === 'P2002';
      const target = isKnown ? (e as any).meta?.target : undefined;

      const slugCollision =
        isKnown &&
        (Array.isArray(target) ? target.includes('slug') : target === 'slug');

      const emailUserTypeCollision =
        isKnown &&
        Array.isArray(target) &&
        target.length === 2 &&
        target.includes('email') &&
        target.includes('user_type');

      if (slugCollision || emailUserTypeCollision) {
        // tenta novamente com novos valores
        continue;
      }
      throw e; // outro erro → repropaga
    }
  }
  throw new Error(
    'Falha ao criar Business após várias tentativas (slug/email).',
  );
}

// ===================== Seed principal =====================
async function main() {
  console.time('seed-total');

  const hashed = await bcrypt.hash(PASSWORD_PLAIN, BCRYPT_ROUNDS);

  console.log(
    `→ Criando ${TOTAL_BUSINESSES} negócios em Brasília (IDs fornecidos) — run ${SEED_RUN_ID}`,
  );

  // concorrência moderada para reduzir colisões
  const BATCH = 15;

  for (let start = 0; start < TOTAL_BUSINESSES; start += BATCH) {
    const end = Math.min(start + BATCH, TOTAL_BUSINESSES);
    const tasks: Promise<void>[] = [];

    for (let i = start; i < end; i++) {
      tasks.push(
        (async () => {
          // Sorteia categoria e tipo (por ID)
          const category = pickRandom(CATEGORY_IDS);
          const serviceType = pickRandom(SERVICE_TYPE_IDS);

          const bizName = faker.company.name();
          const baseSlug = slugify(bizName);

          const { lat, lon } = randomCoordPair();
          const openingHours = randomOpeningHours();
          const publicType = pickRandom([
            BusinessPublicType.BOTH,
            BusinessPublicType.MALE,
            BusinessPublicType.FEMALE,
          ]);

          const addr = addressDF();
          const phone =
            faker.helpers.maybe(() => brazilPhoneE164(), {
              probability: 0.5,
            }) ?? null;

          const ownerName = faker.person.fullName();

          // 1) Cria business + owner com retry (sem rating/totais no create!)
          const created = await createBusinessWithOwnerRetry(
            baseSlug,
            ownerName,
            (ownerEmail) => ({
              name: bizName,
              description: faker.company.catchPhrase(),
              latitude: lat,
              longitude: lon,
              opening_hours: openingHours as any,
              public_type: publicType,
              phone,
              website:
                faker.helpers.maybe(() => `https://www.${baseSlug}.com.br`, {
                  probability: 0.25,
                }) ?? null,
              instagram:
                faker.helpers.maybe(() => `https://instagram.com/${baseSlug}`, {
                  probability: 0.35,
                }) ?? null,
              email:
                faker.helpers.maybe(() => ownerEmail, { probability: 0.2 }) ??
                null,

              // endereço
              zipCode: addr.zipCode,
              city: addr.city,
              street: addr.street,
              number: addr.number,
              complement: addr.complement,
              neighbourhood: addr.neighbourhood,
              uf: addr.uf,

              // NÃO enviar rating/totais agora — ficam nos defaults do schema!

              // relacionamentos por ID
              BusinessCategory: { connect: { id: category.id } },
              BusinessServiceType: { connect: { id: serviceType.id } },

              owner: {
                create: {
                  email: ownerEmail,
                  name: ownerName,
                  password: hashed,
                  user_type: UserType.PROFESSIONAL,
                  document_number: faker.helpers.maybe(
                    () => faker.string.numeric(11),
                    { probability: 0.6 },
                  ),
                  push_token: null,
                },
              },
            }),
          );

          const businessId = created.id;
          const ownerId = created.ownerId;

          // 3) ProfessionalProfile para o owner
          const prof = await prisma.professionalProfile.create({
            data: {
              business: { connect: { id: businessId } },
              User: { connect: { id: ownerId } },
              phone: brazilPhoneE164(),
              bio: faker.person.bio(),
              status: 'ACTIVE',
            },
            select: { id: true },
          });

          // 4) CurrentSelectedBusiness
          await prisma.currentSelectedBusiness.create({
            data: {
              user: { connect: { id: ownerId } },
              business: { connect: { id: businessId } },
            },
          });

          // 5) Serviços coerentes com a categoria e vínculo na pivot
          await createServicesForBusiness(businessId, category.name);
          await linkProfessionalToServices(prof.id, businessId);
        })(),
      );
    }

    await Promise.all(tasks);
    await sleep(80);
    console.log(`→ Criados: ${end}/${TOTAL_BUSINESSES}`);
  }

  console.timeEnd('seed-total');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seed finalizado com sucesso.');
  })
  .catch(async (e) => {
    console.error('❌ Seed falhou:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
