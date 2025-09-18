/* eslint-disable no-console */
import { fakerPT_BR as faker } from '@faker-js/faker';
import { PrismaClient, UserType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

// ===================== Configs =====================
const TOTAL_CUSTOMERS = Number(process.env.SEED_CUSTOMERS ?? 500);
const PASSWORD_PLAIN = process.env.SEED_PASSWORD ?? 'marquei123';
const BCRYPT_ROUNDS = 8;

// Sufixo por execução p/ facilitar unicidade de emails/phones
const SEED_RUN_ID =
  process.env.SEED_RUN_ID ??
  crypto.randomBytes(2).toString('hex').toLowerCase(); // ex.: "c9ab"

// Offset estável por rodada para os telefones (evita colisões entre execuções)
const RUN_OFFSET =
  parseInt(
    crypto.createHash('md5').update(SEED_RUN_ID).digest('hex').slice(0, 6),
    16,
  ) % 90_000_000;

// Probabilidades
const CUSTOMER_WILL_RATE_PROB = 0.5; // 50% dos customers avaliam
const REVIEW_TEXT_PROB = 0.4; // 40% dos ratings terão comentário
const RATINGS_PER_RATER_MIN = 1; // cada rater avaliará 1–3 negócios
const RATINGS_PER_RATER_MAX = 3;

// ===================== Comentários (curtos) =====================
const REVIEW_TEXTS = [
  'Excelente atendimento!',
  'Muito bom, recomendo.',
  'Poderia melhorar o tempo de espera.',
  'Experiência incrível, voltarei com certeza.',
  'Preço justo pelo serviço entregue.',
  'Não gostei do atendimento.',
  'Profissional atencioso(a) e pontual.',
  'Lugar limpo e organizado.',
  'A qualidade foi acima do esperado!',
  'Demorou um pouco mais do que o combinado.',
  'Atendeu todas as minhas expectativas.',
  'Serviço mediano.',
  'Fui muito bem atendido(a).',
  'Voltarei em breve!',
  'Ótimo custo-benefício.',
];

// ===================== Helpers =====================
function sanitizeToken(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function uniqueEmailForSeed(name: string, index: number) {
  const parts = name.split(' ');
  const first = sanitizeToken(parts[0] || 'cliente');
  const last = sanitizeToken(parts[parts.length - 1] || 'novo');
  // domínio “fake” para seeds; troque se preferir
  return `${first}.${last}.${SEED_RUN_ID}.${index}@seed.example.com`;
}

// Telefone E.164 com offset por rodada (estável e com baixa colisão)
function seedPhone(index: number) {
  // +55 61 9 + 8 dígitos
  const seq = (RUN_OFFSET + index) % 90_000_000; // 0..89,999,999
  const eight = String(10_000_000 + seq).slice(-8); // garante 8 dígitos
  return `+55619${eight}`;
}

function randomScore(): 1 | 2 | 3 | 4 | 5 {
  // leve viés para notas 4–5
  const r = Math.random();
  if (r < 0.05) return 1;
  if (r < 0.15) return 2;
  if (r < 0.35) return 3;
  if (r < 0.7) return 4;
  return 5;
}

function maybeReviewText() {
  return Math.random() < REVIEW_TEXT_PROB
    ? faker.helpers.arrayElement(REVIEW_TEXTS)
    : null;
}

// ===================== Criação de Customer com retry =====================
// retry helper para emails/person uniques (P2002 em phone → troca de número; na última, sem phone)
async function createCustomerRetry(
  baseName: string,
  baseEmail: string,
  basePhone: string | null,
  passwordHash: string,
  maxAttempts = 6,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const email =
      attempt === 0
        ? baseEmail
        : baseEmail.replace(
            '@',
            `.${attempt}.${crypto.randomBytes(2).toString('hex')}@`,
          );

    // phone com retry — nas tentativas >0, troca o número; na última, remove
    let phone: string | undefined =
      basePhone && attempt === 0
        ? basePhone
        : basePhone
          ? seedPhone(
              // mistura o índice virtual da tentativa para garantir novo número
              faker.number.int({ min: 0, max: 90_000_000 }),
            )
          : undefined;

    for (let personAttempt = 0; personAttempt < 4; personAttempt++) {
      try {
        // Faz tudo em transação: cria Person (ou reaproveita se colidir) e User
        return await prisma.$transaction(async (tx) => {
          // tenta achar por email/phone (schema tem unique nesses campos)
          const existingByEmail = await tx.person.findUnique({
            where: { email },
            select: { id: true },
          });
          const existingByPhone =
            !existingByEmail && phone
              ? await tx.person.findUnique({
                  where: { phone },
                  select: { id: true },
                })
              : null;

          const personId =
            existingByEmail?.id ||
            existingByPhone?.id ||
            (
              await tx.person.create({
                data: {
                  name: baseName,
                  email,
                  ...(phone ? { phone } : {}),
                },
                select: { id: true },
              })
            ).id;

          // cria User CUSTOMER vinculado à Person
          const user = await tx.user.create({
            data: {
              name: baseName,
              email,
              password: passwordHash,
              user_type: UserType.CUSTOMER,
              person: { connect: { id: personId } },
            },
            select: { id: true, personId: true, email: true },
          });

          return user;
        });
      } catch (e: any) {
        const isP2002 =
          e instanceof PrismaClientKnownRequestError && e.code === 'P2002';
        const phoneCollision =
          isP2002 &&
          Array.isArray((e as any)?.meta?.target) &&
          (e as any).meta.target.includes('phone');

        if (phoneCollision) {
          if (personAttempt < 2) {
            // tenta outro número dentro da rodada
            phone = seedPhone(faker.number.int({ min: 0, max: 90_000_000 }));
            continue;
          }
          // última tentativa: cria sem phone
          phone = undefined;
          continue;
        }

        if (isP2002) {
          // colisão em outro unique (ex.: user email composto por user_type) → tenta outro email
          break; // sai do loop interno e volta ao loop externo para regenerar email
        }

        throw e; // erro não conhecido → repropaga
      }
    }
  }
  throw new Error('Falha ao criar CUSTOMER após várias tentativas (uniques).');
}

// ===================== Ratings =====================
// aplica a mesma lógica de atualização usada no seu RateBusinessUseCase
async function applyBusinessAggregateUpdate(
  score: number,
  businessSlug: string,
) {
  await prisma.$executeRawUnsafe(
    `
    UPDATE "Business"
    SET
      reviews_count    = reviews_count + 1,
      total_one_star   = total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END,
      total_two_star   = total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END,
      total_three_star = total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END,
      total_four_star  = total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END,
      total_five_star  = total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END,
      rating = (
        ((total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END) * 1) +
        ((total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END) * 2) +
        ((total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END) * 3) +
        ((total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END) * 4) +
        ((total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END) * 5)
      )::float / (reviews_count + 1)
    WHERE slug = $2
    `,
    score,
    businessSlug,
  );
}

// cria 1 rating para (userId, businessSlug) garantindo uq_business_user_rating
async function createSingleRatingForUser(userId: string, businessSlug: string) {
  const score = randomScore();
  const review = maybeReviewText();

  // garante unicidade por (business_slug, userId)
  const existing = await prisma.businessRating.findUnique({
    where: { uq_business_user_rating: { business_slug: businessSlug, userId } },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.$transaction(async (tx) => {
    await tx.businessRating.create({
      data: {
        business: { connect: { slug: businessSlug } },
        user: { connect: { id: userId } },
        rating: score,
        review,
      },
    });

    // atualiza agregados no mesmo fluxo
    await tx.$executeRawUnsafe(
      `
      UPDATE "Business"
      SET
        reviews_count    = reviews_count + 1,
        total_one_star   = total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END,
        total_two_star   = total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END,
        total_three_star = total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END,
        total_four_star  = total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END,
        total_five_star  = total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END,
        rating = (
          ((total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END) * 1) +
          ((total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END) * 2) +
          ((total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END) * 3) +
          ((total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END) * 4) +
          ((total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END) * 5)
        )::float / (reviews_count + 1)
      WHERE slug = $2
      `,
      score,
      businessSlug,
    );
  });

  return true;
}

// cria 1–3 ratings em negócios aleatórios para um usuário
async function createRatingsForUser(userId: string, businessSlugs: string[]) {
  const howMany = faker.number.int({
    min: RATINGS_PER_RATER_MIN,
    max: RATINGS_PER_RATER_MAX,
  });
  const chosen = faker.helpers.arrayElements(businessSlugs, howMany);

  for (const slug of chosen) {
    try {
      await createSingleRatingForUser(userId, slug);
    } catch (e: any) {
      // Se outro processo avaliou o mesmo par (muito improvável aqui), ignora e segue
      const isP2002 =
        e instanceof PrismaClientKnownRequestError && e.code === 'P2002';
      if (!isP2002) {
        console.warn(
          `  ! Falha ao avaliar ${slug} por user ${userId}:`,
          e?.message ?? e,
        );
      }
    }
  }
}

// ===================== Seed principal =====================
async function main() {
  console.time('seed-customers');

  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, BCRYPT_ROUNDS);

  // carrega todos os negócios (slugs) existentes
  const businesses = await prisma.business.findMany({
    select: { slug: true },
  });
  if (!businesses.length) {
    console.error(
      '❌ Não há businesses na base. Rode a seed de businesses primeiro.',
    );
    process.exit(1);
  }
  const businessSlugs = businesses.map((b) => b.slug);

  console.log(
    `→ Businesses disponíveis para avaliação: ${businessSlugs.length}`,
  );
  console.log(`→ Criando ${TOTAL_CUSTOMERS} customers — run ${SEED_RUN_ID}`);

  const BATCH = 50;

  let createdUsers = 0;
  let ratingsCount = 0;

  for (let start = 0; start < TOTAL_CUSTOMERS; start += BATCH) {
    const end = Math.min(start + BATCH, TOTAL_CUSTOMERS);
    const tasks: Promise<void>[] = [];

    for (let i = start; i < end; i++) {
      tasks.push(
        (async () => {
          const name = faker.person.fullName();
          const email = uniqueEmailForSeed(name, i);
          const phone = Math.random() < 0.8 ? seedPhone(i) : null; // 80% com phone

          // cria o customer (Person + User CUSTOMER) com retry
          const user = await createCustomerRetry(
            name,
            email,
            phone,
            passwordHash,
          );

          createdUsers++;

          // 50% dos customers avaliam entre 1 e 3 negócios
          if (Math.random() < CUSTOMER_WILL_RATE_PROB) {
            await createRatingsForUser(user.id, businessSlugs);
            // contagem aproximada (um ou mais ratings por rater)
            ratingsCount += 1;
          }
        })(),
      );
    }

    await Promise.all(tasks);
    console.log(`→ Criados: ${end}/${TOTAL_CUSTOMERS}`);
  }

  console.log(`✅ Customers criados: ${createdUsers}`);
  console.log(`ℹ️  ~Metade deles deixou ao menos 1 avaliação (estimativa).`);
  console.timeEnd('seed-customers');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seed (customers & ratings) finalizada.');
  })
  .catch(async (e) => {
    console.error('❌ Seed falhou:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
