-- AlterTable
ALTER TABLE "BusinessReminderSettings" ALTER COLUMN "channels" SET DEFAULT ARRAY['PUSH', 'WHATSAPP']::"ReminderChannel"[];
